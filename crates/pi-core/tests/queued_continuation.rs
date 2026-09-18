use pi_core::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::json;
#[test]
fn queued_continuation_requires_settlement_and_admits_once() {
    let path = std::env::temp_dir().join(format!("pi-continue-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store = PiSessionStore::create(
        &path,
        json!({"type":"session","version":3,"id":"continue","cwd":"/tmp"}),
    )
    .unwrap();
    let mut runtime = PiRuntime::default();
    assert!(runtime
        .step(&mut store, &json!({"event":"continue_queued"}))
        .is_err());
    let mut action = runtime
        .step(
            &mut store,
            &json!({"event":"begin","prompt":"first","driveStart":true,"lifecycle":true}),
        )
        .unwrap();
    for _ in 0..2 {
        action = runtime
            .step(
                &mut store,
                &json!({"event":"lifecycle_ack","requestId":action["requestId"]}),
            )
            .unwrap();
    }
    runtime.step(&mut store, &json!({"event":"enqueue_user","queued":{"kind":"user","message":"queued","options":{"deliverAs":"followUp"}}})).unwrap();
    assert!(runtime
        .step(&mut store, &json!({"event":"continue_queued"}))
        .is_err());
    action = runtime.step(&mut store, &json!({"event":"provider_failure","requestId":action["requestId"],"error":"failed","model":{"api":"fixture","provider":"fixture","id":"fixture"}})).unwrap();
    runtime
        .step(
            &mut store,
            &json!({"event":"lifecycle_ack","requestId":action["requestId"]}),
        )
        .unwrap();
    let end = runtime
        .step(&mut store, &json!({"event":"advance_queued"}))
        .unwrap();
    runtime
        .step(
            &mut store,
            &json!({"event":"lifecycle_ack","requestId":end["action"]["requestId"]}),
        )
        .unwrap();
    let next = runtime
        .step(&mut store, &json!({"event":"continue_queued"}))
        .unwrap();
    assert_eq!(next["action"]["event"]["type"], "agent_start");
    assert_eq!(
        runtime
            .step(&mut store, &json!({"event":"pending_users"}))
            .unwrap(),
        json!([])
    );
    assert!(runtime
        .step(&mut store, &json!({"event":"continue_queued"}))
        .is_err());
    drop(store);
    std::fs::remove_file(path).unwrap();
}

#[test]
fn selective_clear_preserves_other_queue_and_rejects_invalid_selector() {
    let path = std::env::temp_dir().join(format!("pi-clear-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store = PiSessionStore::create(
        &path,
        json!({"type":"session","version":3,"id":"clear","cwd":"/tmp"}),
    )
    .unwrap();
    let mut runtime = PiRuntime::default();
    for kind in ["steer", "followUp"] {
        runtime.step(&mut store, &json!({"event":"enqueue_user","queued":{"kind":"user","message":kind,"options":{"deliverAs":kind}}})).unwrap();
    }
    assert!(runtime
        .step(
            &mut store,
            &json!({"event":"clear_users","queue":"invalid"})
        )
        .is_err());
    assert_eq!(
        runtime
            .step(&mut store, &json!({"event":"pending_users"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        2
    );
    runtime
        .step(&mut store, &json!({"event":"clear_users","queue":"steer"}))
        .unwrap();
    let remaining = runtime
        .step(&mut store, &json!({"event":"pending_users"}))
        .unwrap();
    assert_eq!(remaining.as_array().unwrap().len(), 1);
    assert_eq!(remaining[0]["message"], "followUp");
    runtime
        .step(
            &mut store,
            &json!({"event":"clear_users","queue":"followUp"}),
        )
        .unwrap();
    assert_eq!(
        runtime
            .step(&mut store, &json!({"event":"pending_users"}))
            .unwrap(),
        json!([])
    );
    drop(store);
    assert!(
        !path.exists(),
        "queue operations must not force lazy session persistence"
    );
}
