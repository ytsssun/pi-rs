use pi_rs::{run, run_with_options, Session};
use serde_json::json;
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
            "pi-session2-{}-{}",
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
fn call(name: &str, args: serde_json::Value) -> serde_json::Value {
    json!({"role":"assistant","tool_calls":[{"id":"effect1","type":"function","function":{"name":name,"arguments":args.to_string()}}]})
}
#[test]
fn followup_keeps_history_and_global_cursor() {
    let t = Temp::new();
    let p = t.0.join("s.json");
    let mut s = Session::new(&t.0, "one").unwrap();
    s.save(&p).unwrap();
    run(&mut s, &p, 1, None, |_, _| {
        Ok(json!({"role":"assistant","content":"first"}))
    })
    .unwrap();
    let old = s.messages.clone();
    let mut s = Session::load(&p).unwrap();
    s.append_user("two").unwrap();
    s.save(&p).unwrap();
    run(&mut s, &p, 1, None, |m, c| {
        assert_eq!(c, 1);
        assert_eq!(&m[..2], old.as_slice());
        assert_eq!(m[2]["content"], "two");
        Ok(json!({"role":"assistant","content":"second"}))
    })
    .unwrap();
    assert_eq!(Session::load(&p).unwrap().messages.len(), 4);
}
#[test]
fn cannot_append_during_pending_or_unfinished_turn() {
    let t = Temp::new();
    let mut s = Session::new(&t.0, "one").unwrap();
    assert!(s.append_user("two").is_err());
    s.messages.push(call("read", json!({"path":"missing"})));
    assert!(s.append_user("two").is_err());
    s.messages.push(json!({"role":"user","content":"invalid"}));
    assert!(s.validate().is_err());
}
#[test]
fn uncertain_mutation_never_replayed_and_resolution_is_recorded() {
    let t = Temp::new();
    let p = t.0.join("s.json");
    let mut s = Session::new(&t.0, "write").unwrap();
    s.messages.push(call(
        "write",
        json!({"path":"target","content":"replacement"}),
    ));
    s.in_flight = Some("effect1".into());
    s.save(&p).unwrap();
    fs::write(t.0.join("target"), "effect already happened").unwrap();
    let mut s = Session::load(&p).unwrap();
    assert!(run_with_options(&mut s, &p, 1, None, true, |_, _| panic!(
        "must reject before model"
    ))
    .unwrap_err()
    .to_string()
    .contains("uncertain outcome"));
    assert_eq!(
        fs::read_to_string(t.0.join("target")).unwrap(),
        "effect already happened"
    );
    s.resolve_in_flight("inspected file, keep existing result")
        .unwrap();
    s.save(&p).unwrap();
    run_with_options(&mut s, &p, 1, None, true, |m, _| {
        assert!(m[2]["content"].as_str().unwrap().contains("inspected file"));
        Ok(json!({"role":"assistant","content":"done"}))
    })
    .unwrap();
    assert_eq!(
        fs::read_to_string(t.0.join("target")).unwrap(),
        "effect already happened"
    );
    assert!(Session::load(&p).unwrap().in_flight.is_none());
}
#[test]
fn context_policy_persists_and_v1_missing_fields_load() {
    let t = Temp::new();
    let p = t.0.join("s.json");
    fs::write(t.0.join("data"), "abcdef").unwrap();
    fs::write(
        &p,
        json!({"version":1,"workspace":t.0,"messages":[{"role":"user","content":"read"}]})
            .to_string(),
    )
    .unwrap();
    let mut s = Session::load(&p).unwrap();
    assert!(run(&mut s, &p, 1, Some(2), |_, _| Ok(call(
        "read",
        json!({"path":"data"})
    )))
    .is_err());
    let mut s = Session::load(&p).unwrap();
    assert_eq!(s.context_tool_chars, Some(2));
    run(&mut s, &p, 1, None, |m, _| {
        assert!(m[2]["content"].as_str().unwrap().starts_with("ab\n"));
        Ok(json!({"role":"assistant","content":"done"}))
    })
    .unwrap();
    assert_eq!(s.messages[2]["content"], "abcdef");
}
#[test]
fn mutation_requires_permission_every_invocation() {
    let t = Temp::new();
    let p = t.0.join("s.json");
    let mut s = Session::new(&t.0, "write").unwrap();
    s.save(&p).unwrap();
    run(&mut s, &p, 2, None, |_, c| {
        Ok(if c == 0 {
            call("write", json!({"path":"nope","content":"bad"}))
        } else {
            json!({"role":"assistant","content":"done"})
        })
    })
    .unwrap();
    assert!(!t.0.join("nope").exists());
    assert!(s.messages[2]["content"]
        .as_str()
        .unwrap()
        .contains("requires --allow-mutations"));
}

#[cfg(unix)]
#[test]
fn process_lock_rejects_owner_releases_on_death_and_preserves_suffix() {
    use std::{
        io::Read,
        net::TcpListener,
        os::fd::AsRawFd,
        process::{Command, Stdio},
        time::{Duration, Instant},
    };
    let t = Temp::new();
    let p = t.0.join("session.lock");
    let f = t.0.join("fixture.json");
    fs::write(&f, "[{\"role\":\"assistant\",\"content\":\"done\"}]").unwrap();
    let lock_path = pi_rs::appended_path(&p, ".lock");
    assert_ne!(lock_path, p);
    let lock = fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .write(true)
        .open(&lock_path)
        .unwrap();
    assert_eq!(
        unsafe { libc::flock(lock.as_raw_fd(), libc::LOCK_EX | libc::LOCK_NB) },
        0
    );
    let blocked = Command::new(env!("CARGO_BIN_EXE_pi-rs"))
        .args(["--input", "hi", "--session"])
        .arg(&p)
        .arg("--fixture")
        .arg(&f)
        .output()
        .unwrap();
    assert!(!blocked.status.success());
    assert!(String::from_utf8_lossy(&blocked.stderr).contains("locked by another process"));
    assert!(!p.exists());
    drop(lock);
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let mut child = Command::new(env!("CARGO_BIN_EXE_pi-rs"))
        .args(["--input", "hi", "--session"])
        .arg(&p)
        .args(["--model", "test"])
        .env("OPENAI_API_KEY", "test")
        .env(
            "OPENAI_BASE_URL",
            format!("http://{}/v1", listener.local_addr().unwrap()),
        )
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .unwrap();
    let deadline = Instant::now() + Duration::from_secs(5);
    let accepted = loop {
        match listener.accept() {
            Ok((stream, _)) => break Some(stream),
            Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                if Instant::now() >= deadline {
                    break None;
                }
                std::thread::sleep(Duration::from_millis(10));
            }
            Err(e) => panic!("{e}"),
        }
    };
    child.kill().unwrap();
    child.wait().unwrap();
    assert!(
        accepted.is_some(),
        "CLI never reached model while holding lock"
    );
    let resumed = Command::new(env!("CARGO_BIN_EXE_pi-rs"))
        .args(["--resume", "--session"])
        .arg(&p)
        .arg("--fixture")
        .arg(&f)
        .output()
        .unwrap();
    assert!(
        resumed.status.success(),
        "{}",
        String::from_utf8_lossy(&resumed.stderr)
    );
    assert!(lock_path.exists());
    assert_eq!(Session::load(&p).unwrap().messages.len(), 2);
    let mut file = fs::File::open(&p).unwrap();
    let mut data = String::new();
    file.read_to_string(&mut data).unwrap();
    assert!(data.contains("done"));
}
