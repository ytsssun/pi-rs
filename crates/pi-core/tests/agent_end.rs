use pi_core::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::json;
#[test]
fn agent_end_requires_ack_and_excludes_previous_run() {
    let path = std::env::temp_dir().join(format!("pi-agent-end-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut store = PiSessionStore::create(
        &path,
        json!({"type":"session","version":3,"id":"end","cwd":"/tmp"}),
    )
    .unwrap();
    let mut runtime = PiRuntime::default();
    for prompt in ["first", "second"] {
        let mut action = runtime
            .step(
                &mut store,
                &json!({"event":"begin","prompt":prompt,"lifecycle":true,"driveStart":true}),
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
        action = runtime.step(&mut store, &json!({"event":"model_result","requestId":action["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}})).unwrap();
        runtime
            .step(
                &mut store,
                &json!({"event":"lifecycle_ack","requestId":action["requestId"]}),
            )
            .unwrap();
        let end = runtime
            .step(&mut store, &json!({"event":"advance_queued"}))
            .unwrap();
        assert_eq!(end["action"]["event"]["type"], "agent_end");
        let messages = end["action"]["event"]["messages"].as_array().unwrap();
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0]["content"], prompt);
        assert!(runtime
            .step(
                &mut store,
                &json!({"event":"lifecycle_ack","requestId":"stale"})
            )
            .is_err());
        let ack = json!({"event":"lifecycle_ack","requestId":end["action"]["requestId"]});
        assert_eq!(runtime.step(&mut store, &ack).unwrap()["type"], "settled");
        assert!(runtime.step(&mut store, &ack).is_err());
        assert_eq!(
            runtime
                .step(&mut store, &json!({"event":"advance_queued"}))
                .unwrap()["type"],
            "empty"
        );
    }
    drop(store);
    std::fs::remove_file(path).unwrap();
}
