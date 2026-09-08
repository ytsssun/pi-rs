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
    let mut request = json!({"model": model, "messages": messages, "tools": tools});
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
