use anyhow::{bail, Context, Result};
use pi_rs::{appended_path, run_with_options, Session};
use serde_json::{json, Value};
use std::{env, fs, path::Path, time::Duration};
fn main() -> Result<()> {
    let args: Vec<String> = env::args().skip(1).collect();
    if args.is_empty() || args.iter().any(|a| a == "--help") {
        println!("pi-rs (--input TEXT | --resume) --session FILE [--workspace DIR] (--fixture FILE | --model NAME) [--max-rounds N] [--context-tool-chars N]\nReal calls use OPENAI_API_KEY and optional OPENAI_BASE_URL (default https://api.openai.com/v1). Default tool: bounded UTF-8 workspace read; write, edit and bash require --allow-mutations. Resume with --input TEXT appends a turn only after completion. --allow-mutations enables write/edit/bash for this invocation. --resolve-in-flight TEXT records an inspected uncertain outcome without replay. Fixtures use the full-session assistant message index, including previous turns. Context-tool-chars persists.");
        return Ok(());
    }
    let mut options = std::collections::HashMap::new();
    let mut resume = false;
    let mut allow_mutations = false;
    let mut i = 0;
    while i < args.len() {
        if args[i] == "--allow-mutations" {
            allow_mutations = true;
            i += 1;
            continue;
        }
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
            "--resolve-in-flight",
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
    if !resume && !options.contains_key("--input") {
        bail!("provide --input or --resume");
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
    if options.contains_key("--resolve-in-flight") && (!resume || options.contains_key("--input")) {
        bail!("--resolve-in-flight requires --resume without --input");
    }
    // Keep the lock inode permanently. flock ownership ends when this process dies.
    let lock_path = appended_path(path, ".lock");
    let _lock = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&lock_path)
        .context("cannot open session lock; create its parent directory first")?;
    #[cfg(unix)]
    {
        use std::os::fd::AsRawFd;
        if unsafe { libc::flock(_lock.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) } != 0 {
            bail!("session locked by another process");
        }
    }
    #[cfg(not(unix))]
    {
        bail!("session process locking currently requires Unix");
    }
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
    if resume {
        if let Some(workspace) = options.get("--workspace") {
            if Path::new(workspace).canonicalize()? != session.workspace {
                bail!("--workspace does not match the saved session workspace");
            }
        }
    }
    if let Some(outcome) = options.get("--resolve-in-flight") {
        session.resolve_in_flight(outcome)?;
        session.save(path)?;
    }
    if resume {
        if let Some(input) = options.get("--input") {
            session.append_user(input)?;
            session.save(path)?;
        }
    }
    let mut definitions = pi_rs::tools::definitions();
    if !allow_mutations {
        definitions
            .as_array_mut()
            .unwrap()
            .retain(|t| t["function"]["name"] == "read");
    }
    let fixture: Option<Vec<Value>> = options
        .get("--fixture")
        .map(|p| -> Result<_> { Ok(serde_json::from_slice(&fs::read(p)?)?) })
        .transpose()?;
    let client = reqwest::blocking::Client::builder()
        .timeout(Duration::from_secs(120))
        .redirect(reqwest::redirect::Policy::none())
        .build()?;
    let answer = run_with_options(
        &mut session,
        path,
        rounds,
        trim,
        allow_mutations,
        |messages, cursor| {
            if let Some(f) = &fixture {
                return f.get(cursor).cloned().context("fixture exhausted");
            }
            let key = env::var("OPENAI_API_KEY").context("OPENAI_API_KEY missing")?;
            let base =
                env::var("OPENAI_BASE_URL").unwrap_or_else(|_| "https://api.openai.com/v1".into());
            let response: Value = client
                .post(format!("{}/chat/completions", base.trim_end_matches('/')))
                .bearer_auth(key)
                .json(&json!({
                    "model":options["--model"],"messages":messages,"tools":definitions
                }))
                .send()?
                .error_for_status()?
                .json()?;
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
        },
    )?;
    println!("{answer}");
    Ok(())
}
