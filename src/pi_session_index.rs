//! Read-only index for pinned Pi v3 session trees. Not the CLI native session format.
//! Unknown entry fields are retained. Migration, file repair and writes are separate.
use anyhow::{bail, Context, Result};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

pub struct PiSessionIndex {
    entries: Vec<Value>,
    by_id: HashMap<String, usize>,
}
impl PiSessionIndex {
    pub fn parse(content: &str) -> Result<Self> {
        // Matches the upstream line parser's malformed-line skipping, not its
        // file-opening repair/migration side effects.
        let mut parsed = content
            .lines()
            .filter_map(|line| serde_json::from_str::<Value>(line).ok());
        let header = parsed.next().context("missing Pi session header")?;
        if header["type"] != "session" || !header["id"].is_string() {
            bail!("invalid Pi session header");
        }
        if header["version"] != 3 {
            bail!("only Pi session version 3 is implemented; migration required");
        }
        let entries: Vec<Value> = parsed.filter(|e| e["type"] != "session").collect();
        let mut by_id = HashMap::new();
        for (i, entry) in entries.iter().enumerate() {
            let id = entry["id"]
                .as_str()
                .context("entry without string id is not supported")?;
            by_id.insert(id.to_owned(), i);
        }
        Ok(Self { entries, by_id })
    }
    fn path(&self, leaf: Option<&Value>, fallback: bool) -> Result<Vec<Value>> {
        if leaf.is_some_and(Value::is_null) {
            return Ok(vec![]);
        }
        let mut current = match leaf {
            Some(value) => {
                let id = value.as_str().context("leaf must be a string or null")?;
                let found = if id.is_empty() {
                    None
                } else {
                    self.by_id.get(id).copied()
                };
                if fallback && found.is_none() {
                    self.entries.len().checked_sub(1)
                } else {
                    found
                }
            }
            None if fallback => self.entries.len().checked_sub(1),
            None => self
                .entries
                .last()
                .and_then(|entry| entry["id"].as_str())
                .filter(|id| !id.is_empty())
                .and_then(|id| self.by_id.get(id))
                .copied(),
        };
        let mut path = vec![];
        let mut visited = HashSet::new();
        while let Some(index) = current {
            if !visited.insert(index) {
                bail!("cyclic Pi session ancestry unsupported");
            }
            let entry = &self.entries[index];
            path.push(entry.clone());
            current = entry["parentId"]
                .as_str()
                .filter(|id| !id.is_empty())
                .and_then(|id| self.by_id.get(id))
                .copied();
        }
        path.reverse();
        Ok(path)
    }
    pub fn snapshot(&self, leaf: Option<&Value>) -> Result<Value> {
        let branch = self.path(leaf, false)?;
        let path = self.path(leaf, true)?;
        let mut thinking = json!("off");
        let mut model = Value::Null;
        for entry in &path {
            match entry["type"].as_str() {
                Some("thinking_level_change") => thinking = entry["thinkingLevel"].clone(),
                Some("model_change") => {
                    model = json!({});
                    for key in ["provider", "modelId"] {
                        if let Some(value) = entry.get(key) {
                            model[key] = value.clone();
                        }
                    }
                }
                Some("message") if entry["message"]["role"] == "assistant" => {
                    model = json!({});
                    for (source, target) in [("provider", "provider"), ("model", "modelId")] {
                        if let Some(value) = entry["message"].get(source) {
                            model[target] = value.clone();
                        }
                    }
                }
                _ => {}
            }
        }
        let context = if let Some(compaction) = path
            .iter()
            .rev()
            .find(|entry| entry["type"] == "compaction")
        {
            // Upstream finds the first matching ID, even for a duplicate in path.
            let position = path
                .iter()
                .position(|entry| entry["id"] == compaction["id"])
                .unwrap();
            let mut selected = vec![compaction.clone()];
            let mut keep = false;
            for entry in &path[..position] {
                if entry["id"] == compaction["firstKeptEntryId"] {
                    keep = true;
                }
                if keep {
                    selected.push(entry.clone());
                }
            }
            selected.extend_from_slice(&path[position + 1..]);
            selected
        } else {
            path
        };
        Ok(
            json!({"entries":self.entries,"branch":branch,"contextEntries":context,"thinkingLevel":thinking,"model":model}),
        )
    }
}
