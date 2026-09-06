use pi_rs::{read_tool, run, Session};
use serde_json::{json, Value};
use std::{
    fs,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
};
static NEXT: AtomicU64 = AtomicU64::new(0);
struct Temp(PathBuf);
impl Temp {
    fn new() -> Self {
        let p = std::env::temp_dir().join(format!(
            "pi-rs-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, Ordering::SeqCst)
        ));
        fs::create_dir(&p).unwrap();
        Self(p.canonicalize().unwrap())
    }
}
impl Drop for Temp {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}
fn call() -> Value {
    json!({"role":"assistant","content":null,"tool_calls":[{"id":"1","type":"function","function":{"name":"read","arguments":"{\"path\":\"hello\"}"}}]})
}
#[test]
fn interrupted_run_restores_without_repeating_read() {
    let t = Temp::new();
    fs::write(t.0.join("hello"), "original").unwrap();
    let p = t.0.join("session.json");
    let mut s = Session::new(&t.0, "read").unwrap();
    s.save(&p).unwrap();
    assert!(run(&mut s, &p, 1, None, |_, _| Ok(call())).is_err());
    fs::write(t.0.join("hello"), "changed").unwrap();
    let mut s = Session::load(&p).unwrap();
    assert_eq!(
        run(&mut s, &p, 1, None, |messages, cursor| {
            assert_eq!(cursor, 1);
            assert_eq!(messages[2]["content"], "original");
            Ok(json!({"role":"assistant","content":"done"}))
        })
        .unwrap(),
        "done"
    );
    assert_eq!(
        run(&mut s, &p, 1, None, |_, _| panic!(
            "completed session called model"
        ))
        .unwrap(),
        "done"
    );
}
#[test]
fn pending_tool_recovery_and_derived_context() {
    let t = Temp::new();
    fs::write(t.0.join("hello"), "abcdef").unwrap();
    let p = t.0.join("session.json");
    let mut s = Session::new(&t.0, "read").unwrap();
    s.messages.push(call());
    s.save(&p).unwrap();
    let mut s = Session::load(&p).unwrap();
    run(&mut s, &p, 1, Some(2), |m, _| {
        assert!(m[2]["content"]
            .as_str()
            .unwrap()
            .starts_with("ab\n[context"));
        Ok(json!({"role":"assistant","content":"done"}))
    })
    .unwrap();
    assert_eq!(Session::load(&p).unwrap().messages[2]["content"], "abcdef");
}
#[test]
fn confinement_limits_and_invalid_text() {
    let t = Temp::new();
    let outside = Temp::new();
    fs::write(outside.0.join("secret"), "secret").unwrap();
    assert!(read_tool(&t.0, &json!({"path":outside.0.join("secret")}).to_string()).is_err());
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(outside.0.join("secret"), t.0.join("link")).unwrap();
        assert!(read_tool(&t.0, "{\"path\":\"link\"}").is_err());
    }
    fs::write(t.0.join("big"), vec![0; 65537]).unwrap();
    assert!(read_tool(&t.0, "{\"path\":\"big\"}").is_err());
    fs::write(t.0.join("binary"), [255]).unwrap();
    assert!(read_tool(&t.0, "{\"path\":\"binary\"}").is_err());
    assert!(read_tool(&t.0, "{\"path\":\".\"}").is_err());
}
#[test]
fn corrupt_sessions_and_malformed_model_are_rejected() {
    let t = Temp::new();
    let p = t.0.join("s.json");
    fs::write(&p, "{").unwrap();
    assert!(Session::load(&p).is_err());
    let mut s = Session::new(&t.0, "x").unwrap();
    s.save(&p).unwrap();
    assert!(run(&mut s, &p, 1, None, |_, _| Ok(
        json!({"role":"assistant","tool_calls":[]})
    ))
    .is_err());
    assert_eq!(Session::load(&p).unwrap().messages.len(), 1);
    s.messages
        .push(json!({"role":"tool","tool_call_id":"unknown","content":"bad"}));
    assert!(s.validate().is_err());
}
#[test]
fn failed_tool_is_a_result_and_model_failure_preserves_checkpoint() {
    let t = Temp::new();
    let p = t.0.join("s.json");
    let mut s = Session::new(&t.0, "read").unwrap();
    s.save(&p).unwrap();
    assert!(run(&mut s, &p, 3, None, |_, cursor| if cursor == 0 {
        Ok(call())
    } else {
        anyhow::bail!("provider offline")
    })
    .is_err());
    let s = Session::load(&p).unwrap();
    assert!(s.messages[2]["content"]
        .as_str()
        .unwrap()
        .starts_with("ERROR:"));
}

#[cfg(unix)]
#[test]
fn fifo_is_rejected_without_blocking() {
    let t = Temp::new();
    let path = t.0.join("fifo");
    let cpath = std::ffi::CString::new(path.to_str().unwrap()).unwrap();
    assert_eq!(unsafe { libc::mkfifo(cpath.as_ptr(), 0o600) }, 0);
    assert!(read_tool(&t.0, "{\"path\":\"fifo\"}").is_err());
}
