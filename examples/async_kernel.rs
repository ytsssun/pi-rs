//! Experimental Rust completion/update barrier. Not a complete agent runtime.
use anyhow::{bail, Context, Result};
use serde_json::{json, Value};
use std::collections::BTreeSet;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::time::Duration;
fn emit(v: Value) -> Result<()> {
    let mut out = std::io::stdout().lock();
    writeln!(out, "{v}")?;
    out.flush()?;
    Ok(())
}
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().collect();
    let path = args.get(2).context("socket required")?;
    if args[1] == "rpc" {
        let mut stream = UnixStream::connect(path)?;
        stream.set_read_timeout(Some(Duration::from_secs(2)))?;
        stream.set_write_timeout(Some(Duration::from_secs(2)))?;
        writeln!(stream, "{}", args.get(3).context("request required")?)?;
        let mut line = String::new();
        if BufReader::new(stream).read_line(&mut line)? == 0 {
            bail!("disconnected");
        }
        print!("{line}");
        return Ok(());
    }
    if args[1] != "serve" {
        bail!("unknown mode");
    }
    let listener = UnixListener::bind(path)?;
    let mut started = false;
    let mut finished = false;
    let mut settled: Option<Value> = None;
    let mut updates = BTreeSet::new();
    let mut sequence: u64 = 0;
    let mut sink_failed = false;
    emit(json!({"type":"ready"}))?;
    for stream in listener.incoming() {
        let mut stream = stream?;
        stream.set_read_timeout(Some(Duration::from_secs(2)))?;
        let mut line = String::new();
        BufReader::new(stream.try_clone()?).read_line(&mut line)?;
        let req: Value = serde_json::from_str(&line)?;
        let mut event = None;
        let reply = match req["op"].as_str().unwrap_or("") {
            "start" if !started => {
                started = true;
                event = Some(json!({"type":"execute"}));
                json!({"result":null})
            }
            "update" if started && !finished && settled.is_none() => {
                sequence = sequence.checked_add(1).context("sequence exhausted")?;
                updates.insert(sequence);
                json!({"result":sequence})
            }
            "update" => json!({"result":null}),
            "settle" if started && !finished && settled.is_none() => {
                settled = Some(req["outcome"].clone());
                json!({"result":null})
            }
            "reject" if req["id"].as_u64().is_some_and(|id| updates.remove(&id)) => {
                sink_failed = true;
                json!({"result":null})
            }
            "ack" if req["id"].as_u64().is_some_and(|id| updates.remove(&id)) => {
                json!({"result":null})
            }
            _ => json!({"error":"invalid transition"}),
        };
        if !finished && settled.is_some() && (updates.is_empty() || sink_failed) {
            finished = true;
            event = Some(json!({"type":"done","outcome":settled}));
        }
        writeln!(stream, "{reply}")?;
        stream.flush()?;
        if let Some(event) = event {
            emit(event)?;
        }
    }
    Ok(())
}
