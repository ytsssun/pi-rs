use pi_rs::Session;
use serde_json::json;
#[test]
fn audit_changes_anchor_to_history_without_editing_messages() {
    let root = std::env::current_dir().unwrap();
    let mut s = Session::new(&root, "hi").unwrap();
    let original = s.messages.clone();
    assert!(s.set_context_policy(Some(2)).unwrap());
    assert!(!s.set_context_policy(Some(2)).unwrap());
    s.messages
        .push(json!({"role":"assistant","content":"done"}));
    assert!(s.set_context_policy(None).unwrap());
    assert_eq!(s.context_policy_changes.len(), 2);
    assert_eq!(s.context_policy_changes[0].after_messages, 1);
    assert_eq!(s.context_policy_changes[1].after_messages, 2);
    assert_eq!(s.messages[..1], original);
    let restored: Session = serde_json::from_str(&serde_json::to_string(&s).unwrap()).unwrap();
    restored.validate().unwrap();
    assert_eq!(
        restored.context_policy_changes[1].previous_tool_chars,
        Some(2)
    );
    assert_eq!(restored.context_policy_changes[1].tool_chars, None);
}
#[test]
fn old_sessions_get_no_invented_history_and_corruption_is_rejected() {
    let root = std::env::current_dir().unwrap();
    let mut s:Session=serde_json::from_value(json!({"version":1,"workspace":root,"messages":[{"role":"user","content":"hi"}],"context_tool_chars":4})).unwrap();
    s.validate().unwrap();
    assert!(s.context_policy_changes.is_empty());
    s.set_context_policy(None).unwrap();
    assert_eq!(s.context_policy_changes[0].previous_tool_chars, Some(4));
    s.context_policy_changes[0].after_messages = 99;
    assert!(s.validate().is_err());
    s.context_policy_changes[0].after_messages = 1;
    s.context_tool_chars = Some(8);
    assert!(s.validate().is_err());
}
