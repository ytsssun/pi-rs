//! Public CLI launcher for the Rust runtime and unchanged Pi JavaScript host.
use anyhow::{bail, Context, Result};
use std::{env, ffi::OsString, path::Path, process::Command};

fn select_runtime(mut args: Vec<OsString>) -> (bool, Vec<OsString>) {
    let upstream = args.first().is_some_and(|arg| arg == "--experimental-upstream-core");
    if upstream { args.remove(0); }
    (upstream, args)
}


fn main() -> Result<()> {
    // This is deliberately a source-checkout installation, not a standalone binary.
    // Absolute assets let callers run in their own repository without changing cwd.
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let (upstream, args) = select_runtime(env::args_os().skip(1).collect());
    let entry = if upstream { root.join("bin/pi-rs-upstream.mjs") } else { root.join("bin/pi-rs.mjs") };
    let loader = root.join("vendor/pi-mono/node_modules/tsx/dist/loader.mjs");
    for asset in [&entry, &loader] {
        if !asset.is_file() {
            bail!(
                "pi-rs requires its source checkout assets; missing {}. In {}, run sh scripts/bootstrap-upstream.sh and python3 scripts/build-native-session.py. This binary is not a standalone distribution.",
                asset.display(), root.display()
            );
        }
    }
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

#[cfg(test)]
mod tests {
    use super::select_runtime;
    use std::ffi::OsString;
    #[test]
    fn runtime_selector_never_consumes_prompt_or_option_values() {
        for input in [vec!["--", "--experimental-upstream-core"],vec!["--input", "--experimental-upstream-core"]] {
            let args: Vec<OsString> = input.into_iter().map(OsString::from).collect();
            assert_eq!(select_runtime(args.clone()), (false,args));
        }
        let (upstream,args) = select_runtime(["--experimental-upstream-core","--","--experimental-upstream-core"].into_iter().map(OsString::from).collect());
        assert!(upstream);
        assert_eq!(args, vec![OsString::from("--"),OsString::from("--experimental-upstream-core")]);
    }
}
