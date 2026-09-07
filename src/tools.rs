//! Small, bounded tool surface. Bash has the user's host authority, not a sandbox.
use anyhow::{bail, Context, Result};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
};

pub fn definitions() -> Value {
    json!([
        {"type":"function","function":{"name":"read","description":"Read a UTF-8 file inside the workspace (maximum 65536 bytes).","parameters":{"type":"object","properties":{"path":{"type":"string"}},"required":["path"],"additionalProperties":false}}},
        {"type":"function","function":{"name":"write","description":"Create or replace a UTF-8 file inside the workspace (maximum 1 MiB); create parent directories.","parameters":{"type":"object","properties":{"path":{"type":"string"},"content":{"type":"string"}},"required":["path","content"],"additionalProperties":false}}},
        {"type":"function","function":{"name":"bash","description":"Execute bash in the workspace with host user authority. Default timeout 30 seconds, maximum 300. Output is bounded; background processes are terminated when the shell exits.","parameters":{"type":"object","properties":{"command":{"type":"string"},"timeout":{"type":"integer","minimum":1,"maximum":300}},"required":["command"],"additionalProperties":false}}}
    ])
}

pub fn execute(workspace: &Path, name: &str, arguments: &str) -> Result<String> {
    match name {
        "read" => crate::read_tool(workspace, arguments),
        "write" => write_tool(workspace, arguments),
        "bash" => bash_tool(workspace, arguments),
        _ => bail!("unknown tool: {name}"),
    }
}

fn write_tool(workspace: &Path, arguments: &str) -> Result<String> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Args {
        path: String,
        content: String,
    }
    let a: Args = serde_json::from_str(arguments)?;
    if a.content.len() > 1_048_576 {
        bail!("write exceeds 1 MiB limit");
    }
    let root = workspace.canonicalize()?;
    let requested = Path::new(&a.path);
    let relative = if requested.is_absolute() {
        requested
            .strip_prefix(&root)
            .context("path escapes workspace")?
    } else {
        requested
    };
    // Reject lexical traversal even if it might resolve back into the workspace.
    let mut target = root.clone();
    for component in relative.components() {
        match component {
            Component::Normal(part) => target.push(part),
            Component::CurDir => (),
            _ => bail!("path escapes workspace"),
        }
        if fs::symlink_metadata(&target).is_ok() && !target.canonicalize()?.starts_with(&root) {
            bail!("path escapes workspace");
        }
    }
    if target == root {
        bail!("write requires a file path");
    }
    if let Ok(meta) = fs::symlink_metadata(&target) {
        if !meta.is_file() {
            bail!("write requires a regular file, not a symlink or directory");
        }
    }
    let parent = target.parent().context("missing parent")?;
    fs::create_dir_all(parent)?;
    if !parent.canonicalize()?.starts_with(&root) {
        bail!("path escapes workspace");
    }
    // Confinement assumes no concurrent hostile filesystem mutation.
    let mut temp: Option<(PathBuf, fs::File)> = None;
    for counter in 0..100 {
        let p = parent.join(format!(".pi-rs-write-{}-{counter}", std::process::id()));
        match fs::OpenOptions::new().write(true).create_new(true).open(&p) {
            Ok(f) => {
                temp = Some((p, f));
                break;
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e.into()),
        }
    }
    let (temp_path, mut file) = temp.context("cannot allocate write temporary file")?;
    let result = (|| -> Result<()> {
        if let Ok(meta) = fs::metadata(&target) {
            file.set_permissions(meta.permissions())?;
        }
        file.write_all(a.content.as_bytes())?;
        file.sync_all()?;
        fs::rename(&temp_path, &target)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp_path);
    }
    result?;
    Ok(format!("Successfully wrote to {}", a.path))
}

#[cfg(unix)]
fn bash_tool(workspace: &Path, arguments: &str) -> Result<String> {
    use std::{
        io::Read,
        os::{fd::AsRawFd, unix::process::CommandExt},
        process::{Command, Stdio},
        time::{Duration, Instant},
    };
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Args {
        command: String,
        timeout: Option<u64>,
    }
    let a: Args = serde_json::from_str(arguments)?;
    let seconds = a.timeout.unwrap_or(30);
    if !(1..=300).contains(&seconds) {
        bail!("timeout must be 1..300 seconds");
    }
    let mut child = Command::new("bash")
        .args(["-c", &a.command])
        .current_dir(workspace)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .process_group(0)
        .spawn()?;
    struct Cleanup(u32);
    impl Drop for Cleanup {
        fn drop(&mut self) {
            unsafe {
                libc::kill(-(self.0 as i32), libc::SIGKILL);
            }
        }
    }
    let guard = Cleanup(child.id());
    let mut out = child.stdout.take().context("missing stdout")?;
    let mut err = child.stderr.take().context("missing stderr")?;
    for fd in [out.as_raw_fd(), err.as_raw_fd()] {
        let flags = unsafe { libc::fcntl(fd, libc::F_GETFL) };
        if flags < 0 || unsafe { libc::fcntl(fd, libc::F_SETFL, flags | libc::O_NONBLOCK) } < 0 {
            bail!("cannot configure nonblocking tool output");
        }
    }
    fn drain(r: &mut impl Read, capture: &mut Vec<u8>, truncated: &mut bool) -> Result<()> {
        let mut buf = [0; 8192];
        // Bound each pass so an infinite output stream cannot starve timeout checks.
        for _ in 0..16 {
            match r.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let keep = n.min(32768 - capture.len());
                    capture.extend_from_slice(&buf[..keep]);
                    *truncated |= keep < n;
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => break,
                Err(e) if e.kind() == std::io::ErrorKind::Interrupted => continue,
                Err(e) => return Err(e.into()),
            }
        }
        Ok(())
    }
    let mut stdout = vec![];
    let mut stderr = vec![];
    let mut truncated = false;
    let deadline = Instant::now() + Duration::from_secs(seconds);
    let (status, timed_out) = loop {
        drain(&mut out, &mut stdout, &mut truncated)?;
        drain(&mut err, &mut stderr, &mut truncated)?;
        if let Some(status) = child.try_wait()? {
            break (status, false);
        }
        if Instant::now() >= deadline {
            unsafe {
                libc::kill(-(child.id() as i32), libc::SIGKILL);
            }
            break (child.wait()?, true);
        }
        std::thread::sleep(Duration::from_millis(10));
    };
    drop(guard); // Terminate ordinary background descendants before dropping their pipes.
    drain(&mut out, &mut stdout, &mut truncated)?;
    drain(&mut err, &mut stderr, &mut truncated)?;
    let output = format!(
        "stdout:\n{}\nstderr:\n{}{}",
        String::from_utf8_lossy(&stdout),
        String::from_utf8_lossy(&stderr),
        if truncated {
            "\n[output truncated: maximum 32768 bytes per stream]"
        } else {
            ""
        }
    );
    if timed_out {
        bail!("bash timed out after {seconds}s ({status})\n{output}");
    }
    if !status.success() {
        bail!("bash failed ({status})\n{output}");
    }
    Ok(output)
}

#[cfg(not(unix))]
fn bash_tool(_: &Path, _: &str) -> Result<String> {
    bail!("bash currently requires Unix process groups");
}
