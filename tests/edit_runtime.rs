use pi_rs::{run_with_options, Session};
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
            "pi-edit-runtime-{}-{}",
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
fn call(id: &str, name: &str, args: Value) -> Value {
    json!({"role":"assistant","tool_calls":[{"id":id,"type":"function","function":{"name":name,"arguments":args.to_string()}}]})
}
fn edit() -> Value {
    call(
        "edit1",
        "edit",
        json!({"path":"test.py","edits":[{"oldText":"answer = 41","newText":"answer = 42"}]}),
    )
}
#[test]
fn edit_permission_and_uncertain_outcome_never_replay() {
    let w = Workspace::new();
    let p = w.0.join("session.json");
    fs::write(w.0.join("test.py"), "answer = 41\nassert answer == 42\n").unwrap();
    let mut s = Session::new(&w.0, "fix").unwrap();
    s.save(&p).unwrap();
    run_with_options(&mut s, &p, 2, None, false, |_, i| {
        Ok(if i == 0 {
            edit()
        } else {
            json!({"role":"assistant","content":"denied"})
        })
    })
    .unwrap();
    assert!(fs::read_to_string(w.0.join("test.py"))
        .unwrap()
        .contains("41"));
    assert!(s.messages[2]["content"]
        .as_str()
        .unwrap()
        .contains("--allow-mutations"));
    let mut s = Session::new(&w.0, "fix").unwrap();
    s.messages.push(edit());
    s.in_flight = Some("edit1".into());
    s.save(&p).unwrap();
    let mut s = Session::load(&p).unwrap();
    assert!(run_with_options(&mut s, &p, 2, None, true, |_, _| panic!(
        "uncertain edit must not request model"
    ))
    .is_err());
    assert!(fs::read_to_string(w.0.join("test.py"))
        .unwrap()
        .contains("41"));
}
#[cfg(unix)]
#[test]
fn targeted_edit_real_test_and_followup() {
    let w = Workspace::new();
    let p = w.0.join("session.json");
    fs::write(
        w.0.join("test.py"),
        "answer = 41\nassert answer == 42\nprint('EDIT_PASS')\n",
    )
    .unwrap();
    let responses = [
        call("before", "bash", json!({"command":"python3 -B test.py"})),
        edit(),
        call("after", "bash", json!({"command":"python3 -B test.py"})),
        json!({"role":"assistant","content":"fixed"}),
        call(
            "followup",
            "edit",
            json!({"path":"test.py","edits":[{"oldText":"print('EDIT_PASS')","newText":"assert answer > 0\nprint('FOLLOWUP_PASS')"}]}),
        ),
        call("test2", "bash", json!({"command":"python3 -B test.py"})),
        json!({"role":"assistant","content":"continued"}),
    ];
    let mut s = Session::new(&w.0, "fix").unwrap();
    s.save(&p).unwrap();
    run_with_options(&mut s, &p, 8, None, true, |_, i| Ok(responses[i].clone())).unwrap();
    assert!(s.messages[2]["content"]
        .as_str()
        .unwrap()
        .contains("ERROR:"));
    assert!(s.messages[6]["content"]
        .as_str()
        .unwrap()
        .contains("EDIT_PASS"));
    let prefix = s.messages.clone();
    drop(s);
    let mut s = Session::load(&p).unwrap();
    s.append_user("extend test").unwrap();
    s.save(&p).unwrap();
    run_with_options(&mut s, &p, 8, None, true, |_, i| Ok(responses[i].clone())).unwrap();
    assert_eq!(s.messages[..prefix.len()], prefix);
    assert!(s.messages.iter().any(|m| m["role"] == "tool"
        && m["content"]
            .as_str()
            .unwrap_or("")
            .contains("FOLLOWUP_PASS")));
}
