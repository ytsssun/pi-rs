//! Text pagination adapted from pinned Pi read.ts; see root NOTICE.
//! https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/tools/read.ts
use anyhow::{bail, Context, Result};
use serde::Deserialize;
use serde_json::json;
use std::{fs, io::Read, path::Path};

const MAX_SOURCE: u64 = 8 * 1024 * 1024;

// Keep simple paths unchanged for Pi text parity; quote all shell syntax and
// prefix relative dash paths so the suggested sed command cannot parse options.
fn shell_path(path: &str) -> String {
    let path = if path.starts_with('-') {
        format!("./{path}")
    } else {
        path.to_owned()
    };
    if !path.is_empty()
        && path
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"/_-.".contains(&c))
    {
        path
    } else {
        format!("'{}'", path.replace('\'', "'\\''"))
    }
}
fn format_size(bytes: usize) -> String {
    if bytes < 1024 {
        return format!("{bytes}B");
    }
    let (unit, suffix) = if bytes < 1024 * 1024 {
        (1024, "KB")
    } else {
        (1024 * 1024, "MB")
    };
    let tenths = (bytes * 10 + unit / 2) / unit;
    format!("{}.{}{suffix}", tenths / 10, tenths % 10)
}

pub fn execute(workspace: &Path, arguments: &str) -> Result<String> {
    #[derive(Deserialize)]
    #[serde(deny_unknown_fields)]
    struct Args {
        path: String,
        offset: Option<usize>,
        limit: Option<usize>,
    }
    let args: Args = serde_json::from_str(arguments)?;
    let offset = args.offset.unwrap_or(1);
    if offset == 0 || args.limit == Some(0) {
        bail!("offset and limit must be positive integers");
    }
    let root = workspace.canonicalize()?;
    let path = root.join(&args.path).canonicalize()?;
    if !path.starts_with(&root) {
        bail!("path escapes workspace");
    }
    if !fs::metadata(&path)?.is_file() {
        bail!("read requires a regular file");
    }
    let mut options = fs::OpenOptions::new();
    options.read(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.custom_flags(libc::O_NONBLOCK | libc::O_NOFOLLOW);
    }
    let file = options.open(&path)?;
    if !file.metadata()?.is_file() {
        bail!("read requires a regular file");
    }
    let mut bytes = vec![];
    file.take(MAX_SOURCE + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > MAX_SOURCE {
        bail!("file exceeds 8 MiB text read limit");
    }
    // GIF can consist entirely of valid UTF-8; do not present known images as text.
    if bytes.contains(&0)
        || bytes.starts_with(b"GIF87a")
        || bytes.starts_with(b"GIF89a")
        || (bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP"))
    {
        bail!("binary/image reads are unsupported");
    }
    let text = String::from_utf8(bytes)
        .context("file is not UTF-8; binary/image reads are unsupported")?;
    let lines: Vec<_> = text.split('\n').collect();
    let start = offset - 1;
    if start >= lines.len() {
        bail!(
            "Offset {offset} is beyond end of file ({} lines total)",
            lines.len()
        );
    }
    let end = args.limit.map_or(lines.len(), |limit| {
        start.saturating_add(limit).min(lines.len())
    });
    let selected = lines[start..end].join("\n");
    let truncation = pi_rs_compat::truncate(&json!({"kind":"head","content":selected}));
    if truncation["firstLineExceedsLimit"] == true {
        return Ok(format!("[Line {offset} is {}, exceeds 50.0KB limit. Use bash: sed -n '{offset}p' {} | head -c 51200]",format_size(lines[start].len()),shell_path(&args.path)));
    }
    let mut output = truncation["content"]
        .as_str()
        .context("invalid truncation result")?
        .to_owned();
    if truncation["truncated"] == true {
        let count = truncation["outputLines"]
            .as_u64()
            .context("missing outputLines")? as usize;
        let last = offset + count - 1;
        let suffix = if truncation["truncatedBy"] == "lines" {
            ""
        } else {
            " (50.0KB limit)"
        };
        output.push_str(&format!(
            "\n\n[Showing lines {offset}-{last} of {}{suffix}. Use offset={} to continue.]",
            lines.len(),
            last + 1
        ));
    } else if args.limit.is_some() && end < lines.len() {
        output.push_str(&format!(
            "\n\n[{} more lines in file. Use offset={} to continue.]",
            lines.len() - end,
            end + 1
        ));
    }
    Ok(output)
}
