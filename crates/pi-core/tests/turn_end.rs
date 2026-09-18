use pi_core::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::{json, Value};
#[test]
fn end_ack_is_required_and_budget_failure_retains_queue() {
    let path = std::env::temp_dir().join(format!("pi-turn-end-{}.jsonl", std::process::id()));
    let _ = std::fs::remove_file(&path);
    let mut s=PiSessionStore::create(&path,json!({"type":"session","version":3,"id":"end","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
    let mut r = PiRuntime::default();
    let mut a=r.step(&mut s,&json!({"event":"begin","prompt":"initial","lifecycle":true,"driveStart":true,"maxActions":2})).unwrap();
    for _ in 0..2 {
        a = r
            .step(
                &mut s,
                &json!({"event":"lifecycle_ack","requestId":a["requestId"]}),
            )
            .unwrap();
    }
    let tool=r.step(&mut s,&json!({"event":"model_result","requestId":a["requestId"],"message":{"role":"assistant","stopReason":"toolUse","content":[{"type":"toolCall","name":"work","id":"a"}]}})).unwrap();
    let end = r
        .step(
            &mut s,
            &json!({"event":"tool_result","requestId":tool["requestId"],"result":{"content":[]}}),
        )
        .unwrap();
    assert_eq!(end["event"]["type"], "turn_end");
    assert_eq!(end["event"]["toolResults"].as_array().unwrap().len(), 1);
    let before = s.snapshot().unwrap();
    assert!(r
        .step(
            &mut s,
            &json!({"event":"lifecycle_ack","requestId":"stale"})
        )
        .is_err());
    assert_eq!(s.snapshot().unwrap(), before);
    r.step(&mut s,&json!({"event":"enqueue_user","queued":{"kind":"user","message":"queued","options":{"deliverAs":"steer"}}})).unwrap();
    assert!(r
        .step(
            &mut s,
            &json!({"event":"lifecycle_ack","requestId":end["requestId"]})
        )
        .is_err());
    assert_eq!(s.snapshot().unwrap(), before);
    assert_eq!(
        r.step(&mut s, &json!({"event":"pending_users"}))
            .unwrap()
            .as_array()
            .unwrap()
            .len(),
        1
    );
    assert!(r
        .step(
            &mut s,
            &json!({"event":"lifecycle_ack","requestId":end["requestId"]})
        )
        .is_err());
    let _: Value = r.step(&mut s, &json!({"event":"abandon_waiting"})).unwrap();
    drop(s);
    std::fs::remove_file(path).unwrap();
}
