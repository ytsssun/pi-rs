//! Experimental sequential Pi state machine; native host performs emitted actions.
use crate::pi_session_store::PiSessionStore;
use anyhow::{bail, Context, Result};
use serde_json::{json, Value};
use std::collections::VecDeque;
#[derive(Default)]
pub struct PiRuntime {
    waiting: Option<(String, String)>,
    tools: VecDeque<Value>,
    active_tool: Option<Value>,
    tool_updates: Vec<Value>,
    sequence: u64,
    parallel: bool,
    batch: Option<(String, Vec<Value>)>,
}
impl PiRuntime {
    pub fn is_waiting(&self) -> bool {
        self.waiting.is_some()
    }
    /// Returns the action kind currently awaiting host completion.
    /// This is intentionally read-only so Node-API hosts can enforce event ordering.
    pub fn pending_kind(&self) -> Option<&str> {
        self.waiting.as_ref().map(|(kind, _)| kind.as_str())
    }
    fn append(store: &mut PiSessionStore, payload: Value, timestamp: &str) -> Result<Value> {
        let snapshot = store.snapshot()?;
        let entries = snapshot["entries"].as_array().unwrap();
        let mut n = entries.len();
        while entries.iter().any(|e| e["id"] == format!("rt-{n}")) {
            n += 1;
        }
        let mut entry = payload;
        entry["id"] = json!(format!("rt-{n}"));
        entry["timestamp"] = json!(timestamp);
        store.append(entry)
    }
    fn next(&mut self, store: &PiSessionStore) -> Result<Value> {
        self.sequence = self
            .sequence
            .checked_add(1)
            .context("request sequence exhausted")?;
        let id = format!(
            "{}:{}",
            store.snapshot()?["entries"].as_array().unwrap().len(),
            self.sequence
        );
        if self.parallel && self.batch.is_none() && self.tools.len() > 1 {
            let mut calls: Vec<Value> = self.tools.drain(..).collect();
            let batch_id = format!("batch-{id}");
            for call in &mut calls { self.sequence = self.sequence.checked_add(1).context("request sequence exhausted")?; call["requestId"] = json!(format!("{}:{}", store.snapshot()?["entries"].as_array().unwrap().len(), self.sequence)); }
            self.batch = Some((batch_id.clone(), calls.clone()));
            self.waiting = Some(("batch".into(), batch_id.clone()));
            return Ok(json!({"type":"tool_batch","batchId":batch_id,"calls":calls}));
        }
        if let Some(call) = self.tools.pop_front() {
            self.waiting = Some(("tool".into(), id.clone()));
            self.active_tool = Some(call.clone());
            Ok(json!({"type":"tool","requestId":id,"call":call}))
        } else {
            self.waiting = Some(("model".into(), id.clone()));
            Ok(
                json!({"type":"model","requestId":id,"contextEntries":store.snapshot()?["contextEntries"]}),
            )
        }
    }
    pub fn step(&mut self, store: &mut PiSessionStore, request: &Value) -> Result<Value> {
        let op = request["event"]
            .as_str()
            .context("runtime event required")?;
        let timestamp = request["timestamp"]
            .as_str()
            .unwrap_or("2026-01-01T00:00:00.000Z");
        if op == "policy" {
            let limit = &request["limit"];
            if !limit.is_null() && !limit.is_u64() {
                bail!("policy must be unsigned or null");
            }
            Self::append(
                store,
                json!({"type":"custom","customType":"pi-rs.context-policy.v1","data":{"toolChars":limit}}),
                timestamp,
            )?;
            return Ok(Value::Null);
        }
        if op == "project" {
            let snapshot = store.snapshot()?;
            let policy = snapshot["branch"]
                .as_array()
                .unwrap()
                .iter()
                .rev()
                .find(|e| e["type"] == "custom" && e["customType"] == "pi-rs.context-policy.v1");
            let limit = policy.and_then(|e| e["data"]["toolChars"].as_u64());
            let mut messages = request["messages"]
                .as_array()
                .context("messages array required")?
                .clone();
            if let Some(limit) = limit {
                for message in &mut messages {
                    if message["role"] != "toolResult" {
                        continue;
                    }
                    let blocks = message["content"]
                        .as_array_mut()
                        .context("tool content array required")?;
                    if blocks.len() != 1 || blocks[0]["type"] != "text" {
                        bail!("prototype projection requires one text block");
                    }
                    let text = blocks[0]["text"].as_str().context("tool text required")?;
                    if text.chars().count() as u64 > limit {
                        blocks[0]["text"] = json!(format!(
                            "{}\n[context view truncated; canonical result retained]",
                            text.chars().take(limit as usize).collect::<String>()
                        ));
                    }
                }
            }
            return Ok(json!(messages));
        }
        if op == "begin" {
            if self.waiting.is_some() {
                bail!("runtime already awaiting completion");
            }
            // Do not silently replay an unfinished persisted tool on reopen.
            let mut unresolved = vec![];
            let resolved: std::collections::HashSet<Value> = store.snapshot()?["branch"].as_array().unwrap().iter().filter(|e| e["customType"]=="pi-rs.in-flight.v1" && e["data"]["state"]=="resolved").map(|e|e["data"]["toolCallId"].clone()).collect();
            for entry in store.snapshot()?["branch"].as_array().unwrap() {
                if entry["type"]=="custom" && entry["customType"]=="pi-rs.in-flight.v1" && entry["data"]["state"]=="pending" && !resolved.contains(&entry["data"]["toolCallId"]) { unresolved.push(entry["data"]["toolCallId"].clone()); }
                if entry["type"] != "message" {
                    continue;
                }
                let message = &entry["message"];
                if message["role"] == "assistant" {
                    if message["stopReason"] == "error" || message["stopReason"] == "aborted" {
                        continue;
                    }
                    if !unresolved.is_empty() {
                        bail!("unresolved persisted tool calls");
                    }
                    if let Some(content) = message["content"].as_array() {
                        for block in content {
                            if block["type"] == "toolCall" {
                                unresolved.push(block["id"].clone());
                            }
                        }
                    }
                } else if message["role"] == "toolResult" {
                    unresolved.retain(|id| *id != message["toolCallId"]);
                }
            }
            if !unresolved.is_empty() {
                bail!("unresolved persisted tool calls; explicit recovery required");
            }
            Self::append(
                store,
                json!({"type":"message","message":{"role":"user","content":request["prompt"],"timestamp":request["messageTimestamp"].as_u64().unwrap_or(0)}}),
                timestamp,
            )?;
            self.parallel = request["parallel"].as_bool().unwrap_or(false);
            return self.next(store);
        }
        if op == "batch_result" {
            let (batch_id, calls) = self.batch.as_ref().context("no pending batch")?;
            let batch_id = batch_id.clone();
            let calls = calls.clone();
            if request["batchId"] != batch_id { bail!("stale or mismatched batch"); }
            let results = request["results"].as_array().context("results array required")?;
            if results.len() != calls.len() { bail!("batch result count mismatch"); }
            let mut by_id = std::collections::HashMap::new();
            for result in results {
                let rid = result["requestId"].as_str().context("batch result requestId required")?;
                if by_id.insert(rid.to_string(), result).is_some() { bail!("duplicate batch result requestId"); }
            }
            for call in &calls {
                let rid = call["requestId"].as_str().unwrap();
                let result = by_id.remove(rid).context("missing batch result requestId")?;
                let message = json!({"role":"toolResult","toolCallId":call["id"],"toolName":call["name"],"content":result.get("content").cloned().unwrap_or(json!([])),"details":result["details"],"isError":result["isError"].as_bool().unwrap_or(false),"timestamp":request["messageTimestamp"].as_u64().unwrap_or(0)});
                Self::append(store, json!({"type":"message","message":message}), timestamp)?;
            }
            if !by_id.is_empty() { bail!("unknown batch result requestId"); }
            self.waiting = None;
            self.batch = None;
            return self.next(store);
        }
        if op == "tool_update" {
            let call = self.active_tool.as_ref().context("no active tool")?;
            if request["requestId"] != self.waiting.as_ref().map(|(_, id)| json!(id)).unwrap_or(Value::Null) { bail!("stale or mismatched update"); }
            let update = request.get("update").cloned().context("update required")?;
            self.tool_updates.push(update);
            return Ok(json!({"type":"accepted","toolCallId":call["id"],"updateCount":self.tool_updates.len()}));
        }
        if op == "mark_in_flight" {
            let name=request["toolName"].as_str().context("toolName required")?;
            if !matches!(name,"write"|"edit"|"bash") { bail!("in-flight marker requires mutation tool"); }
            Self::append(store,json!({"type":"custom","customType":"pi-rs.in-flight.v1","data":{"requestId":request["requestId"],"toolCallId":request["toolCallId"],"toolName":name,"state":"pending"}}),timestamp)?;
            return Ok(json!({"type":"marked"}));
        }
        if op == "resolve_in_flight" {
            let tool_call_id=request["toolCallId"].as_str().context("toolCallId required")?;
            let outcome=request["outcome"].as_str().context("outcome required")?;
            Self::append(store,json!({"type":"custom","customType":"pi-rs.in-flight.v1","data":{"requestId":request["requestId"],"toolCallId":tool_call_id,"toolName":request["toolName"],"state":"resolved","outcome":outcome}}),timestamp)?;
            return Ok(json!({"type":"resolved"}));
        }
        let expected_kind = if op == "model_result" {
            "model"
        } else if op == "tool_result" {
            "tool"
        } else {
            bail!("unknown runtime event")
        };
        let expected = self.waiting.as_ref().context("no pending action")?;
        if expected.0 != expected_kind || request["requestId"] != expected.1 {
            bail!("stale or mismatched completion");
        }
        if op == "model_result" {
            let message = &request["message"];
            if message["role"] != "assistant" {
                bail!("model response must be assistant");
            }
            let mut calls: VecDeque<Value> = message["content"]
                .as_array()
                .context("assistant content required")?
                .iter()
                .filter(|b| b["type"] == "toolCall")
                .cloned()
                .collect();
            if message["stopReason"] == "error" || message["stopReason"] == "aborted" {
                calls.clear();
            }
            if message["stopReason"] == "length" {
                for call in &mut calls {
                    call["skipError"]=json!(format!("Tool call \"{}\" was not executed: the response hit the output token limit, so its arguments may be truncated. Re-issue the tool call with complete arguments.",call["name"].as_str().unwrap_or("")));
                }
            }
            for call in &calls {
                if !call["id"].is_string() || !call["name"].is_string() {
                    bail!("malformed tool call");
                }
            }
            Self::append(
                store,
                json!({"type":"message","message":message}),
                timestamp,
            )?;
            self.waiting = None;
            self.tools = calls;
            if self.tools.is_empty() {
                return Ok(json!({"type":"done","message":message}));
            }
        } else {
            let call = self.active_tool.as_ref().context("missing active tool")?;
            let result = &request["result"];
            let mut message = json!({"role":"toolResult","toolCallId":call["id"],"toolName":call["name"],"content":result.get("content").filter(|v|!v.is_null()).cloned().unwrap_or(json!([])),"details":result["details"],"isError":request["isError"].as_bool().unwrap_or(false),"timestamp":request["messageTimestamp"].as_u64().unwrap_or(0)});
            if result.get("details").is_none() {
                message.as_object_mut().unwrap().remove("details");
            }
            if let Some(usage) = result.get("usage") {
                message["usage"] = usage.clone();
            }
            if let Some(added) = result.get("addedToolNames") {
                message["addedToolNames"] = added.clone();
            }
            Self::append(
                store,
                json!({"type":"message","message":message}),
                timestamp,
            )?;
            Self::append(store,json!({"type":"custom","customType":"pi-rs.in-flight.v1","data":{"requestId":request["requestId"],"toolCallId":call["id"],"toolName":call["name"],"state":"resolved","isError":request["isError"].as_bool().unwrap_or(false)}}),timestamp)?;
            self.waiting = None;
            self.active_tool = None;
            self.tool_updates.clear();
        }
        self.next(store)
    }
}
