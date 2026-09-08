//! Bounded local test transport; not the selected production native binding.
use anyhow::{bail, Context, Result};
use pi_rs::pi_session_store::PiSessionStore;
use serde_json::{json, Value};
use std::{
    io::{BufRead, BufReader, Write},
    os::unix::net::{UnixListener, UnixStream},
    path::Path,
    time::Duration,
};
fn main() -> Result<()> {
    let args: Vec<_> = std::env::args().collect();
    let socket = args.get(2).context("socket required")?;
    if args[1] == "rpc" {
        let mut stream = UnixStream::connect(socket)?;
        stream.set_read_timeout(Some(Duration::from_secs(3)))?;
        stream.set_write_timeout(Some(Duration::from_secs(3)))?;
        writeln!(stream, "{}", args.get(3).context("request required")?)?;
        let mut line = String::new();
        if BufReader::new(stream).read_line(&mut line)? == 0 {
            bail!("disconnected");
        }
        print!("{line}");
        return Ok(());
    }
    let listener = UnixListener::bind(socket)?;
    println!("ready");
    std::io::stdout().flush()?;
    let mut store: Option<PiSessionStore> = None;
    for stream in listener.incoming() {
        let mut stream = stream?;
        stream.set_read_timeout(Some(Duration::from_secs(3)))?;
        let mut line = String::new();
        BufReader::new(stream.try_clone()?).read_line(&mut line)?;
        let response = (|| -> Result<Value> {
            let request: Value = serde_json::from_str(&line)?;
            match request["op"].as_str().unwrap_or("") {
                "create" | "open" => {
                    if store.is_some() {
                        bail!("already initialized");
                    }
                    let path = Path::new(request["path"].as_str().context("path required")?);
                    store = Some(if request["op"] == "create" {
                        PiSessionStore::create(path, request["header"].clone())?
                    } else {
                        PiSessionStore::open(path)?
                    });
                    Ok(Value::Null)
                }
                "append" => store
                    .as_mut()
                    .context("not initialized")?
                    .append(request["entry"].clone()),
                "branch" => {
                    store
                        .as_mut()
                        .context("not initialized")?
                        .branch(request["leaf"].clone())?;
                    Ok(Value::Null)
                }
                "snapshot" => store.as_ref().context("not initialized")?.snapshot(),
                _ => bail!("unknown operation"),
            }
        })();
        let response = match response {
            Ok(value) => json!({"result":value}),
            Err(error) => json!({"error":error.to_string()}),
        };
        writeln!(stream, "{response}")?;
    }
    Ok(())
}
