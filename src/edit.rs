//! Exact-only edit profile: all matches refer to the original LF-normalized file.
//! Uniqueness uses Pi-style NFKC/fuzzy normalization; fuzzy replacement fallback
//! is unsupported. BOM and the first original newline convention are preserved.
use anyhow::{bail, Result};
use serde::Deserialize;
use serde_json::json;
use std::path::Path;
use unicode_normalization::UnicodeNormalization;

// Normalization and original-offset edit behavior adapted from Pi's edit-diff.ts:
// https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/coding-agent/src/core/tools/edit-diff.ts
// Upstream MIT attribution is retained in the repository root NOTICE.
fn js_trim_end_whitespace(c: char) -> bool {
    matches!(c,
        '\u{0009}'..='\u{000d}' | '\u{0020}' | '\u{00a0}' | '\u{1680}' |
        '\u{2000}'..='\u{200a}' | '\u{2028}' | '\u{2029}' | '\u{202f}' |
        '\u{205f}' | '\u{3000}' | '\u{feff}'
    )
}

fn fuzzy(s: &str) -> String {
    let normalized: String = s.nfkc().collect();
    let trimmed_lines = normalized
        .split('\n')
        .map(|line| line.trim_end_matches(js_trim_end_whitespace))
        .collect::<Vec<_>>()
        .join("\n");
    trimmed_lines
        .chars()
        .map(|c| match c {
            '\u{2018}'..='\u{201b}' => '\'',
            '\u{201c}'..='\u{201f}' => '"',
            '\u{2010}'..='\u{2015}' | '\u{2212}' => '-',
            '\u{00a0}' | '\u{2002}'..='\u{200a}' | '\u{202f}' | '\u{205f}' | '\u{3000}' => ' ',
            _ => c,
        })
        .collect()
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Args {
    path: String,
    edits: Vec<Edit>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct Edit {
    old_text: String,
    new_text: String,
}
fn lf(s: &str) -> String {
    s.replace("\r\n", "\n").replace('\r', "\n")
}

pub fn apply_exact(content: &str, arguments: &str) -> Result<String> {
    let args: Args = serde_json::from_str(arguments)?;
    if args.edits.is_empty() {
        bail!("edits must not be empty");
    }
    let (bom, text) = match content.strip_prefix('\u{feff}') {
        Some(t) => ("\u{feff}", t),
        None => ("", content),
    };
    let crlf = match (text.find("\r\n"), text.find('\n')) {
        (Some(cr), Some(nl)) => cr < nl,
        _ => false,
    };
    let original = lf(text);
    let mut replacements = Vec::new();
    for (index, edit) in args.edits.iter().enumerate() {
        let old = lf(&edit.old_text);
        if old.is_empty() {
            bail!("edits[{index}].oldText must not be empty");
        }
        let Some(match_index) = original.find(&old) else {
            bail!(
                "edits[{index}] exact text not found in {} (fuzzy matching unsupported)",
                args.path
            );
        };
        let fuzzy_old = fuzzy(&old);
        let fuzzy_original = fuzzy(&original);
        let occurrences = if fuzzy_old.is_empty() {
            fuzzy_original.encode_utf16().count().saturating_sub(1)
        } else {
            fuzzy_original.matches(&fuzzy_old).count()
        };
        if occurrences > 1 {
            bail!("edits[{index}] exact text is not unique in {}", args.path);
        }
        replacements.push((
            match_index,
            match_index + old.len(),
            lf(&edit.new_text),
            index,
        ));
    }
    replacements.sort_by_key(|r| r.0);
    for pair in replacements.windows(2) {
        if pair[0].1 > pair[1].0 {
            bail!("edits[{}] and edits[{}] overlap", pair[0].3, pair[1].3);
        }
    }
    let mut result = original.clone();
    for (start, end, new, _) in replacements.into_iter().rev() {
        result.replace_range(start..end, &new);
    }
    if result == original {
        bail!("No changes made to {}", args.path);
    }
    if crlf {
        result = result.replace('\n', "\r\n");
    }
    Ok(format!("{bom}{result}"))
}

pub fn execute(workspace: &Path, arguments: &str) -> Result<String> {
    let args: Args = serde_json::from_str(arguments)?;
    let original = crate::read_tool(workspace, &json!({"path":args.path}).to_string())?;
    let content = apply_exact(&original, arguments)?;
    crate::tools::execute(
        workspace,
        "write",
        &json!({"path":args.path,"content":content}).to_string(),
    )?;
    Ok(format!(
        "Successfully replaced {} block(s) in {}.",
        args.edits.len(),
        args.path
    ))
}
