use anyhow::{Context, Result, bail};
use reqwest::blocking::Client;
use serde_json::{json, Value};
use std::sync::Arc;
use crate::stream_queue::{StreamEvent, StreamQueue};

/// Parse one OpenAI-compatible SSE data payload. `[DONE]` is represented as None.
pub fn parse_sse_data(data: &str) -> Result<Option<Value>> {
    let payload = data.lines().filter_map(|line| line.strip_prefix("data:")).map(str::trim_start).collect::<Vec<_>>().join("\n");
    if payload == "[DONE]" { return Ok(None); }
    if payload.is_empty() { bail!("empty SSE data payload"); }
    Ok(Some(serde_json::from_str(&payload).context("invalid SSE JSON payload")?))
}

#[derive(Default)]
pub struct SseDecoder { buffer: String }
impl SseDecoder {
    pub fn push(&mut self, chunk: &str) -> Result<Vec<Option<Value>>> {
        self.buffer.push_str(&chunk.replace("\r\n", "\n"));
        let mut out = Vec::new();
        while let Some(pos) = self.buffer.find("\n\n") {
            let event = self.buffer[..pos].to_string(); self.buffer.drain(..pos + 2);
            if event.lines().any(|l| l.starts_with("data:")) { out.push(parse_sse_data(&event)?); }
        }
        Ok(out)
    }
    pub fn finish(self) -> Result<()> { if self.buffer.trim().is_empty() { Ok(()) } else { bail!("SSE ended with incomplete event") } }
}

pub fn client() -> Result<Client> {
    Ok(Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .redirect(reqwest::redirect::Policy::none())
        .build()?)
}

/// One bounded OpenAI Chat Completions request shared by CLI and native hosts.
/// Credentials are read by the caller; this function never logs them.
pub fn openai_chat(client: &Client, base: &str, key: &str, model: &str, messages: &[Value], tools: &Value, reasoning_effort: Option<&str>) -> Result<Value> {
    let openai_tools: Vec<Value> = tools.as_array().map_or(&[][..], |v| &v[..]).iter().map(|tool| {
        if tool.get("function").is_some() { return tool.clone(); }
        json!({"type":"function","function":{"name":tool["name"],"description":tool["description"],"parameters":tool["parameters"]}})
    }).collect();
    let openai_messages: Vec<Value> = messages.iter().map(|m| {
        let role=m["role"].as_str().unwrap_or("");
        if role=="user" { let content=m["content"].as_str().map(|s|json!(s)).unwrap_or_else(||json!(m["content"].as_array().map(|a|a.iter().filter_map(|b|b["text"].as_str()).collect::<Vec<_>>().join("")))); return json!({"role":"user","content":content}); }
        if role=="toolResult" { return json!({"role":"tool","tool_call_id":m["toolCallId"],"content":m["content"].as_array().map(|a|a.iter().filter_map(|b|b["text"].as_str()).collect::<Vec<_>>().join("")).unwrap_or_default()}); }
        if role=="assistant" { let calls=m["content"].as_array().map_or(&[][..], |v| &v[..]).iter().filter(|b|b["type"]=="toolCall").map(|b|json!({"id":b["id"],"type":"function","function":{"name":b["name"],"arguments":b["arguments"].to_string()}})).collect::<Vec<_>>(); if !calls.is_empty(){return json!({"role":"assistant","content":null,"tool_calls":calls});} }
        m.clone()
    }).collect();
    let mut request = json!({"model": model, "messages": openai_messages, "tools": openai_tools});
    if let Some(effort) = reasoning_effort { request["reasoning_effort"] = json!(effort); }
    let response: Value = client.post(format!("{}/chat/completions", base.trim_end_matches('/')))
        .bearer_auth(key).json(&request).send()?.error_for_status()?.json()?;
    if !matches!(response["choices"][0]["finish_reason"].as_str(), Some("stop" | "tool_calls")) {
        bail!("model response incomplete or unsupported finish_reason; no tools executed");
    }
    let mut message = response["choices"][0].get("message").cloned().context("missing assistant message")?;
    if let Some(usage) = response.get("usage") { message.as_object_mut().context("assistant must be object")?.insert("_provider_usage".into(), usage.clone()); }
    Ok(message)
}

/// OpenAI-compatible streaming request. Each decoded SSE payload is delivered
/// in arrival order; `[DONE]` is delivered as `None` and ends the callback.
pub fn openai_chat_stream<F: FnMut(Option<Value>) -> Result<()>>(client: &Client, base: &str, key: &str, model: &str, messages: &[Value], tools: &Value, reasoning_effort: Option<&str>, mut on_event: F) -> Result<()> {
    let mut request = json!({"model": model, "messages": messages, "tools": tools, "stream": true});
    if let Some(effort) = reasoning_effort { request["reasoning_effort"] = json!(effort); }
    let mut response = client.post(format!("{}/chat/completions", base.trim_end_matches('/')))
        .bearer_auth(key).json(&request).send()?.error_for_status()?;
    let mut decoder = SseDecoder::default();
    let mut buf = [0u8; 8192];
    loop {
        let n = std::io::Read::read(&mut response, &mut buf)?;
        if n == 0 { break; }
        for event in decoder.push(std::str::from_utf8(&buf[..n]).context("stream was not UTF-8")?)? {
            let done = event.is_none(); on_event(event)?; if done { return Ok(()); }
        }
    }
    decoder.finish()
}

/// Run a streaming request and publish decoded payloads to a bounded queue.
/// The terminal `[DONE]` marker is represented by a terminal event.
pub fn openai_chat_stream_to_queue(client: &Client, base: &str, key: &str, model: &str, messages: &[Value], tools: &Value, reasoning_effort: Option<&str>, queue: Arc<StreamQueue>) -> Result<()> {
    openai_chat_stream(client, base, key, model, messages, tools, reasoning_effort, |event| {
        let terminal = event.is_none();
        queue.push(StreamEvent { value: event.unwrap_or(Value::Null), terminal })
            .map_err(|e| anyhow::anyhow!("stream queue push failed: {:?}", e))
    })
}

#[cfg(test)]
mod tests {
    use super::{parse_sse_data, SseDecoder};
    #[test]
    fn parses_multiline_data_and_done() {
        assert_eq!(parse_sse_data("event: message\ndata: {\"x\":\ndata: 1}\n\n").unwrap().unwrap()["x"], 1);
        assert!(parse_sse_data("data: [DONE]\n\n").unwrap().is_none());
        assert!(parse_sse_data("data: nope\n").is_err());
        let mut decoder = SseDecoder::default();
        assert!(decoder.push("data: {\"a\":").unwrap().is_empty());
        let events = decoder.push("1}\n\ndata: [DONE]\n\n").unwrap();
        assert_eq!(events.len(), 2); assert_eq!(events[0].as_ref().unwrap()["a"], 1); assert!(events[1].is_none());
        assert!(decoder.finish().is_ok());
        let mut crlf = SseDecoder::default(); assert_eq!(crlf.push("data: {\"ok\":true}\r\n\r\n").unwrap().len(), 1);
    }
}
