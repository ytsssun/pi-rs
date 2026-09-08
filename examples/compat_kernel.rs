//! Disposable architecture kernel. Synchronous file-backed process RPC is a probe,
//! not the proposed production transport, tool registry or Pi session format.
use anyhow::{bail, Context, Result};
use pi_rs::Session;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    fs,
    io::{self, Read, Write},
    path::Path,
};

#[derive(Serialize, Deserialize)]
struct State {
    active_tools: Vec<String>,
    session: Session,
}

fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().collect();
    let path = Path::new(args.get(1).context("state file required")?);
    let mut input = String::new();
    io::stdin().read_to_string(&mut input)?;
    let request: Value = serde_json::from_str(&input)?;
    let op = request["op"].as_str().context("op required")?;
    let mut state = if op == "init" {
        if path.exists() {
            bail!("state exists");
        }
        State {
            active_tools: vec![],
            session: Session::new(&std::env::current_dir()?, "compatibility probe")?,
        }
    } else {
        let state: State = serde_json::from_slice(&fs::read(path)?)?;
        state.session.validate()?;
        state
    };
    let (result, changed) = match op {
        "init" => (json!(null), true),
        "get_tools" => (json!(state.active_tools), false),
        "set_tools" => {
            state.active_tools = serde_json::from_value(request["names"].clone())?;
            (json!(null), true)
        }
        "seed_context" => {
            state.session.messages = serde_json::from_value(request["messages"].clone())?;
            state.session.validate()?;
            (json!(null), true)
        }
        "set_policy" => {
            let limit: Option<usize> = serde_json::from_value(request["limit"].clone())?;
            let changed = state.session.set_context_policy(limit)?;
            (json!(null), changed)
        }
        "context" => {
            // A plugin chain projects its current view, not the persisted canonical
            // messages. This temporary override is never saved.
            if let Some(messages) = request.get("messages") {
                state.session.messages = serde_json::from_value(messages.clone())?;
            }
            (
                json!(state.session.context(state.session.context_tool_chars)),
                false,
            )
        }
        "snapshot" => (serde_json::to_value(&state)?, false),
        _ => bail!("unknown operation"),
    };
    if changed {
        // Parent host serializes calls. No multi-writer/crash-recovery claim here.
        let temp = path.with_extension(format!("tmp-{}", std::process::id()));
        let mut file = fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temp)?;
        file.write_all(&serde_json::to_vec_pretty(&state)?)?;
        file.sync_all()?;
        fs::rename(&temp, path)?;
    }
    println!("{}", json!({"result": result, "pid": std::process::id()}));
    Ok(())
}
