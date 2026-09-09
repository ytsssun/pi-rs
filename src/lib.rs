pub mod pi_runtime;
pub mod pi_session_store;
pub mod pi_session_index;
pub mod edit;
pub mod read;
pub mod tools;
pub mod provider;
pub mod stream_queue;
use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

/// A native context-view policy change, anchored to canonical history length.
/// This is a logical append-only audit within the snapshot, not a tamper-proof log.
#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ContextPolicyChange {
    pub after_messages: usize,
    pub previous_tool_chars: Option<usize>,
    pub tool_chars: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Session {
    pub version: u32,
    pub workspace: PathBuf,
    pub messages: Vec<Value>,
    #[serde(default)]
    pub usage: Vec<Value>,
    #[serde(default)]
    pub context_tool_chars: Option<usize>,
    #[serde(default)]
    pub in_flight: Option<String>,
    #[serde(default)]
    pub context_policy_changes: Vec<ContextPolicyChange>,
}
impl Session {
    pub fn new(workspace: &Path, input: &str) -> Result<Self> {
        Ok(Self {
            version: 1,
            usage: vec![],
            context_tool_chars: None,
            in_flight: None,
            context_policy_changes: vec![],
            workspace: workspace.canonicalize()?,
            messages: vec![json!({"role":"user","content":input})],
        })
    }
    pub fn load(path: &Path) -> Result<Self> {
        let s: Self = serde_json::from_slice(&fs::read(path)?)?;
        s.validate()?;
        Ok(s)
    }
    pub fn validate(&self) -> Result<()> {
        if self.version != 1 || !self.workspace.is_absolute() || self.messages.is_empty() {
            bail!("invalid session header");
        }
        let mut last_change: Option<&ContextPolicyChange> = None;
        for change in &self.context_policy_changes {
            if change.after_messages == 0
                || change.after_messages > self.messages.len()
                || change.previous_tool_chars == change.tool_chars
            {
                bail!("invalid context policy audit entry");
            }
            if let Some(last) = last_change {
                if change.after_messages < last.after_messages
                    || change.previous_tool_chars != last.tool_chars
                {
                    bail!("inconsistent context policy audit chain");
                }
            }
            last_change = Some(change);
        }
        if last_change.is_some_and(|last| last.tool_chars != self.context_tool_chars) {
            bail!("context policy does not match audit history");
        }
        let mut pending = Vec::<String>::new();
        let mut expects_user = true;
        for (i, m) in self.messages.iter().enumerate() {
            match m["role"].as_str() {
                Some("user") if expects_user && pending.is_empty() && m["content"].is_string() => {
                    expects_user = false;
                }
                Some("assistant") if i > 0 && !expects_user && pending.is_empty() => {
                    validate_assistant(m)?;
                    if let Some(calls) = m["tool_calls"].as_array() {
                        for c in calls {
                            pending.push(c["id"].as_str().unwrap().to_owned());
                        }
                    } else {
                        expects_user = true;
                    }
                }
                Some("tool")
                    if !pending.is_empty()
                        && m["content"].is_string()
                        && pending.first().map(String::as_str) == m["tool_call_id"].as_str() =>
                {
                    pending.remove(0);
                }
                _ => bail!("invalid message sequence at {i}"),
            }
        }
        if let Some(id) = &self.in_flight {
            if pending.first() != Some(id) {
                bail!("in-flight marker does not match next pending tool");
            }
            let assistant = self
                .messages
                .iter()
                .rfind(|m| m["role"] == "assistant")
                .context("missing in-flight assistant")?;
            let call = assistant["tool_calls"]
                .as_array()
                .unwrap()
                .iter()
                .find(|c| c["id"] == *id)
                .context("missing in-flight call")?;
            if !matches!(
                call["function"]["name"].as_str(),
                Some("write" | "bash" | "edit")
            ) {
                bail!("in-flight marker must reference a mutation");
            }
        }
        Ok(())
    }
    pub fn save(&self, path: &Path) -> Result<()> {
        self.validate()?;
        let tmp = appended_path(path, ".tmp");
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&tmp)
            .context("temporary session exists; inspect/remove it before retrying")?;
        file.write_all(&serde_json::to_vec_pretty(self)?)?;
        file.sync_all()?;
        fs::rename(&tmp, path)?;
        fs::File::open(
            path.parent()
                .filter(|p| !p.as_os_str().is_empty())
                .unwrap_or(Path::new(".")),
        )?
        .sync_all()?;
        Ok(())
    }
    pub fn set_context_policy(&mut self, limit: Option<usize>) -> Result<bool> {
        self.validate()?;
        if self.in_flight.is_some() {
            bail!("cannot change context policy while a tool outcome is uncertain");
        }
        if self.context_tool_chars == limit {
            return Ok(false);
        }
        self.context_policy_changes.push(ContextPolicyChange {
            after_messages: self.messages.len(),
            previous_tool_chars: self.context_tool_chars,
            tool_chars: limit,
        });
        self.context_tool_chars = limit;
        Ok(true)
    }
    pub fn append_user(&mut self, input: &str) -> Result<()> {
        self.validate()?;
        let last = self.messages.last().unwrap();
        if self.in_flight.is_some()
            || last["role"] != "assistant"
            || last.get("tool_calls").is_some()
        {
            bail!("follow-up requires a completed turn; resume pending work first");
        }
        self.messages.push(json!({"role":"user","content":input}));
        Ok(())
    }
    pub fn resolve_in_flight(&mut self, outcome: &str) -> Result<()> {
        self.validate()?;
        if outcome.trim().is_empty() {
            bail!("provide the inspected outcome, not an empty resolution");
        }
        let id = self
            .in_flight
            .take()
            .context("no in-flight tool to resolve")?;
        self.messages.push(json!({"role":"tool","tool_call_id":id,"content":format!("Operator resolved uncertain tool outcome: {outcome}")}));
        self.validate()
    }
    pub fn context(&self, tool_chars: Option<usize>) -> Vec<Value> {
        let mut messages = self.messages.clone();
        if let Some(limit) = tool_chars {
            for m in &mut messages {
                if m["role"] == "tool" {
                    let text = m["content"].as_str().unwrap_or("");
                    if text.chars().count() > limit {
                        m["content"] = json!(format!(
                            "{}\n[context view truncated; canonical result retained]",
                            text.chars().take(limit).collect::<String>()
                        ));
                    }
                }
            }
        }
        messages
    }
}
pub fn validate_assistant(m: &Value) -> Result<()> {
    if m["role"] != "assistant" {
        bail!("model response must have assistant role");
    }
    if let Some(calls) = m.get("tool_calls") {
        let calls = calls.as_array().context("tool_calls must be array")?;
        if calls.is_empty() || calls.len() > 16 {
            bail!("expected 1..16 tool calls");
        }
        let mut ids = std::collections::HashSet::new();
        for c in calls {
            let id = c["id"]
                .as_str()
                .filter(|s| !s.is_empty())
                .context("missing call id")?;
            if !ids.insert(id)
                || c["type"] != "function"
                || !c["function"]["name"].is_string()
                || !c["function"]["arguments"].is_string()
            {
                bail!("malformed tool call");
            }
        }
    } else if !m["content"].is_string() {
        bail!("missing final content");
    }
    Ok(())
}
/// Raw bounded loader retained for edit and legacy library callers.
/// The model-facing paginated tool is `read::execute`; never edit its rendered output.
pub fn read_tool(workspace: &Path, arguments: &str) -> Result<String> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Args {
        path: String,
    }
    let args: Args = serde_json::from_str(arguments)?;
    let path = workspace.join(args.path).canonicalize()?;
    let root = workspace.canonicalize()?;
    if !path.starts_with(root) {
        bail!("path escapes workspace");
    }
    if !fs::metadata(&path)?.is_file() {
        bail!("read requires a regular file");
    }
    let mut open = fs::OpenOptions::new();
    open.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        open.custom_flags(libc::O_NONBLOCK | libc::O_NOFOLLOW);
    }
    let file = open.open(&path)?;
    if !file.metadata()?.is_file() {
        bail!("read requires a regular file");
    }
    use std::io::Read;
    let mut bytes = vec![];
    file.take(65537).read_to_end(&mut bytes)?;
    if bytes.len() > 65536 {
        bail!("file exceeds 65536-byte read limit");
    }
    String::from_utf8(bytes).context("file is not UTF-8")
}
pub fn run<F>(
    s: &mut Session,
    path: &Path,
    max_rounds: usize,
    trim: Option<usize>,
    model: F,
) -> Result<String>
where
    F: FnMut(&[Value], usize) -> Result<Value>,
{
    run_with_options(s, path, max_rounds, trim, false, model)
}

