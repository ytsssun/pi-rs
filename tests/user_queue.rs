use pi_rs::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::{json, Value};

#[test]
fn native_queue_orders_and_retains_failed_admission() {
    let path = std::env::temp_dir().join(format!("pi-user-queue-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store = PiSessionStore::create(&path, json!({"type":"session","version":3,"id":"queue","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut runtime = PiRuntime::default();
    let send = |runtime: &mut PiRuntime, store: &mut PiSessionStore, event: Value| runtime.step(store, &event).unwrap();
    for (message, mode) in [("follow", "followUp"), ("one", "steer"), ("two", "steer")] {
        send(&mut runtime, &mut store, json!({"event":"enqueue_user","queued":{"kind":"user","message":message,"options":{"deliverAs":mode}}}));
    }
    assert_eq!(send(&mut runtime, &mut store, json!({"event":"advance_queued","cancelled":true}))["type"], "retained");
    let initial = send(&mut runtime, &mut store, json!({"event":"begin","prompt":"initial"}));
    assert!(runtime.step(&mut store, &json!({"event":"advance_queued"})).is_err());
    assert_eq!(send(&mut runtime, &mut store, json!({"event":"pending_users"})).as_array().unwrap().len(), 3);
    send(&mut runtime, &mut store, json!({"event":"model_result","requestId":initial["requestId"],"message":{"role":"assistant","content":[],"stopReason":"error"}}));
    assert_eq!(send(&mut runtime, &mut store, json!({"event":"advance_queued"}))["type"], "retained");
    let retry = send(&mut runtime, &mut store, json!({"event":"begin","prompt":"retry"}));
    send(&mut runtime, &mut store, json!({"event":"model_result","requestId":retry["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}}));
    for expected in ["one", "two", "follow"] {
        let admitted = send(&mut runtime, &mut store, json!({"event":"advance_queued"}));
        assert_eq!(admitted["queued"]["message"], expected);
        send(&mut runtime, &mut store, json!({"event":"model_result","requestId":admitted["action"]["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}}));
    }
    assert_eq!(send(&mut runtime, &mut store, json!({"event":"advance_queued"}))["type"], "empty");
    send(&mut runtime, &mut store, json!({"event":"enqueue_user","queued":{"kind":"user","message":42,"options":{"deliverAs":"steer"}}}));
    let before = store.snapshot().unwrap();
    assert!(runtime.step(&mut store, &json!({"event":"advance_queued"})).is_err());
    assert_eq!(store.snapshot().unwrap(), before);
    assert_eq!(send(&mut runtime, &mut store, json!({"event":"pending_users"})).as_array().unwrap().len(), 1);
    drop(store);
    std::fs::remove_file(path).unwrap();
}
