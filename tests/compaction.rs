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
 assert!(s.append_compaction("c2","t","summary","missing",1).is_err()); assert!(s.append_compaction("c3","t","summary","m1",-1).is_err()); 
 s.branch(json!("m1")).unwrap();
 let before=s.snapshot().unwrap(); let disk=fs::read(&p).unwrap();
 assert!(s.append_compaction("cross","t","summary","c1",12).is_err(), "must reject first-kept entry from abandoned sibling branch");
 assert_eq!(s.snapshot().unwrap(),before); assert_eq!(fs::read(&p).unwrap(),disk);
 s.append_compaction("c4","t","new summary","m1",12).unwrap();
 let expected=s.snapshot().unwrap()["contextEntries"].clone();
 assert_eq!(expected.as_array().unwrap().iter().map(|e|e["id"].as_str().unwrap()).collect::<Vec<_>>(), vec!["c4","m1"]);
 drop(s); let reopened=PiSessionStore::open(&p).unwrap(); assert_eq!(reopened.snapshot().unwrap()["contextEntries"],expected);
 assert!(fs::read(&p).unwrap().starts_with(&disk)); let _=fs::remove_file(p);
}
