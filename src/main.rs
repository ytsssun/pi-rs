//! Public CLI launcher for the Rust runtime and unchanged Pi JavaScript host.
use anyhow::{bail, Context, Result};
use std::{env, path::Path, process::Command};

fn main() -> Result<()> {
    // This is deliberately a source-checkout installation, not a standalone binary.
    // Absolute assets let callers run in their own repository without changing cwd.
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let entry = root.join("bin/pi-rs.mjs");
    let loader = root.join("vendor/pi-mono/node_modules/tsx/dist/loader.mjs");
    for asset in [&entry, &loader] {
        if !asset.is_file() {
            bail!(
                "pi-rs requires its source checkout assets; missing {}. In {}, run sh scripts/bootstrap-upstream.sh and python3 scripts/build-native-session.py. This binary is not a standalone distribution.",
                asset.display(), root.display()
            );
        }
    }
    let args: Vec<_> = env::args_os().skip(1).collect();
    let mut command = Command::new("node");
    command.arg("--import").arg(loader).arg(entry);
    if args.is_empty() {
        command.arg("--help");
    } else {
        command.args(args);
    }
    // Replace the launcher so the host receives signals and its exit status is exact.
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        Err(command.exec())
            .context("could not launch Node.js; install Node.js and make node available on PATH")
    }
    #[cfg(not(unix))]
    {
        let status = command
            .status()
            .context("could not launch Node.js; install Node.js and make node available on PATH")?;
        std::process::exit(status.code().unwrap_or(1));
    }
}
