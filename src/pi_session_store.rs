//! Pi v3 append/branch prototype. Clock/IDs injected by caller; no multiwriter support.
use crate::pi_session_index::PiSessionIndex;
use anyhow::{bail, Result};
use serde_json::Value;
use std::{
    fs::{self, OpenOptions},
    io::Write,
    path::{Path, PathBuf},
};
pub struct PiSessionStore {
    path: PathBuf,
    content: String,
    leaf: Value,
    flushed: bool,
}
impl PiSessionStore {
    pub fn create(path: &Path, header: Value) -> Result<Self> {
        if path.exists() {
            bail!("new session path exists");
        }
        let content = format!("{}\n", header);
        PiSessionIndex::parse(&content)?;
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        Ok(Self {
            path: path.to_owned(),
            content,
            leaf: Value::Null,
            flushed: false,
        })
    }
    pub fn open(path: &Path) -> Result<Self> {
        let mut content = fs::read_to_string(path)?;
        let snapshot = PiSessionIndex::parse(&content)?.snapshot(None)?;
        // Pinned loader appends a newline after a nonempty final physical line.
        if !content.ends_with('\n') {
            OpenOptions::new()
                .append(true)
                .open(path)?
                .write_all(b"\n")?;
            content.push('\n');
        }
        let leaf = snapshot["entries"]
            .as_array()
            .and_then(|entries| entries.last())
            .map(|entry| entry["id"].clone())
            .unwrap_or(Value::Null);
        Ok(Self {
            path: path.to_owned(),
            content,
            leaf,
            flushed: true,
        })
    }
    pub fn snapshot(&self) -> Result<Value> {
        PiSessionIndex::parse(&self.content)?.snapshot(Some(&self.leaf))
    }
    pub fn branch(&mut self, leaf: Value) -> Result<()> {
        if !leaf.is_null() {
            let snapshot = self.snapshot()?;
            if !snapshot["entries"]
                .as_array()
                .unwrap()
                .iter()
                .any(|entry| entry["id"] == leaf)
            {
                bail!("branch entry not found");
            }
        }
        self.leaf = leaf;
        Ok(())
    }
    pub fn append(&mut self, mut entry: Value) -> Result<Value> {
        let id = entry["id"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("entry id required"))?
            .to_owned();
        if !entry["timestamp"].is_string()
            || !entry["type"].is_string()
            || entry["type"] == "session"
        {
            bail!("invalid append entry");
        }
        let snapshot = self.snapshot()?;
        if snapshot["entries"]
            .as_array()
            .unwrap()
            .iter()
            .any(|e| e["id"] == id)
        {
            bail!("duplicate append id");
        }
        entry["parentId"] = self.leaf.clone();
        let line = format!("{}\n", entry);
        let candidate = format!("{}{}", self.content, line);
        let next = PiSessionIndex::parse(&candidate)?.snapshot(None)?;
        let has_assistant = next["entries"]
            .as_array()
            .unwrap()
            .iter()
            .any(|e| e["type"] == "message" && e["message"]["role"] == "assistant");
        // Pinned upstream advances memory before attempting persistence. A failed
        // write therefore remains visible in this session instance.
        self.content = candidate;
        self.leaf = Value::String(id.clone());
        let needs_initial_flush = has_assistant || (entry["type"] == "custom" && entry["customType"] == "pi-rs.in-flight.v1");
        if self.flushed {
            OpenOptions::new()
                .append(true)
                .open(&self.path)?
                .write_all(line.as_bytes())?;
        } else if needs_initial_flush {
            let mut file = OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&self.path)?;
            file.write_all(self.content.as_bytes())?;
            self.flushed = true;
        }
        Ok(Value::String(id))
    }
}
