use pi_rs::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore};
use serde_json::json;
#[test]
fn exhausted_budget_does_not_append_unadmitted_followup() {
 let path=std::env::temp_dir().join(format!("pi-budget-admission-{}.jsonl",std::process::id()));
 let _=std::fs::remove_file(&path);
 let mut store=PiSessionStore::create(&path,json!({"type":"session","version":3,"id":"budget","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
 let mut runtime=PiRuntime::default();
 let action=runtime.step(&mut store,&json!({"event":"begin","prompt":"initial","driveStart":true,"maxActions":1})).unwrap();
 runtime.step(&mut store,&json!({"event":"model_result","requestId":action["requestId"],"message":{"role":"assistant","content":[],"stopReason":"stop"}})).unwrap();
 runtime.step(&mut store,&json!({"event":"enqueue_user","queued":{"kind":"user","message":"follow","options":{"deliverAs":"followUp"}}})).unwrap();
 let before=store.snapshot().unwrap();
 assert!(runtime.step(&mut store,&json!({"event":"advance_queued"})).is_err());
 assert_eq!(store.snapshot().unwrap(),before,"failed admission must preserve history");
 assert_eq!(runtime.step(&mut store,&json!({"event":"pending_users"})).unwrap().as_array().unwrap().len(),1);
 drop(store);let _=std::fs::remove_file(path);
}
