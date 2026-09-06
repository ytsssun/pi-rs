//! Pi truncateHead/truncateTail parity probe. Algorithm adapted from pinned MIT upstream;
//! see ../NOTICE and docs/upstream.md. JSONL input/output; not a complete Pi tool.
use serde_json::{Value, json};
use std::io::{self, BufRead};
fn truncate(v: &Value) -> Value {
    let s = v["content"].as_str().expect("content string");
    let max_lines = v["options"]["maxLines"].as_u64().unwrap_or(2000) as usize;
    let max_bytes = v["options"]["maxBytes"].as_u64().unwrap_or(51200) as usize;
    let tail = v["kind"] == "tail";
    let mut lines: Vec<&str> = if s.is_empty() {
        vec![]
    } else {
        s.split('\n').collect()
    };
    if s.ends_with('\n') {
        lines.pop();
    }
    let mut out = s.to_string();
    let truncated = lines.len() > max_lines || s.len() > max_bytes;
    let mut by: Option<&str> = None;
    let mut partial = false;
    let mut first = false;
    let mut count = lines.len();
    if truncated {
        let mut selected = vec![];
        let mut bytes = 0;
        by = Some("lines");
        if !tail && lines.first().is_some_and(|l| l.len() > max_bytes) {
            first = true;
            by = Some("bytes");
        } else {
            let ordered: Vec<&str> = if tail {
                lines.iter().rev().copied().collect()
            } else {
                lines.clone()
            };
            for line in ordered {
                if selected.len() >= max_lines {
                    break;
                }
                let size = line.len() + usize::from(!selected.is_empty());
                if bytes + size > max_bytes {
                    by = Some("bytes");
                    if tail && selected.is_empty() {
                        let mut start = line.len().saturating_sub(max_bytes);
                        while !line.is_char_boundary(start) {
                            start += 1;
                        }
                        selected.push(&line[start..]);
                        bytes = line.len() - start;
                        partial = true;
                    }
                    break;
                }
                selected.push(line);
                bytes += size;
            }
            if selected.len() >= max_lines && bytes <= max_bytes {
                by = Some("lines");
            }
        }
        if tail {
            selected.reverse();
        }
        count = selected.len();
        out = selected.join("\n");
    }
    json!({"content":out,"truncated":truncated,"truncatedBy":by,"totalLines":lines.len(),"totalBytes":s.len(),"outputLines":count,"outputBytes":out.len(),"lastLinePartial":partial,"firstLineExceedsLimit":first,"maxLines":max_lines,"maxBytes":max_bytes})
}
fn main() {
    for line in io::stdin().lock().lines() {
        let v: Value = serde_json::from_str(&line.unwrap()).expect("JSON input");
        println!("{}", truncate(&v));
    }
}
