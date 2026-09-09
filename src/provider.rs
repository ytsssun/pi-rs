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

/// Extract the incremental assistant delta from an OpenAI-compatible chunk.
/// Empty keep-alive chunks are ignored; callers aggregate text/tool fragments.
pub fn chat_delta(chunk: &Value) -> Option<&Value> {
    chunk.get("choices")?.as_array()?.first()?.get("delta")
}

/// Accumulates streamed text and tool-call argument fragments.
#[derive(Default, Debug)]
pub struct ChatDeltaAccumulator { pub text: String, pub tool_arguments: std::collections::BTreeMap<String, String> }
impl ChatDeltaAccumulator {
    pub fn push(&mut self, chunk: &Value) {
        let Some(delta) = chat_delta(chunk) else { return };
        if let Some(s) = delta.get("content").and_then(Value::as_str) { self.text.push_str(s); }
        if let Some(calls) = delta.get("tool_calls").and_then(Value::as_array) { for c in calls { let key=c.get("id").and_then(Value::as_str).unwrap_or("").to_string(); if let Some(s)=c.pointer("/function/arguments").and_then(Value::as_str) { self.tool_arguments.entry(key).or_default().push_str(s); } } }
    }
    pub fn message(&self) -> Value {
        let mut content = Vec::new(); if !self.text.is_empty() { content.push(json!({"type":"text","text":self.text})); }
        for (id,args) in &self.tool_arguments { content.push(json!({"type":"toolCall","id":id,"name":"","arguments":args})); }
        json!({"role":"assistant","content":content})
    }
}

#[derive(Default)]
pub struct SseDecoder { buffer: String, pending_bytes: Vec<u8>, after_cr: bool }

/// Aggregates OpenAI Chat Completions streaming deltas into one Pi assistant message.
#[derive(Default)]
pub struct OpenAiDeltaAggregator { text: String, tool_calls: Vec<Value> }
impl OpenAiDeltaAggregator {
    pub fn push(&mut self, event: &Value) {
        let Some(delta) = event.get("choices").and_then(|v| v.get(0)).and_then(|v| v.get("delta")) else { return };
        if let Some(s) = delta.get("content").and_then(Value::as_str) { self.text.push_str(s); }
        for call in delta.get("tool_calls").and_then(Value::as_array).into_iter().flatten() {
            let i = call.get("index").and_then(Value::as_u64).unwrap_or(self.tool_calls.len() as u64) as usize;
            while self.tool_calls.len() <= i { self.tool_calls.push(json!({"id":"","type":"function","function":{"name":"","arguments":""}})); }
            let target = &mut self.tool_calls[i];
            if let Some(v) = call.get("id").and_then(Value::as_str) { target["id"] = json!(v); }
            if let Some(v) = call.get("function").and_then(|f| f.get("name")).and_then(Value::as_str) { target["function"]["name"] = json!(v); }
            if let Some(v) = call.get("function").and_then(|f| f.get("arguments")).and_then(Value::as_str) { let old=target["function"]["arguments"].as_str().unwrap_or("").to_owned(); target["function"]["arguments"] = json!(old + v); }
        }
    }
    pub fn finish(self) -> Value { let content = if self.text.is_empty() { Value::Null } else { json!(self.text) }; let mut out=json!({"role":"assistant","content":content}); if !self.tool_calls.is_empty(){out["tool_calls"]=json!(self.tool_calls);} out }
}
impl SseDecoder {
    pub fn push(&mut self, chunk: &str) -> Result<Vec<Option<Value>>> {
        for ch in chunk.chars() {
            if ch == '\n' && self.after_cr { self.after_cr = false; continue; }
            self.after_cr = ch == '\r';
            self.buffer.push(if self.after_cr { '\n' } else { ch });
        }
        let mut out = Vec::new();
        while let Some(pos) = self.buffer.find("\n\n") {
            let event = self.buffer[..pos].to_string(); self.buffer.drain(..pos + 2);
            if event.lines().any(|l| l.starts_with("data:")) { out.push(parse_sse_data(&event)?); }
        }
        Ok(out)
    }
    pub fn push_bytes(&mut self, chunk: &[u8]) -> Result<Vec<Option<Value>>> {
        self.pending_bytes.extend_from_slice(chunk);
        let length = match std::str::from_utf8(&self.pending_bytes) {
            Ok(text) => text.len(),
            Err(error) if error.error_len().is_none() => error.valid_up_to(),
            Err(error) => return Err(error).context("stream was not UTF-8"),
        };
        let text = std::str::from_utf8(&self.pending_bytes[..length])?.to_owned();
        self.pending_bytes.drain(..length);
        self.push(&text)
    }
    pub fn finish(self) -> Result<()> {
        if !self.pending_bytes.is_empty() { bail!("SSE ended with incomplete UTF-8"); }
        if self.buffer.trim().is_empty() { Ok(()) } else { bail!("SSE ended with incomplete event") } }
}

pub fn client() -> Result<Client> {
    Ok(Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .redirect(reqwest::redirect::Policy::none())
        .build()?)
}

fn chat_request(model: &str, messages: &[Value], tools: &Value, reasoning_effort: Option<&str>) -> Value {
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
    request
}

/// One bounded OpenAI Chat Completions request shared by CLI and native hosts.
/// Credentials are read by the caller; this function never logs them.
pub fn openai_chat(client: &Client, base: &str, key: &str, model: &str, messages: &[Value], tools: &Value, reasoning_effort: Option<&str>) -> Result<Value> {
    let request = chat_request(model, messages, tools, reasoning_effort);
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
#[allow(clippy::too_many_arguments)]
pub fn openai_chat_stream<F: FnMut(Option<Value>) -> Result<()>>(client: &Client, base: &str, key: &str, model: &str, messages: &[Value], tools: &Value, reasoning_effort: Option<&str>, mut on_event: F) -> Result<()> {
    let mut request = chat_request(model, messages, tools, reasoning_effort);
    request["stream"] = json!(true);
    request["stream_options"] = json!({"include_usage": true});
    let mut response = client.post(format!("{}/chat/completions", base.trim_end_matches('/')))
        .bearer_auth(key).json(&request).send()?.error_for_status()?;
    let mut decoder = SseDecoder::default();
    let mut buf = [0u8; 8192];
    loop {
        let n = std::io::Read::read(&mut response, &mut buf)?;
        if n == 0 { break; }
        for event in decoder.push_bytes(&buf[..n])? {
            let done = event.is_none(); on_event(event)?; if done { return Ok(()); }
        }
    }
    decoder.finish()
}

/// Run a streaming request and publish decoded payloads to a bounded queue.
/// The terminal `[DONE]` marker is represented by a terminal event.
#[allow(clippy::too_many_arguments)]
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
    fn shared_request_encodes_pi_tool_continuation() {
        use serde_json::json;
        let request = super::chat_request("fixture", &[
            json!({"role":"assistant","content":[{"type":"toolCall","id":"c","name":"echo","arguments":{"text":"hello"}}]}),
            json!({"role":"toolResult","toolCallId":"c","content":[{"type":"text","text":"hello"}]})
        ], &json!([{"name":"echo","description":"Echo","parameters":{"type":"object"}}]), None);
        assert_eq!(request["tools"][0]["type"], "function");
        assert_eq!(request["messages"][0]["tool_calls"][0]["function"]["arguments"], "{\"text\":\"hello\"}");
        assert_eq!(request["messages"][1], json!({"role":"tool","tool_call_id":"c","content":"hello"}));
    }
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
