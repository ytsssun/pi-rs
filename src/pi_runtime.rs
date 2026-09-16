//! Experimental sequential Pi state machine; native host performs emitted actions.
use crate::pi_session_store::PiSessionStore;
use anyhow::{bail, Context, Result};
use serde_json::{json, Value};
use std::collections::VecDeque;
#[derive(Default)]
pub struct PiRuntime {
    waiting: Option<(String, String)>,
    user_messages: VecDeque<Value>,
    lifecycle_phase: u8,
    turn_message: Value,
    turn_results: Vec<Value>,
    end_continuation: Option<Value>,
    lifecycle_enabled: bool,
    turn_ready: bool,
    turn_index: u64,
    poll_steer: bool,
    custom_messages: VecDeque<Value>,
    terminal_failure: bool,
    steering_all: bool,
    followup_all: bool,
    tools: VecDeque<Value>,
    active_tool: Option<Value>,
    tool_updates: Vec<Value>,
    sequence: u64,
    parallel: bool,
    batch: Option<(String, Vec<Value>)>,
    action_count: u32,
    max_actions: u32,
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
    fn finish_turn(&mut self, store: &mut PiSessionStore, request: &Value, done: Option<Value>) -> Result<Value> {
        if !self.lifecycle_enabled { return match done { Some(action)=>Ok(action),None=>self.after_tools(store,request) }; }
        self.sequence += 1;
        self.lifecycle_phase = 3;
        self.end_continuation = done;
        let id = format!("lifecycle-{}-end",self.sequence);
        self.waiting = Some(("lifecycle".into(),id.clone()));
        Ok(json!({"type":"lifecycle","requestId":id,"event":{"type":"turn_end","turnIndex":self.turn_index.saturating_sub(1),"message":self.turn_message,"toolResults":self.turn_results}}))
    }
    fn after_tools(&mut self, store: &mut PiSessionStore, request: &Value) -> Result<Value> {
        if self.lifecycle_enabled && !self.turn_ready && self.tools.is_empty() { self.poll_steer = true; return self.next(store); }
        if self.tools.is_empty() && request["cancelled"] != true {
            let indices: Vec<usize> = self.user_messages.iter().enumerate()
                .filter(|(_, q)|q["options"]["deliverAs"] == "steer")
                .map(|(i,_)|i).take(if self.steering_all {usize::MAX} else {1}).collect();
            if !indices.is_empty() {
                let max = if self.max_actions == 0 {32} else {self.max_actions};
                if self.action_count >= max {bail!("bounded fixture action limit exceeded");}
                let mut contents = Vec::new();
                for &i in &indices {
                    let message = &self.user_messages[i]["message"];
                    let content = if message.is_string() {message} else {&message["content"]};
                    if !content.is_string() && !content.is_array() {bail!("Invalid queued user content");}
                    contents.push(content.clone());
                }
                for content in contents {
                    Self::append(store,json!({"type":"message","message":{"role":"user","content":content,"timestamp":request["messageTimestamp"].as_u64().unwrap_or(0)}}),request["timestamp"].as_str().unwrap_or("2026-01-01T00:00:00.000Z"))?;
                }
                for i in indices.into_iter().rev() {self.user_messages.remove(i);}
            }
        }
        self.next(store)
    }
    fn next(&mut self, store: &PiSessionStore) -> Result<Value> {
        let max = if self.max_actions == 0 {
            32
        } else {
            self.max_actions
        };
        if self.action_count >= max {
            bail!("bounded fixture action limit exceeded");
        }
        if self.lifecycle_enabled && self.tools.is_empty() && !self.turn_ready {
            self.sequence += 1;
            self.lifecycle_phase = 2;
            let id = format!("lifecycle-{}-turn",self.sequence);
            self.waiting = Some(("lifecycle".into(),id.clone()));
            return Ok(json!({"type":"lifecycle","requestId":id,"event":{"type":"turn_start","turnIndex":self.turn_index}}));
        }
        self.action_count += 1;
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
            for call in &mut calls {
                self.sequence = self
                    .sequence
                    .checked_add(1)
                    .context("request sequence exhausted")?;
                call["requestId"] = json!(format!(
                    "{}:{}",
                    store.snapshot()?["entries"].as_array().unwrap().len(),
                    self.sequence
                ));
            }
            self.batch = Some((batch_id.clone(), calls.clone()));
            self.waiting = Some(("batch".into(), batch_id.clone()));
            return Ok(json!({"type":"tool_batch","batchId":batch_id,"calls":calls}));
        }
        if let Some(call) = self.tools.pop_front() {
            self.waiting = Some(("tool".into(), id.clone()));
            self.active_tool = Some(call.clone());
            Ok(json!({"type":"tool","requestId":id,"call":call}))
        } else {
            self.turn_ready = false;
            self.turn_index += 1;
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
        if op == "lifecycle_ack" {
            let expected = self.waiting.as_ref().context("no lifecycle awaiting acknowledgement")?;
            if expected.0 != "lifecycle" || request["requestId"] != expected.1 {bail!("stale lifecycle acknowledgement");}
            self.waiting = None;
            if self.lifecycle_phase == 1 { return self.next(store); }
            if self.lifecycle_phase == 3 {
                self.lifecycle_phase = 0;
                return match self.end_continuation.take() {Some(action)=>Ok(action),None=>self.after_tools(store,request)};
            }
            self.lifecycle_phase = 0;
            self.turn_ready = true;
            return if self.poll_steer {self.after_tools(store, request)} else {self.next(store)};
        }
        if op == "abandon_waiting" {
            self.waiting = None;
            self.lifecycle_phase = 0;
            self.turn_ready = false;
            self.terminal_failure = true;
            return Ok(Value::Null);
        }
        if op == "enqueue_user" {
            let queued = request["queued"].clone();
            if queued["kind"] != "user"
                || !matches!(
                    queued["options"]["deliverAs"].as_str(),
                    Some("steer" | "followUp")
                )
            {
                bail!("user queue requires steer or followUp");
            }
            self.user_messages.push_back(queued);
            return Ok(Value::Null);
        }
        if op == "enqueue_custom" {
            let message = request["message"].clone();
            if !message["customType"].is_string()
                || !(message["content"].is_string() || message["content"].is_array())
                || !message["display"].is_boolean()
            {
                bail!("invalid nextTurn custom message");
            }
            let id = request["queueId"].clone();
            if !id.is_null() && !id.is_string() {
                bail!("queueId must be a string");
            }
            if let Some(existing) = self
                .custom_messages
                .iter()
                .find(|q| !id.is_null() && q["queueId"] == id)
            {
                if existing["message"] != message {
                    bail!("queueId payload mismatch");
                }
            } else {
                self.custom_messages
                    .push_back(json!({"queueId":id,"message":message}));
            }
            return Ok(Value::Null);
        }
        if op == "pending_custom" {
            return Ok(json!(self.custom_messages));
        }
        if op == "queue_modes" {
            for key in ["steeringMode", "followUpMode"] {
                if let Some(value) = request.get(key) {
                    if !matches!(value.as_str(), Some("all" | "one-at-a-time")) { bail!("invalid queue mode"); }
                }
            }
            if request.get("steeringMode").is_some() { self.steering_all = request["steeringMode"] == "all"; }
            if request.get("followUpMode").is_some() { self.followup_all = request["followUpMode"] == "all"; }
            return Ok(json!({"steeringMode":if self.steering_all {"all"} else {"one-at-a-time"},"followUpMode":if self.followup_all {"all"} else {"one-at-a-time"}}));
        }
        if op == "pending_users" {
            return Ok(json!(self.user_messages));
        }
        if op == "advance_queued" {
            if self.waiting.is_some() {
                bail!("runtime already awaiting completion");
            }
            if self.terminal_failure || request["cancelled"] == true {
                return Ok(json!({"type":"retained"}));
            }
            let index = self
                .user_messages
                .iter()
                .position(|q| q["options"]["deliverAs"] == "steer")
                .or_else(|| (!self.user_messages.is_empty()).then_some(0));
            let Some(index) = index else {
                return Ok(json!({"type":"empty"}));
            };
            let queued = self.user_messages[index].clone();
            let all = if queued["options"]["deliverAs"] == "steer" { self.steering_all } else { self.followup_all };
            let indices: Vec<usize> = self.user_messages.iter().enumerate().filter_map(|(i,q)|
                ((all && q["options"]["deliverAs"] == queued["options"]["deliverAs"]) || i == index).then_some(i)).collect();
            let selected: Vec<Value> = indices.iter().map(|&i|self.user_messages[i].clone()).collect();
            let mut contents = Vec::new();
            for item in &selected {
                let message = &item["message"];
                let content = if message.is_string() {message} else {&message["content"]};
                if !content.is_string() && !content.is_array() { bail!("Invalid queued user content"); }
                contents.push(content.clone());
            }
            let mut begin = request.clone();
            begin["event"] = json!("begin");
            begin["prompt"] = contents[0].clone();
            begin["additionalUsers"] = json!(&contents[1..]);
            let action = self.step(store, &begin)?;
            for i in indices.into_iter().rev() { self.user_messages.remove(i); }
            return Ok(json!({"type":"admitted","queued":queued,"queuedMessages":selected,"action":action}));
        }

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
            // Reject continuation before appending input or consuming queued messages.
            if request["driveStart"] != true
                && self.action_count >= if self.max_actions == 0 { 32 } else { self.max_actions }
            {
                bail!("bounded fixture action limit exceeded");
            }
            if self.waiting.is_some() {
                bail!("runtime already awaiting completion");
            }
            let supplied = request
                .get("nextTurnMessages")
                .cloned()
                .unwrap_or(json!([]));
            let supplied = supplied
                .as_array()
                .context("nextTurnMessages must be an array")?;
            let mut owned = self
                .custom_messages
                .iter()
                .map(|q| q["message"].clone())
                .collect::<Vec<_>>();
            owned.extend(supplied.iter().cloned());
            let queued = owned.as_slice();
            for message in queued {
                if !message["customType"].is_string()
                    || !(message["content"].is_string() || message["content"].is_array())
                    || !message["display"].is_boolean()
                {
                    bail!("invalid nextTurn custom message");
                }
            }
            // Do not silently replay an unfinished persisted tool on reopen.
            let mut unresolved = vec![];
            let resolved: std::collections::HashSet<Value> = store.snapshot()?["branch"]
                .as_array()
                .unwrap()
                .iter()
                .filter(|e| {
                    e["customType"] == "pi-rs.in-flight.v1" && e["data"]["state"] == "resolved"
                })
                .map(|e| e["data"]["toolCallId"].clone())
                .collect();
            for entry in store.snapshot()?["branch"].as_array().unwrap() {
                if entry["type"] == "custom"
                    && entry["customType"] == "pi-rs.in-flight.v1"
                    && entry["data"]["state"] == "pending"
                    && !resolved.contains(&entry["data"]["toolCallId"])
                {
                    unresolved.push(entry["data"]["toolCallId"].clone());
                }
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
            if let Some(users) = request["additionalUsers"].as_array() {
                for content in users {
                    Self::append(store,json!({"type":"message","message":{"role":"user","content":content,"timestamp":request["messageTimestamp"].as_u64().unwrap_or(0)}}),timestamp)?;
                }
            }
            for message in queued {
                Self::append(
                    store,
                    json!({"type":"custom_message","customType":message["customType"],"content":message["content"],"display":message["display"],"details":message["details"]}),
                    timestamp,
                )?;
            }
            self.custom_messages.clear();
            self.terminal_failure = false;
            if request["driveStart"] == true {
                self.action_count = 0;
            }
            if request.get("maxActions").is_some() {
                self.max_actions = request["maxActions"].as_u64().unwrap_or(32) as u32;
            }
            self.parallel = request["parallel"].as_bool().unwrap_or(false);
            if request["driveStart"] == true {
                self.lifecycle_enabled = request["lifecycle"] == true || request["initialLifecyclePrototype"] == true;
                self.turn_index = 0;
            }
            self.poll_steer = request["driveStart"] == true;
            self.turn_ready = false;
            if self.lifecycle_enabled && request["driveStart"] == true {
                self.sequence += 1;
                self.lifecycle_phase = 1;
                let id = format!("lifecycle-{}-agent",self.sequence);
                self.waiting = Some(("lifecycle".into(),id.clone()));
                return Ok(json!({"type":"lifecycle","requestId":id,"event":{"type":"agent_start"}}));
            }
            return self.next(store);
        }
        if op == "batch_result" {
            let (batch_id, calls) = self.batch.as_ref().context("no pending batch")?;
            let batch_id = batch_id.clone();
            let calls = calls.clone();
            if request["batchId"] != batch_id {
                bail!("stale or mismatched batch");
            }
            let results = request["results"]
                .as_array()
                .context("results array required")?;
            if results.len() != calls.len() {
                bail!("batch result count mismatch");
            }
            let mut by_id = std::collections::HashMap::new();
            for result in results {
                let rid = result["requestId"]
                    .as_str()
                    .context("batch result requestId required")?;
                if by_id.insert(rid.to_string(), result).is_some() {
                    bail!("duplicate batch result requestId");
                }
            }
            let all_terminate = results
                .iter()
                .all(|r| r["terminate"].as_bool().unwrap_or(false));
            for call in &calls {
                let rid = call["requestId"].as_str().unwrap();
                let result = by_id
                    .remove(rid)
                    .context("missing batch result requestId")?;
                let message = json!({"role":"toolResult","toolCallId":call["id"],"toolName":call["name"],"content":result.get("content").cloned().unwrap_or(json!([])),"details":result["details"],"isError":result["isError"].as_bool().unwrap_or(false),"timestamp":request["messageTimestamp"].as_u64().unwrap_or(0)});
                let mut message = message;
                if let Some(usage) = result.get("usage") {
                    message["usage"] = usage.clone();
                }
                Self::append(
                    store,
                    json!({"type":"message","message":message.clone()}),
                    timestamp,
                )?;
                self.turn_results.push(message);
            }
            if !by_id.is_empty() {
                bail!("unknown batch result requestId");
            }
            self.waiting = None;
            self.batch = None;
            if all_terminate {
                return self.finish_turn(store,request,Some(json!({"type":"done","reason":"all_tools_terminated"})));
            }
            return self.finish_turn(store, request, None);
        }
        if op == "tool_update" {
            let call = self.active_tool.as_ref().context("no active tool")?;
            if request["requestId"]
                != self
                    .waiting
                    .as_ref()
                    .map(|(_, id)| json!(id))
                    .unwrap_or(Value::Null)
            {
                bail!("stale or mismatched update");
            }
            let update = request.get("update").cloned().context("update required")?;
            self.tool_updates.push(update);
            return Ok(
                json!({"type":"accepted","toolCallId":call["id"],"updateCount":self.tool_updates.len()}),
            );
        }
        if op == "mark_in_flight" {
            let name = request["toolName"].as_str().context("toolName required")?;
            if !matches!(name, "write" | "edit" | "bash") {
                bail!("in-flight marker requires mutation tool");
            }
            Self::append(
                store,
                json!({"type":"custom","customType":"pi-rs.in-flight.v1","data":{"requestId":request["requestId"],"toolCallId":request["toolCallId"],"toolName":name,"state":"pending"}}),
                timestamp,
            )?;
            return Ok(json!({"type":"marked"}));
        }
        if op == "resolve_in_flight" {
            let tool_call_id = request["toolCallId"]
                .as_str()
                .context("toolCallId required")?;
            let outcome = request["outcome"].as_str().context("outcome required")?;
            Self::append(
                store,
                json!({"type":"custom","customType":"pi-rs.in-flight.v1","data":{"requestId":request["requestId"],"toolCallId":tool_call_id,"toolName":request["toolName"],"state":"resolved","outcome":outcome}}),
                timestamp,
            )?;
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
            self.turn_message = message.clone();
            self.turn_results.clear();
            self.terminal_failure =
                message["stopReason"] == "error" || message["stopReason"] == "aborted";
            self.waiting = None;
            self.tools = calls;
            if self.tools.is_empty() {
                return self.finish_turn(store,request,Some(json!({"type":"done","message":message})));
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
            self.turn_results.push(message.clone());
            Self::append(
                store,
                json!({"type":"message","message":message}),
                timestamp,
            )?;
            Self::append(
                store,
                json!({"type":"custom","customType":"pi-rs.in-flight.v1","data":{"requestId":request["requestId"],"toolCallId":call["id"],"toolName":call["name"],"state":"resolved","isError":request["isError"].as_bool().unwrap_or(false)}}),
                timestamp,
            )?;
            self.waiting = None;
            self.active_tool = None;
            self.tool_updates.clear();
        }
        if op == "tool_result" && self.tools.is_empty() { self.finish_turn(store, request, None) } else { self.next(store) }
    }
}
