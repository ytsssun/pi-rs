//! Contract probe for the unchanged Pi TypeScript extension sidecar.
use std::io::Write;
use std::process::{Command, Stdio};

#[test]
fn protected_paths_sidecar_round_trip() {
    let script = "prototype/extension-sidecar.mjs";
    if !std::path::Path::new(script).exists() { panic!("missing {script}"); }
    let mut child = Command::new("node")
        .args(["--experimental-strip-types", script])
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped())
        .spawn().expect("node is required for sidecar contract test");
    child.stdin.take().unwrap().write_all(b"{\"id\":1,\"method\":\"tool_call\",\"params\":{\"toolName\":\"write\",\"input\":{\"path\":\".env\"}}}\n").unwrap();
    let output = child.wait_with_output().expect("sidecar exits");
    assert!(output.status.success(), "sidecar failed: {}", String::from_utf8_lossy(&output.stderr));
    let line = String::from_utf8_lossy(&output.stdout);
    let response: serde_json::Value = serde_json::from_str(line.lines().next().expect("response line")).unwrap();
    assert_eq!(response["result"]["block"], true);
    assert_eq!(response["result"]["reason"], "Path ".to_owned() + "\".env\" is protected");
}
