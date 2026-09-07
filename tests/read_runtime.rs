use pi_rs::{run, Session};
use serde_json::{json, Value};
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
            "pi-read-runtime-{}-{}",
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
fn read(id: &str, offset: usize) -> Value {
    json!({"role":"assistant","tool_calls":[{"id":id,"type":"function","function":{"name":"read","arguments":json!({"path":"lines","offset":offset,"limit":2}).to_string()}}]})
}
#[test]
fn page_and_resume_preserve_actual_tool_content() {
    let w = Workspace::new();
    let p = w.0.join("session.json");
    fs::write(w.0.join("lines"), "one\ntwo\nthree\nfour").unwrap();
    let mut s = Session::new(&w.0, "read pages").unwrap();
    s.save(&p).unwrap();
    assert!(run(&mut s, &p, 1, None, |_, _| Ok(read("first", 1))).is_err());
    let mut s = Session::load(&p).unwrap();
    let answer = run(&mut s, &p, 2, None, |m, i| {
        assert_eq!(
            m[2]["content"],
            "one\ntwo\n\n[2 more lines in file. Use offset=3 to continue.]"
        );
        if i == 1 {
            Ok(read("second", 3))
        } else {
            assert_eq!(m[4]["content"], "three\nfour");
            Ok(json!({"role":"assistant","content":"all four lines"}))
        }
    })
    .unwrap();
    assert_eq!(answer, "all four lines");
}
#[test]
fn edit_uses_raw_file_not_truncated_read_view() {
    let w = Workspace::new();
    let original = "a\n".repeat(2100) + "last_unique\n";
    fs::write(w.0.join("long"), &original).unwrap();
    let page = pi_rs::tools::execute(&w.0, "read", r#"{"path":"long"}"#).unwrap();
    assert!(page.contains("Use offset=2001"));
    pi_rs::tools::execute(
        &w.0,
        "edit",
        r#"{"path":"long","edits":[{"oldText":"last_unique","newText":"updated_unique"}]}"#,
    )
    .unwrap();
    let actual = fs::read_to_string(w.0.join("long")).unwrap();
    assert_eq!(actual, original.replace("last_unique", "updated_unique"));
    assert!(!actual.contains("Showing lines"));
}
