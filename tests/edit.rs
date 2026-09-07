use pi_rs::edit::{apply_exact, execute};
use serde_json::json;
fn args(edits: serde_json::Value) -> String {
    json!({"path":"a.txt","edits":edits}).to_string()
}
#[test]
fn original_offsets_do_not_cascade() {
    let a = args(json!([{"oldText":"one","newText":"two"},{"oldText":"two","newText":"three"}]));
    assert_eq!(apply_exact("one two", &a).unwrap(), "two three");
}
#[test]
fn rejects_duplicate_overlap_empty_nochange_and_missing() {
    for (source, edits) in [
        ("x x", json!([{"oldText":"x","newText":"y"}])),
        (
            "abc",
            json!([{"oldText":"ab","newText":"x"},{"oldText":"bc","newText":"y"}]),
        ),
        ("x", json!([{"oldText":"","newText":"y"}])),
        ("x", json!([{"oldText":"x","newText":"x"}])),
        ("x", json!([])),
        ("x", json!([{"oldText":"z","newText":"y"}])),
    ] {
        assert!(apply_exact(source, &args(edits)).is_err());
    }
}
#[test]
fn bom_crlf_and_utf8() {
    assert_eq!(
        apply_exact(
            "\u{feff}你好\r\n世界\r\n",
            &args(json!([{"oldText":"你好\n世界","newText":"hello\n🌍"}]))
        )
        .unwrap(),
        "\u{feff}hello\r\n🌍\r\n"
    );
    assert_eq!(
        apply_exact("a\nb\r\n", &args(json!([{"oldText":"a","newText":"A"}]))).unwrap(),
        "A\nb\n"
    );
}
#[test]
fn failed_batch_leaves_file_unchanged() {
    let dir = std::env::temp_dir().join(format!("pi-edit-test-{}", std::process::id()));
    std::fs::create_dir(&dir).unwrap();
    std::fs::write(dir.join("a.txt"), "one two").unwrap();
    let bad =
        args(json!([{"oldText":"one","newText":"ONE"},{"oldText":"missing","newText":"oops"}]));
    assert!(execute(&dir, &bad).is_err());
    assert_eq!(
        std::fs::read_to_string(dir.join("a.txt")).unwrap(),
        "one two"
    );
    execute(&dir, &args(json!([{"oldText":"one","newText":"ONE"}]))).unwrap();
    assert_eq!(
        std::fs::read_to_string(dir.join("a.txt")).unwrap(),
        "ONE two"
    );
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn rejects_fuzzy_ambiguity_but_not_fuzzy_replacement() {
    assert!(apply_exact(
        "'hi' and ‘hi’",
        &args(json!([{"oldText":"'hi'","newText":"hello"}]))
    )
    .is_err());
    assert!(apply_exact("Ａ and A", &args(json!([{"oldText":"A","newText":"B"}]))).is_err());
    assert!(apply_exact("‘hi’", &args(json!([{"oldText":"'hi'","newText":"hello"}]))).is_err());
}

#[test]
fn whitespace_only_ambiguity_matches_upstream() {
    // Pi counts fuzzy-normalized occurrences even for exact matches. Both
    // strings normalize to empty here, so it replaces the first exact match
    // despite two raw occurrences. Do not impose an extra exact-count check.
    assert_eq!(
        apply_exact("  ", &args(json!([{"oldText":" ","newText":"x"}]))).unwrap(),
        "x "
    );
}
