use pi_core::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::{json, Value};

#[test]
fn native_queue_orders_and_retains_failed_admission() {
    let path = std::env::temp_dir().join(format!("pi-user-queue-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store = PiSessionStore::create(&path, json!({"type":"session","version":3,"id":"queue","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut runtime = PiRuntime::default();
    let send = |runtime: &mut PiRuntime, store: &mut PiSessionStore, event: Value| {
        runtime.step(store, &event).unwrap()
    };
    for (message, mode) in [("follow", "followUp"), ("one", "steer"), ("two", "steer")] {
        send(
            &mut runtime,
            &mut store,
            json!({"event":"enqueue_user","queued":{"kind":"user","message":message,"options":{"deliverAs":mode}}}),
        );
    }
    assert_eq!(
        send(
            &mut runtime,
            &mut store,
            json!({"event":"advance_queued","cancelled":true})
        )["type"],
        "retained"
    );
    let initial = send(
        &mut runtime,
        &mut store,
        json!({"event":"begin","prompt":"initial"}),
    );
    assert!(runtime
        .step(&mut store, &json!({"event":"advance_queued"}))
        .is_err());
    assert_eq!(
        send(&mut runtime, &mut store, json!({"event":"pending_users"}))
            .as_array()
            .unwrap()
            .len(),
        3
    );
    send(
        &mut runtime,
        &mut store,
        json!({"event":"model_result","requestId":initial["requestId"],"message":{"role":"assistant","content":[],"stopReason":"error"}}),
    );
    assert_eq!(
        send(&mut runtime, &mut store, json!({"event":"advance_queued"}))["type"],
        "retained"
    );
    let retry = send(
        &mut runtime,
        &mut store,
        json!({"event":"begin","prompt":"retry"}),
    );
    send(
        &mut runtime,
        &mut store,
        json!({"event":"model_result","requestId":retry["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}}),
    );
    for expected in ["one", "two", "follow"] {
        let admitted = send(&mut runtime, &mut store, json!({"event":"advance_queued"}));
        assert_eq!(admitted["queued"]["message"], expected);
        send(
            &mut runtime,
            &mut store,
            json!({"event":"model_result","requestId":admitted["action"]["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}}),
        );
    }
    assert_eq!(
        send(&mut runtime, &mut store, json!({"event":"advance_queued"}))["type"],
        "empty"
    );
    send(
        &mut runtime,
        &mut store,
        json!({"event":"enqueue_user","queued":{"kind":"user","message":42,"options":{"deliverAs":"steer"}}}),
    );
    let before = store.snapshot().unwrap();
    assert!(runtime
        .step(&mut store, &json!({"event":"advance_queued"}))
        .is_err());
    assert_eq!(store.snapshot().unwrap(), before);
    assert_eq!(
        send(&mut runtime, &mut store, json!({"event":"pending_users"}))
            .as_array()
            .unwrap()
            .len(),
        1
    );
    drop(store);
    std::fs::remove_file(path).unwrap();
}

#[test]
fn native_custom_next_turn_fifo_and_deferred() {
    let p = std::env::temp_dir().join(format!("pi-custom-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&p);
    let mut s=PiSessionStore::create(&p,json!({"type":"session","version":3,"id":"c","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut r = PiRuntime::default();
    for t in ["one", "two"] {
        r.step(&mut s,&json!({"event":"enqueue_custom","message":{"customType":t,"content":t,"display":false}})).unwrap();
    }
    let a = r
        .step(
            &mut s,
            &json!({"event":"begin","prompt":"go","maxActions":1}),
        )
        .unwrap();
    assert_eq!(r.step(&mut s,&json!({"event":"model_result","requestId":a["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}})).unwrap()["type"],"done");
    let es = s.snapshot().unwrap()["entries"].as_array().unwrap().clone();
    let got: Vec<_> = es
        .iter()
        .filter(|e| e["type"] == "custom_message")
        .map(|e| e["customType"].as_str().unwrap())
        .collect();
    assert_eq!(got, ["one", "two"]);
    let _ = std::fs::remove_file(p);
}

#[test]
fn custom_enqueue_is_idempotent_on_retry() {
    let p = std::env::temp_dir().join(format!("pi-custom-retry-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&p);
    let mut s=PiSessionStore::create(&p,json!({"type":"session","version":3,"id":"c","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut r = PiRuntime::default();
    let m = json!({"customType":"one","content":"one","display":false});
    r.step(
        &mut s,
        &json!({"event":"enqueue_custom","queueId":"retry-1","message":m}),
    )
    .unwrap();
    assert!(r
        .step(
            &mut s,
            &json!({"event":"begin","prompt":"bad","nextTurnMessages": [{"customType":"bad"}]})
        )
        .is_err());
    r.step(
        &mut s,
        &json!({"event":"enqueue_custom","queueId":"retry-1","message":m}),
    )
    .unwrap();
    r.step(
        &mut s,
        &json!({"event":"enqueue_custom","queueId":"distinct-2","message":m}),
    )
    .unwrap();
    let a = r
        .step(&mut s, &json!({"event":"begin","prompt":"ok"}))
        .unwrap();
    assert_eq!(a["type"], "model");
    let snap = s.snapshot().unwrap();
    let e = snap["entries"].as_array().unwrap();
    assert_eq!(
        e.iter().filter(|x| x["type"] == "custom_message").count(),
        2
    );
    let _ = std::fs::remove_file(p);
}

#[test]
fn all_mode_validates_entire_group_before_admission() {
    let path = std::env::temp_dir().join(format!("pi-all-invalid-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store=PiSessionStore::create(&path,json!({"type":"session","version":3,"id":"all","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut runtime = PiRuntime::default();
    runtime
        .step(
            &mut store,
            &json!({"event":"queue_modes","steeringMode":"all"}),
        )
        .unwrap();
    for content in [json!("valid"), json!(42)] {
        runtime.step(&mut store,&json!({"event":"enqueue_user","queued":{"kind":"user","message":content,"options":{"deliverAs":"steer"}}})).unwrap();
    }
    let before = store.snapshot().unwrap();
    assert!(runtime
        .step(&mut store, &json!({"event":"advance_queued"}))
        .is_err());
    assert_eq!(store.snapshot().unwrap(), before);
    assert_eq!(
        runtime
            .step(&mut store, &json!({"event":"pending_users"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert!(runtime
        .step(
            &mut store,
            &json!({"event":"queue_modes","steeringMode":"one-at-a-time","followUpMode":"invalid"})
        )
        .is_err());
    assert_eq!(
        runtime
            .step(&mut store, &json!({"event":"queue_modes"}))
            .unwrap()["steeringMode"],
        "all"
    );
    drop(store);
    assert!(!path.exists(), "rejected admission must not persist a file");
}
