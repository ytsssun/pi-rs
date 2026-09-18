use pi_core::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::json;
#[test]
fn retry_preserves_history_and_rejects_unrelated_context_edits() {
    let path = std::env::temp_dir().join(format!("pi-retry-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store = PiSessionStore::create(
        &path,
        json!({"type":"session","version":3,"id":"retry","cwd":"/tmp"}),
    )
    .unwrap();
    let mut runtime = PiRuntime::default();
    let mut action = runtime
        .step(
            &mut store,
            &json!({"event":"begin","prompt":"first","driveStart":true,"lifecycle":true}),
        )
        .unwrap();
    assert!(runtime
        .step(
            &mut store,
            &json!({"event":"continue_context","messages":[]})
        )
        .is_err());
    for _ in 0..2 {
        action = runtime
            .step(
                &mut store,
                &json!({"event":"lifecycle_ack","requestId":action["requestId"]}),
            )
            .unwrap();
    }
    let messages = action["contextEntries"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|e| e["type"] == "message")
        .map(|e| e["message"].clone())
        .collect::<Vec<_>>();
    action = runtime.step(&mut store, &json!({"event":"provider_failure","requestId":action["requestId"],"error":"overloaded","model":{"api":"fixture","provider":"fixture","id":"fixture"}})).unwrap();
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
    let before = store.snapshot().unwrap();
    assert!(runtime
        .step(
            &mut store,
            &json!({"event":"continue_context","messages":[{"role":"user","content":"altered"}]})
        )
        .is_err());
    assert_eq!(store.snapshot().unwrap(), before);
    action = runtime
        .step(
            &mut store,
            &json!({"event":"continue_context","messages":messages}),
        )
        .unwrap()["action"]
        .clone();
    for _ in 0..2 {
        action = runtime
            .step(
                &mut store,
                &json!({"event":"lifecycle_ack","requestId":action["requestId"]}),
            )
            .unwrap();
    }
    assert_eq!(action["type"], "model");
    assert!(action["contextEntries"]
        .as_array()
        .unwrap()
        .iter()
        .all(|e| e["message"]["stopReason"] != "error"));
    assert_eq!(store.snapshot().unwrap(), before);
    drop(store);
    std::fs::remove_file(path).unwrap();
}
