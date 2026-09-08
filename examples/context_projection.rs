//! Architecture probe only: native projection through the existing Session API.
use anyhow::Result;
use pi_rs::Session;
use serde_json::{json, Value};
use std::io::{self, Read};
fn main() -> Result<()> {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;
    let case: Value = serde_json::from_str(&input)?;
    let mut session = Session::new(&std::env::current_dir()?, "probe")?;
    session.messages = serde_json::from_value(case["messages"].clone())?;
    let limit = case["limit"].as_u64().map(|n| n as usize);
    let before = serde_json::to_value(&session.messages)?;
    let projected = session.context(limit);
    println!(
        "{}",
        json!({"projected": projected, "canonical_preserved": before == serde_json::to_value(&session.messages)?})
    );
    Ok(())
}
