use anyhow::Result;
use pi_rs::pi_session_index::PiSessionIndex;
use serde_json::Value;
use std::io::{self, Read};
fn main() -> Result<()> {
    let mut content = String::new();
    io::stdin().read_to_string(&mut content)?;
    let request: Value = serde_json::from_str(&content)?;
    let index = PiSessionIndex::parse(
        request["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("content string required"))?,
    )?;
    println!("{}", index.snapshot(request.get("leaf"))?);
    Ok(())
}
