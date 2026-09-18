use pi_core::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::json;
#[test]
fn batch_budget_and_termination_retain_steering() {
    for terminate in [false, true] {
        let path = std::env::temp_dir().join(format!(
            "pi-batch-steer-{}-{terminate}.jsonl",
            std::process::id()
        ));
        let _ = std::fs::remove_file(&path);
        let mut s=PiSessionStore::create(&path,json!({"type":"session","version":3,"id":"batch","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
        let mut r = PiRuntime::default();
        let m=r.step(&mut s,&json!({"event":"begin","prompt":"initial","parallel":true,"driveStart":true,"maxActions":2})).unwrap();
        let b=r.step(&mut s,&json!({"event":"model_result","requestId":m["requestId"],"message":{"role":"assistant","stopReason":"toolUse","content":[{"type":"toolCall","id":"a","name":"work"},{"type":"toolCall","id":"b","name":"work"}]}})).unwrap();
        r.step(&mut s,&json!({"event":"enqueue_user","queued":{"kind":"user","message":"steer","options":{"deliverAs":"steer"}}})).unwrap();
        let results: Vec<_> = b["calls"]
            .as_array()
            .unwrap()
            .iter()
            .map(|call| json!({"requestId":call["requestId"],"content":[],"terminate":terminate}))
            .collect();
        let outcome = r.step(
            &mut s,
            &json!({"event":"batch_result","batchId":b["batchId"],"results":results}),
        );
        if terminate {
            assert_eq!(outcome.unwrap()["reason"], "all_tools_terminated");
        } else {
            assert!(outcome.unwrap_err().to_string().contains("action limit"));
        }
        let snap = s.snapshot().unwrap();
        let entries = snap["entries"].as_array().unwrap();
        assert_eq!(
            entries
                .iter()
                .filter(|e| e["message"]["role"] == "toolResult")
                .count(),
            2
        );
        assert_eq!(
            entries
                .iter()
                .filter(|e| e["message"]["role"] == "user")
                .count(),
            1
        );
        assert_eq!(
            r.step(&mut s, &json!({"event":"pending_users"}))
                .unwrap()
                .as_array()
                .unwrap()
                .len(),
            1
        );
        drop(s);
        std::fs::remove_file(path).unwrap();
    }
}