pub fn appended_path(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.as_os_str().to_owned();
    name.push(suffix);
    PathBuf::from(name)
}

pub fn run_with_options<F>(
    s: &mut Session,
    path: &Path,
    max_rounds: usize,
    trim: Option<usize>,
    allow_mutations: bool,
    mut model: F,
) -> Result<String>
where
    F: FnMut(&[Value], usize) -> Result<Value>,
{
    s.validate()?;
    if let Some(id) = &s.in_flight {
        bail!("tool {id} has an uncertain outcome; inspect workspace and any surviving processes, then resume with --resolve-in-flight TEXT to record the observed outcome; it will not be replayed");
    }
    if let Some(limit) = trim {
        if s.set_context_policy(Some(limit))? {
            s.save(path)?;
        }
    }
    let mut rounds = 0;
    loop {
        // Only read-only calls can be automatically replayed after interruption.
        if let Some(index) = s
            .messages
            .iter()
            .rposition(|m| m["role"] == "assistant")
            .filter(|i| s.messages[*i + 1..].iter().all(|m| m["role"] == "tool"))
        {
            let message = s.messages[index].clone();
            if let Some(calls) = message["tool_calls"].as_array() {
                let done = s.messages.len() - index - 1;
                for call in calls.iter().skip(done) {
                    let name = call["function"]["name"].as_str().unwrap();
                    let mutation = matches!(name, "write" | "bash" | "edit");
                    if mutation && allow_mutations {
                        s.in_flight = Some(call["id"].as_str().unwrap().to_owned());
                        s.save(path)?;
                    }
                    let result = if mutation && !allow_mutations {
                        Err(anyhow::anyhow!(
                            "tool {name} requires --allow-mutations for this invocation"
                        ))
                    } else {
                        tools::execute(
                            &s.workspace,
                            name,
                            call["function"]["arguments"].as_str().unwrap(),
                        )
                    };
                    s.in_flight = None;
                    let content = match result {
                        Ok(s) => s,
                        Err(e) => format!("ERROR: {e:#}"),
                    };
                    s.messages
                        .push(json!({"role":"tool","tool_call_id":call["id"],"content":content}));
                    s.save(path)?;
                }
            } else {
                return Ok(message["content"].as_str().unwrap().to_owned());
            }
        }
        if rounds >= max_rounds {
            bail!("round limit reached; session saved, resume explicitly");
        }
        let cursor = s
            .messages
            .iter()
            .filter(|m| m["role"] == "assistant")
            .count();
        let mut response = model(&s.context(s.context_tool_chars), cursor)?;
        validate_assistant(&response)?;
        if let Some(usage) = response
            .as_object_mut()
            .and_then(|m| m.remove("_provider_usage"))
        {
            s.usage.push(usage);
        }
        s.messages.push(response);
        s.save(path)?;
        rounds += 1;
    }
}

pub mod sidecar;

/// Conservative model-view size estimate used for bounded compaction experiments.
/// This is deliberately an upper bound (four UTF-8 bytes per token), not a provider tokenizer.
pub fn estimate_context_tokens(value: &Value) -> usize {
    value.to_string().len().saturating_add(3) / 4
}

#[cfg(test)]
mod context_size_tests {
    use super::*;
    #[test]
    fn estimate_is_conservative_and_deterministic() {
        let v = json!({"role":"tool","content":"abcdefgh"});
        assert_eq!(estimate_context_tokens(&v), v.to_string().len().div_ceil(4));
        assert!(estimate_context_tokens(&json!("🙂🙂🙂🙂")) >= 1);
    }
}

/// Returns whether a projected context exceeds an explicit conservative limit.
pub fn context_exceeds_limit(value: &Value, limit_tokens: usize) -> bool {
    estimate_context_tokens(value) > limit_tokens
}
