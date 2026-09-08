//! Bounded semantic probe: Rust dispatches JS tools and services nested synchronous RPC.
//! Not a production transport or agent loop. Unix-only, one connection at a time.
use anyhow::{bail, Context, Result};
use serde_json::{json, Value};
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::{UnixListener, UnixStream};
use std::time::Duration;

fn emit(value: Value) -> Result<()> {
    let mut out = std::io::stdout().lock();
    writeln!(out, "{value}")?;
    out.flush()?;
    Ok(())
}
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().collect();
    let path = args.get(2).context("mode and socket required")?;
    if args[1] == "rpc" {
        let mut stream = UnixStream::connect(path)?;
        stream.set_read_timeout(Some(Duration::from_secs(2)))?;
        stream.set_write_timeout(Some(Duration::from_secs(2)))?;
        writeln!(stream, "{}", args.get(3).context("request required")?)?;
        let mut line = String::new();
        if BufReader::new(stream).read_line(&mut line)? == 0 {
            bail!("kernel disconnected");
        }
        print!("{line}");
        return Ok(());
    }
    if args[1] != "serve" {
        bail!("unknown mode");
    }
    let listener = UnixListener::bind(path)?;
    let mut active: Vec<String> = vec![];
    let mut pending: Option<String> = None;
    let mut results: Vec<Value> = vec![];
    let mut generation: u64 = 0;
    emit(json!({"type":"ready","pid":std::process::id()}))?;
    for connection in listener.incoming() {
        let mut stream = connection?;
        stream.set_read_timeout(Some(Duration::from_secs(2)))?;
        let mut line = String::new();
        BufReader::new(stream.try_clone()?).read_line(&mut line)?;
        let request: Value = serde_json::from_str(&line)?;
        let mut event = None;
        let reply = match request["op"].as_str().unwrap_or("") {
            "get_tools" => json!({"result":active}),
            "set_tools" => {
                active = serde_json::from_value(request["names"].clone())?;
                json!({"result":null})
            }
            "start" if pending.is_none() => {
                if !active.iter().any(|n| n == "tool_search") {
                    bail!("search inactive");
                }
                results.clear();
                generation = generation
                    .checked_add(1)
                    .context("invocation id exhausted")?;
                let id = format!("search-{generation}");
                pending = Some(id.clone());
                event = Some(
                    json!({"type":"execute","id":id,"name":"tool_search","args":{"query":"calc"}}),
                );
                json!({"result":null})
            }
            "complete" if pending.as_deref() == request["id"].as_str() && pending.is_some() => {
                let id = pending.take().unwrap();
                if !request["error"].is_null() {
                    event = Some(json!({"type":"failed","error":request["error"],"active":active}));
                } else {
                    results.push(request["result"].clone());
                    if id.starts_with("search-") {
                        if !active.iter().any(|n| n == "Calculator") {
                            bail!("nested activation not visible");
                        }
                        let id = format!("calculate-{generation}");
                        pending = Some(id.clone());
                        event = Some(
                            json!({"type":"execute","id":id,"name":"Calculator","args":{"expr":"100 + 500"}}),
                        );
                    } else {
                        event = Some(json!({"type":"done","results":results,"active":active}));
                    }
                }
                json!({"result":null})
            }
            "snapshot" => json!({"result":{"active":active,"pending":pending}}),
            _ => json!({"error":"invalid operation or callback id"}),
        };
        writeln!(stream, "{reply}")?;
        stream.flush()?;
        drop(stream);
        if let Some(event) = event {
            emit(event)?;
        }
    }
    Ok(())
}
