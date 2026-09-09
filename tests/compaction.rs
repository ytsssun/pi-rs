use pi_rs::pi_session_store::PiSessionStore;
use serde_json::json;
use std::fs;
#[test]
fn append_compaction_validates_and_projects() {
 let p=std::env::temp_dir().join(format!("pi-compaction-{}",std::process::id())); let _=fs::remove_file(&p);
 let mut s=PiSessionStore::create(&p,json!({"type":"session","version":3,"id":"s","cwd":"/tmp","timestamp":"2026-01-01T00:00:00Z"})).unwrap();
 s.append(json!({"type":"message","id":"m1","timestamp":"2026-01-01T00:00:00Z","message":{"role":"user","content":"x"}})).unwrap();
 let id=s.append_compaction("c1","2026-01-01T00:00:01Z","summary","m1",12).unwrap(); assert_eq!(id,"c1");
 let snap=s.snapshot().unwrap(); assert_eq!(snap["contextEntries"][0]["type"],"compaction");
 assert!(s.append_compaction("c2","t","summary","missing",1).is_err()); assert!(s.append_compaction("c3","t","summary","m1",-1).is_err()); let _=fs::remove_file(p);
}
