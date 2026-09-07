use pi_rs::read::execute;
use serde_json::json;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
};
struct Workspace(PathBuf);
impl Workspace {
    fn new() -> Self {
        static N: AtomicUsize = AtomicUsize::new(0);
        let p = std::env::temp_dir().join(format!(
            "pi-page-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&p).unwrap();
        Self(p)
    }
}
impl Drop for Workspace {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
#[test]
fn pagination_utf8_empty_trailing_and_bounds() {
    let w = Workspace::new();
    fs::write(w.0.join("a"), "你好\nworld\n").unwrap();
    assert_eq!(
        execute(&w.0, r#"{"path":"a","offset":2,"limit":1}"#).unwrap(),
        "world\n\n[1 more lines in file. Use offset=3 to continue.]"
    );
    assert_eq!(execute(&w.0, r#"{"path":"a","offset":3}"#).unwrap(), "");
    assert!(execute(&w.0, r#"{"path":"a","offset":4}"#)
        .unwrap_err()
        .to_string()
        .contains("3 lines total"));
    for value in [json!(0), json!(-1), json!(0.5)] {
        for key in ["offset", "limit"] {
            let mut a = json!({"path":"a"});
            a[key] = value.clone();
            assert!(execute(&w.0, &a.to_string()).is_err());
        }
    }
    fs::write(w.0.join("empty"), "").unwrap();
    assert_eq!(execute(&w.0, r#"{"path":"empty"}"#).unwrap(), "");
}
#[test]
fn truncates_lines_bytes_and_quotes_fallback() {
    let w = Workspace::new();
    fs::write(w.0.join("many"), "line\n".repeat(2001)).unwrap();
    let result = execute(&w.0, r#"{"path":"many"}"#).unwrap();
    assert!(result.ends_with("[Showing lines 1-2000 of 2002. Use offset=2001 to continue.]"));
    fs::write(w.0.join("long"), "x".repeat(51201)).unwrap();
    assert_eq!(
        execute(&w.0, r#"{"path":"long"}"#).unwrap(),
        "[Line 1 is 50.0KB, exceeds 50.0KB limit. Use bash: sed -n '1p' long | head -c 51200]"
    );
    let unsafe_name = "a'; touch marker; #";
    fs::write(w.0.join(unsafe_name), "x".repeat(51201)).unwrap();
    let result = execute(&w.0, &json!({"path":unsafe_name}).to_string()).unwrap();
    assert!(result.contains("'a'\\''; touch marker; #'"));
    fs::write(
        w.0.join("bytes"),
        format!("{}\n{}", "x".repeat(40000), "y".repeat(20000)),
    )
    .unwrap();
    assert!(execute(&w.0, r#"{"path":"bytes"}"#)
        .unwrap()
        .ends_with("[Showing lines 1-1 of 2 (50.0KB limit). Use offset=2 to continue.]"));
}
#[test]
fn rejects_large_binary_and_escape() {
    let w = Workspace::new();
    let other = Workspace::new();
    fs::write(w.0.join("large"), vec![b'x'; 8 * 1024 * 1024 + 1]).unwrap();
    assert!(execute(&w.0, r#"{"path":"large"}"#).is_err());
    for bytes in [vec![0xff], vec![0], b"GIF89ahello".to_vec()] {
        fs::write(w.0.join("binary"), bytes).unwrap();
        assert!(execute(&w.0, r#"{"path":"binary"}"#).is_err());
    }
    fs::write(other.0.join("a"), "secret").unwrap();
    assert!(execute(&w.0, &json!({"path":other.0.join("a")}).to_string()).is_err());
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(other.0.join("a"), w.0.join("link")).unwrap();
        assert!(execute(&w.0, r#"{"path":"link"}"#).is_err());
        let name = std::ffi::CString::new(w.0.join("fifo").to_str().unwrap()).unwrap();
        assert_eq!(unsafe { libc::mkfifo(name.as_ptr(), 0o600) }, 0);
        assert!(execute(&w.0, r#"{"path":"fifo"}"#).is_err());
    }
}

#[test]
fn ordinary_bm_prefix_and_large_numeric_arguments() {
    let w = Workspace::new();
    fs::write(w.0.join("a"), "BMR = 42\n").unwrap();
    assert_eq!(execute(&w.0, r#"{"path":"a"}"#).unwrap(), "BMR = 42\n");
    assert_eq!(
        execute(&w.0, &json!({"path":"a","limit":usize::MAX}).to_string()).unwrap(),
        "BMR = 42\n"
    );
    assert!(execute(&w.0, &json!({"path":"a","offset":usize::MAX}).to_string()).is_err());
}

#[test]
fn first_line_size_rounds_like_javascript() {
    let w = Workspace::new();
    fs::write(w.0.join("rounding"), "x".repeat(52480)).unwrap();
    let text = execute(&w.0, r#"{"path":"rounding"}"#).unwrap();
    assert!(text.starts_with("[Line 1 is 51.3KB,"));
}
