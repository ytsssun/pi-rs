use pi_core::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::json;
#[test]
fn exhausted_budget_does_not_append_unadmitted_followup() {
    let path =
        std::env::temp_dir().join(format!("pi-budget-admission-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store=PiSessionStore::create(&path,json!({"type":"session","version":3,"id":"budget","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut runtime = PiRuntime::default();
    let action = runtime
        .step(
            &mut store,
            &json!({"event":"begin","prompt":"initial","driveStart":true,"maxActions":1}),
        )
        .unwrap();
    runtime.step(&mut store,&json!({"event":"model_result","requestId":action["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}})).unwrap();
    runtime.step(&mut store,&json!({"event":"enqueue_user","queued":{"kind":"user","message":"follow","options":{"deliverAs":"followUp"}}})).unwrap();
    let before = store.snapshot().unwrap();
    assert!(runtime
        .step(&mut store, &json!({"event":"advance_queued"}))
        .is_err());
    assert_eq!(
        store.snapshot().unwrap(),
        before,
        "failed admission must preserve history"
    );
    assert_eq!(
        runtime
            .step(&mut store, &json!({"event":"pending_users"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        1
    );
    drop(store);
    let _ = std::fs::remove_file(path);
}

#[test]
fn exhausted_tool_boundary_retains_steer_after_persisting_result() {
    let path = std::env::temp_dir().join(format!("pi-tool-budget-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store=PiSessionStore::create(&path,json!({"type":"session","version":3,"id":"tool-budget","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut runtime = PiRuntime::default();
    let model = runtime
        .step(
            &mut store,
            &json!({"event":"begin","prompt":"initial","driveStart":true,"maxActions":2}),
        )
        .unwrap();
    let tool=runtime.step(&mut store,&json!({"event":"model_result","requestId":model["requestId"],"message":{"role":"assistant","content":[{"type":"toolCall","id":"w","name":"work","arguments":{}}],"stopReason":"toolUse"}})).unwrap();
    runtime.step(&mut store,&json!({"event":"enqueue_user","queued":{"kind":"user","message":"retained","options":{"deliverAs":"steer"}}})).unwrap();
    let result=runtime.step(&mut store,&json!({"event":"tool_result","requestId":tool["requestId"],"result":{"content":[{"type":"text","text":"done"}]}}));
    assert!(result.unwrap_err().to_string().contains("action limit"));
    let snapshot = store.snapshot().unwrap();
    let entries = snapshot["entries"].as_array().unwrap();
    assert_eq!(
        entries
            .iter()
            .filter(|e| e["message"]["role"] == "toolResult")
            .count(),
        1
    );
    let users: Vec<_> = entries
        .iter()
        .filter(|e| e["message"]["role"] == "user")
        .map(|e| e["message"]["content"].clone())
        .collect();
    assert_eq!(users, vec![json!("initial")]);
    assert_eq!(
        runtime
            .step(&mut store, &json!({"event":"pending_users"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        1
    );
    drop(store);
    std::fs::remove_file(path).unwrap();
}
