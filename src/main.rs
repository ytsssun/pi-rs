use anyhow::{bail, Context, Result};
use pi_rs::{run, Session};
use serde_json::{json, Value};
use std::{env, fs, path::Path, time::Duration};
fn main() -> Result<()> {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() || args.iter().any(|a| a == "--help") {
        println!("pi-rs (--input TEXT | --resume) --session FILE [--workspace DIR] (--fixture FILE | --model NAME) [--max-rounds N] [--context-tool-chars N]\nReal calls use OPENAI_API_KEY and optional OPENAI_BASE_URL (default https://api.openai.com/v1). Sole tool: bounded UTF-8 workspace read. Resume preserves completed sessions; it does not add a new user turn.");
        return Ok(());
    }
    let mut options = std::collections::HashMap::new();
    let mut resume = false;
    let mut i = 0;
    while i < args.len() {
        if args[i] == "--resume" {
            if resume {
                bail!("duplicate resume");
            }
            resume = true;
            i += 1;
            continue;
        }
        let key = args[i].as_str();
        if ![
            "--input",
            "--session",
            "--workspace",
            "--fixture",
            "--model",
            "--max-rounds",
            "--context-tool-chars",
        ]
        .contains(&key)
        {
            bail!("unknown argument {key}");
        }
        let value = args.get(i + 1).context("missing argument value")?.clone();
        if options.insert(key.to_owned(), value).is_some() {
            bail!("duplicate option {key}");
        }
        i += 2;
    }
    let path = Path::new(options.get("--session").context("--session required")?);
    if resume == options.contains_key("--input") {
        bail!("provide exactly one of --input or --resume");
    }
    if options.contains_key("--fixture") == options.contains_key("--model") {
        bail!("provide exactly one of --fixture or --model");
    }
    let rounds: usize = options
        .get("--max-rounds")
        .map(String::as_str)
        .unwrap_or("8")
        .parse()?;
    if !(1..=100).contains(&rounds) {
        bail!("rounds must be 1..100");
    }
    let trim = options
        .get("--context-tool-chars")
        .map(|s| s.parse::<usize>())
        .transpose()?;
    // One owner per session, including across processes. A crash leaves a lock to inspect.
    let lock_path = path.with_extension("lock");
    let _lock = fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&lock_path)
        .context("session locked; after a crash, verify no process owns it before removing lock")?;
    struct Guard(std::path::PathBuf);
    impl Drop for Guard {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.0);
        }
    }
    let _guard = Guard(lock_path);
    let mut session = if resume {
        Session::load(path)?
    } else {
        if path.exists() {
            bail!("session exists; use --resume or another path");
        }
        let s = Session::new(
            Path::new(
                options
                    .get("--workspace")
                    .map(String::as_str)
                    .unwrap_or("."),
            ),
            &options["--input"],
        )?;
        s.save(path)?;
        s
    };
    let fixture: Option<Vec<Value>> = options
        .get("--fixture")
        .map(|p| -> Result<_> { Ok(serde_json::from_slice(&fs::read(p)?)?) })
        .transpose()?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .redirect(reqwest::redirect::Policy::none())
        .build()?;
    let answer = run(&mut session, path, rounds, trim, |messages, cursor| {
        if let Some(f) = &fixture {
            return f.get(cursor).cloned().context("fixture exhausted");
        }
        let key = env::var("OPENAI_API_KEY").context("OPENAI_API_KEY missing")?;
        let base =
            env::var("OPENAI_BASE_URL").unwrap_or_else(|_| "https://api.openai.com/v1".into());
        let response: Value = client.post(format!("{}/chat/completions", base.trim_end_matches('/'))).bearer_auth(key).json(&json!({
            "model":options["--model"],"messages":messages,"tools":[{"type":"function","function":{"name":"read","description":"Read a UTF-8 file inside workspace, maximum 65536 bytes","parameters":{"type":"object","properties":{"path":{"type":"string"}},"required":["path"],"additionalProperties":false}}}]
        })).send()?.error_for_status()?.json()?;
        if !matches!(
            response["choices"][0]["finish_reason"].as_str(),
            Some("stop" | "tool_calls")
        ) {
            bail!("model response incomplete or unsupported finish_reason; no tools executed");
        }
        let mut message = response["choices"][0]
            .get("message")
            .cloned()
            .context("missing assistant message")?;
        if let Some(usage) = response.get("usage") {
            message
                .as_object_mut()
                .context("assistant must be object")?
                .insert("_provider_usage".into(), usage.clone());
        }
        Ok(message)
    })?;
    println!("{answer}");
    Ok(())
}
