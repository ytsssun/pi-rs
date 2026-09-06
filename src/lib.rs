use anyhow::{bail, Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
};

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Session {
    pub version: u32,
    pub workspace: PathBuf,
    pub messages: Vec<Value>,
    #[serde(default)]
    pub usage: Vec<Value>,
}
impl Session {
    pub fn new(workspace: &Path, input: &str) -> Result<Self> {
        Ok(Self {
            version: 1,
            usage: vec![],
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
        let mut pending = Vec::<String>::new();
        for (i, m) in self.messages.iter().enumerate() {
            match m["role"].as_str() {
                Some("user") if i == 0 && m["content"].is_string() => {}
                Some("assistant") if i > 0 && pending.is_empty() => {
                    validate_assistant(m)?;
                    if let Some(calls) = m["tool_calls"].as_array() {
                        for c in calls {
                            pending.push(c["id"].as_str().unwrap().to_owned());
                        }
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
            if i + 1 < self.messages.len()
                && m["role"] == "assistant"
                && m.get("tool_calls")
                    .and_then(Value::as_array)
                    .is_none_or(|a| a.is_empty())
            {
                bail!("messages after final response");
            }
        }
        Ok(())
    }
    pub fn save(&self, path: &Path) -> Result<()> {
        self.validate()?;
        let tmp = path.with_extension("tmp");
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
    mut model: F,
) -> Result<String>
where
    F: FnMut(&[Value], usize) -> Result<Value>,
{
    s.validate()?;
    let mut rounds = 0;
    loop {
        // Persisted tool calls are replayable because the sole tool is read-only.
        if let Some(index) = s.messages.iter().rposition(|m| m["role"] == "assistant") {
            let message = s.messages[index].clone();
            if let Some(calls) = message["tool_calls"].as_array() {
                let done = s.messages.len() - index - 1;
                for call in calls.iter().skip(done) {
                    let result = if call["function"]["name"] == "read" {
                        read_tool(
                            &s.workspace,
                            call["function"]["arguments"].as_str().unwrap(),
                        )
                    } else {
                        Err(anyhow::anyhow!("unknown tool"))
                    };
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
        let mut response = model(&s.context(trim), cursor)?;
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
