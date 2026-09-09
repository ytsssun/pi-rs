use pi_rs::provider::SseDecoder;
use serde_json::json;

#[test]
fn every_byte_boundary_preserves_unicode_and_crlf() {
    let input = "data: {\"text\":\"中文🦀\"}\r\n\r\ndata: [DONE]\r\n\r\n".as_bytes();
    for cut in 0..=input.len() {
        let mut decoder = SseDecoder::default();
        let mut events = decoder.push_bytes(&input[..cut]).unwrap();
        events.extend(decoder.push_bytes(&input[cut..]).unwrap());
        assert_eq!(events, vec![Some(json!({"text":"中文🦀"})), None], "cut {cut}");
        decoder.finish().unwrap();
    }
    let mut decoder = SseDecoder::default();
    let events: Vec<_> = input.iter().flat_map(|byte| decoder.push_bytes(&[*byte]).unwrap()).collect();
    assert_eq!(events, vec![Some(json!({"text":"中文🦀"})), None]);
    decoder.finish().unwrap();
}

#[test]
fn invalid_and_truncated_utf8_are_errors() {
    assert!(SseDecoder::default().push_bytes(&[0xff]).is_err());
    let mut decoder = SseDecoder::default();
    decoder.push_bytes(&[0xe4, 0xb8]).unwrap();
    assert!(decoder.finish().is_err());
}
