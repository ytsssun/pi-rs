use pi_rs::tools::execute;
use serde_json::json;
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
    time::Instant,
};
struct Workspace(PathBuf);
impl Workspace {
    fn new() -> Self {
        static N: AtomicUsize = AtomicUsize::new(0);
        let p = std::env::temp_dir().join(format!(
            "pi-tools-{}-{}",
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
fn write_create_replace_and_reject_escape() {
    let w = Workspace::new();
    for content in ["first", "second"] {
        execute(
            &w.0,
            "write",
            &json!({"path":"sub/a.txt","content":content}).to_string(),
        )
        .unwrap();
        assert_eq!(fs::read_to_string(w.0.join("sub/a.txt")).unwrap(), content);
    }
    assert!(execute(&w.0, "write", r#"{"path":"../escape","content":"bad"}"#).is_err());
    assert!(execute(
        &w.0,
        "write",
        &json!({"path":"big","content":"x".repeat(1_048_577)}).to_string()
    )
    .is_err());
}
#[cfg(unix)]
#[test]
fn write_rejects_symlink_escape() {
    let w = Workspace::new();
    let other = Workspace::new();
    std::os::unix::fs::symlink(&other.0, w.0.join("outside")).unwrap();
    assert!(execute(&w.0, "write", r#"{"path":"outside/a","content":"bad"}"#).is_err());
    assert!(!other.0.join("a").exists());
}
#[cfg(unix)]
#[test]
fn shell_real_test_and_nonzero() {
    let w = Workspace::new();
    execute(&w.0, "write", r#"{"path":"answer","content":"42"}"#).unwrap();
    assert!(execute(
        &w.0,
        "bash",
        r#"{"command":"test \"$(cat answer)\" = 42 && echo passed"}"#
    )
    .unwrap()
    .contains("passed"));
    let err = execute(&w.0, "bash", r#"{"command":"echo failure >&2; exit 7"}"#)
        .unwrap_err()
        .to_string();
    assert!(err.contains("7") && err.contains("failure"));
}
#[cfg(unix)]
#[test]
fn shell_bounds_output_and_timeout() {
    let w = Workspace::new();
    let t = Instant::now();
    let err = execute(
        &w.0,
        "bash",
        r#"{"command":"while :; do printf '0123456789'; done","timeout":1}"#,
    )
    .unwrap_err()
    .to_string();
    assert!(err.contains("timed out") && err.contains("truncated"));
    assert!(err.len() < 70000);
    assert!(t.elapsed().as_secs() < 5);
    let t = Instant::now();
    execute(
        &w.0,
        "bash",
        r#"{"command":"sleep 30 & echo done","timeout":1}"#,
    )
    .unwrap();
    assert!(t.elapsed().as_secs() < 3);
}

#[cfg(unix)]
#[test]
fn shell_kills_ordinary_background_children() {
    let w = Workspace::new();
    execute(
        &w.0,
        "bash",
        r#"{"command":"(sleep 1; echo survived > marker) & echo done","timeout":2}"#,
    )
    .unwrap();
    std::thread::sleep(std::time::Duration::from_millis(1300));
    assert!(!w.0.join("marker").exists());
    let error = execute(
        &w.0,
        "bash",
        r#"{"command":"(sleep 2; echo survived > marker) & wait","timeout":1}"#,
    )
    .unwrap_err();
    assert!(error.to_string().contains("timed out"));
    std::thread::sleep(std::time::Duration::from_millis(1300));
    assert!(!w.0.join("marker").exists());
}
