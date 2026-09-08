use anyhow::{Context, Result, bail};
use reqwest::blocking::Client;
use serde_json::{json, Value};

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
    let mut request = json!({"model": model, "messages": messages, "tools": openai_tools});
    if let Some(effort) = reasoning_effort { request["reasoning_effort"] = json!(effort); }
    let response: Value = client.post(format!("{}/chat/completions", base.trim_end_matches('/')))
        .bearer_auth(key).json(&request).send()?.error_for_status()?.json()?;
    if !matches!(response["choices"][0]["finish_reason"].as_str(), Some("stop" | "tool_calls")) {
        bail!("model response incomplete or unsupported finish_reason; no tools executed");
    }
    let mut message = response["choices"][0].get("message").cloned().context("missing assistant message")?;
    if let Some(content) = message.get("content").and_then(Value::as_str) {
        message["content"] = json!([{"type":"text","text":content}]);
    }
    if let Some(calls) = message.get("tool_calls").and_then(Value::as_array).cloned() {
        message["content"] = json!(calls.into_iter().map(|call| json!({"type":"toolCall","id":call["id"],"name":call["function"]["name"],"arguments":serde_json::from_str::<Value>(call["function"]["arguments"].as_str().unwrap_or("{}" )).unwrap_or(json!({}))})).collect::<Vec<_>>());
    }
    if let Some(usage) = response.get("usage") { message.as_object_mut().context("assistant must be object")?.insert("_provider_usage".into(), usage.clone()); }
    Ok(message)
}
