//! Minimal JSONL client for the unchanged Pi TypeScript extension host.
use anyhow::{Context, Result, bail};
use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

pub struct ExtensionSidecar { child: Child, input: ChildStdin, output: BufReader<ChildStdout>, next_id: u64 }
impl ExtensionSidecar {
    pub fn spawn(script: &str) -> Result<Self> {
        let mut child = Command::new("node").args(["--experimental-strip-types", script])
            .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().context("spawn extension sidecar")?;
        let input = child.stdin.take().context("sidecar stdin")?;
        let output = BufReader::new(child.stdout.take().context("sidecar stdout")?);
        Ok(Self { child, input, output, next_id: 1 })
    }
    pub fn request(&mut self, method: &str, params: Value) -> Result<Value> {
        let id = self.next_id; self.next_id += 1;
        writeln!(self.input, "{}", json!({"id":id,"method":method,"params":params})).context("write sidecar request")?;
        self.input.flush().context("flush sidecar request")?;
        let mut line = String::new();
        if self.output.read_line(&mut line).context("read sidecar response")? == 0 { bail!("sidecar exited before response"); }
        let response: Value = serde_json::from_str(&line).context("parse sidecar response")?;
        if !response["error"].is_null() { bail!("sidecar error: {}", response["error"]); }
        Ok(response["result"].clone())
    }
}
impl Drop for ExtensionSidecar { fn drop(&mut self) { let _ = self.child.kill(); } }
