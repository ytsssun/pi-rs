//! Node-API integration experiment for the real Rust Pi session module.
//! Registry belongs to napi_env; explicit close or environment teardown drops stores.
use pi_rs::{pi_runtime::PiRuntime, pi_session_store::PiSessionStore, provider::openai_chat, stream_queue::{spawn_producer, StreamEvent, StreamQueue}};
use serde_json::{json, Value};
use std::{
    cell::RefCell,
    collections::HashMap,
    ffi::{c_char, c_void},
    path::Path,
    ptr::{null, null_mut},
    sync::atomic::{AtomicU64, Ordering},
};
type Handle = *mut c_void;
type Callback = unsafe extern "C" fn(Handle, Handle) -> Handle;
type Finalizer = unsafe extern "C" fn(Handle, Handle, Handle);
extern "C" {
    fn napi_get_cb_info(
        e: Handle,
        i: Handle,
        n: *mut usize,
        args: *mut Handle,
        this: *mut Handle,
        data: *mut Handle,
    ) -> i32;
    fn napi_create_function(
        e: Handle,
        name: *const c_char,
        len: usize,
        cb: Option<Callback>,
        data: Handle,
        out: *mut Handle,
    ) -> i32;
    fn napi_set_named_property(e: Handle, obj: Handle, name: *const c_char, value: Handle) -> i32;
    fn napi_create_string_utf16(e: Handle, data: *const u16, len: usize, out: *mut Handle) -> i32;
    fn napi_get_value_string_utf16(
        e: Handle,
        value: Handle,
        out: *mut u16,
        len: usize,
        written: *mut usize,
    ) -> i32;
    fn napi_is_exception_pending(e: Handle, pending: *mut bool) -> i32;
    fn napi_throw_error(e: Handle, code: *const c_char, message: *const c_char) -> i32;
    fn napi_set_instance_data(
        e: Handle,
        data: Handle,
        finalize: Option<Finalizer>,
        hint: Handle,
    ) -> i32;
    fn napi_get_instance_data(e: Handle, data: *mut Handle) -> i32;
}
static NEXT_ENV: AtomicU64 = AtomicU64::new(1);
static ENV_DROPS: AtomicU64 = AtomicU64::new(0);
static ABANDONED_DROPS: AtomicU64 = AtomicU64::new(0);
struct NativeSession {
    store: PiSessionStore,
    runtime: PiRuntime,
}
struct Registry {
    prefix: u64,
    next: u64,
    stores: HashMap<String, NativeSession>,
    queues: HashMap<String, std::sync::Arc<StreamQueue>>,
    producers: HashMap<String, std::thread::JoinHandle<Result<(), pi_rs::stream_queue::ProducerError>>>,
}
impl Drop for Registry {
    fn drop(&mut self) {
        ENV_DROPS.fetch_add(1, Ordering::Relaxed);
        ABANDONED_DROPS.fetch_add(self.stores.len() as u64, Ordering::Relaxed);
    }
}
impl Registry {
    fn request(&mut self, r: Value) -> Result<Value, String> {
        let result = (|| -> Result<Value, String> {
            match r["op"].as_str().unwrap_or("") {
                "provider_chat" => {
                    let key = std::env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY missing".to_string())?;
                    let base = r["base_url"].as_str().map(str::to_string).or_else(|| std::env::var("OPENAI_BASE_URL").ok()).unwrap_or_else(|| "https://api.openai.com/v1".into());
                    let model = r["model"].as_str().ok_or("model required")?;
                    openai_chat(&pi_rs::provider::client().map_err(|e| e.to_string())?, &base, &key, model, r["messages"].as_array().ok_or("messages required")?, &r["tools"], r["reasoning_effort"].as_str()).map_err(|e| e.to_string())
                }
                "create" | "open" => {
                    let path = Path::new(r["path"].as_str().ok_or("path required")?);
                    let store = if r["op"] == "create" {
                        PiSessionStore::create(path, r["header"].clone())
                    } else {
                        PiSessionStore::open(path)
                    }
                    .map_err(|e| e.to_string())?;
                    self.next = self.next.checked_add(1).ok_or("session handle exhausted")?;
                    let handle = format!("{}:{}", self.prefix, self.next);
                    self.stores.insert(
                        handle.clone(),
                        NativeSession {
                            store,
                            runtime: PiRuntime::default(),
                        },
                    );
                    Ok(json!(handle))
                }
                "count" => Ok(json!(self.stores.len())),
                "queue_create" => {
                    let capacity = r["capacity"].as_u64().ok_or("capacity required")? as usize;
                    if capacity == 0 { return Err("capacity must be positive".into()); }
                    self.next = self.next.checked_add(1).ok_or("queue handle exhausted")?;
                    let handle = format!("{}:q{}", self.prefix, self.next);
                    self.queues.insert(handle.clone(), std::sync::Arc::new(StreamQueue::new(capacity)));
                    Ok(json!(handle))
                }
                "stream_fixture_start" => {
                    let capacity = r["capacity"].as_u64().unwrap_or(8) as usize;
                    let q = std::sync::Arc::new(StreamQueue::new(capacity));
                    self.next = self.next.checked_add(1).ok_or("stream handle exhausted")?;
                    let handle = format!("{}:s{}", self.prefix, self.next);
                    let events = r["events"].as_array().ok_or("events required")?.iter().map(|e| StreamEvent { value: e["value"].clone(), terminal: e["terminal"].as_bool().unwrap_or(false) }).collect::<Vec<_>>();
                    self.producers.insert(handle.clone(), spawn_producer(std::sync::Arc::clone(&q), events));
                    self.queues.insert(handle.clone(), q);
                    Ok(json!(handle))
                }
                "provider_stream_start" => {
                    let key = std::env::var("OPENAI_API_KEY").map_err(|_| "OPENAI_API_KEY missing".to_string())?;
                    let base = r["base_url"].as_str().map(str::to_string).or_else(|| std::env::var("OPENAI_BASE_URL").ok()).unwrap_or_else(|| "https://api.openai.com/v1".into());
                    let model = r["model"].as_str().ok_or("model required")?.to_string();
                    let messages = r["messages"].as_array().ok_or("messages required")?.to_vec();
                    let tools = r["tools"].clone();
                    let effort = r["reasoning_effort"].as_str().map(str::to_string);
                    let q = std::sync::Arc::new(StreamQueue::new(r["capacity"].as_u64().unwrap_or(32) as usize));
                    self.next = self.next.checked_add(1).ok_or("stream handle exhausted")?;
                    let handle = format!("{}:s{}", self.prefix, self.next);
                    let worker_q = std::sync::Arc::clone(&q);
                    let producer = std::thread::spawn(move || {
                        let result = pi_rs::provider::client().and_then(|c| pi_rs::provider::openai_chat_stream_to_queue(&c, &base, &key, &model, &messages, &tools, effort.as_deref(), worker_q.clone()));
                        if let Err(e) = result { let _ = worker_q.push(StreamEvent { value: json!({"type":"error","message":e.to_string()}), terminal:true }); }
                        Ok(())
                    });
                    self.producers.insert(handle.clone(), producer);
                    self.queues.insert(handle.clone(), q);
                    Ok(json!(handle))
                }
                "stream_status" => {
                    let handle = r["handle"].as_str().ok_or("handle required")?;
                    let producer = self.producers.get(handle).ok_or("unknown stream")?;
                    Ok(json!({"finished": producer.is_finished()}))
                }
                "queue_push" => {
                    let handle = r["handle"].as_str().ok_or("handle required")?;
                    let q = self.queues.get(handle).ok_or("unknown queue")?;
                    q.push(StreamEvent { value: r["event"].clone(), terminal: r["terminal"].as_bool().unwrap_or(false) }).map_err(|e| format!("push: {:?}", e))?;
                    Ok(Value::Null)
                }
                "queue_push_batch" => {
                    let handle = r["handle"].as_str().ok_or("handle required")?;
                    let q = self.queues.get(handle).ok_or("unknown queue")?;
                    for item in r["events"].as_array().ok_or("events required")? {
                        q.push(StreamEvent { value: item["value"].clone(), terminal: item["terminal"].as_bool().unwrap_or(false) })
                            .map_err(|e| format!("push: {:?}", e))?;
                    }
                    Ok(Value::Null)
                }
                "queue_poll" => {
                    let handle = r["handle"].as_str().ok_or("handle required")?;
                    let q = self.queues.get(handle).ok_or("unknown queue")?;
                    let event = if r["wait"].as_bool().unwrap_or(false) { q.wait_poll() } else { q.poll() };
                    Ok(event.map(|e| json!({"value":e.value,"terminal":e.terminal})).unwrap_or(Value::Null))
                }
                "queue_close" => {
                    let handle = r["handle"].as_str().ok_or("handle required")?;
                    let q = self.queues.remove(handle).ok_or("unknown queue")?;
                    q.close();
                    Ok(Value::Null)
                }
                "diagnostics" => Ok(
                    json!({"finalizedEnvironments":ENV_DROPS.load(Ordering::Relaxed),"abandonedStoresDropped":ABANDONED_DROPS.load(Ordering::Relaxed)}),
                ),
                op => {
                    let handle = r["handle"].as_str().ok_or("handle required")?;
                    if op == "close" {
                        return self
                            .stores
                            .remove(handle)
                            .map(|_| Value::Null)
                            .ok_or("unknown or closed session".into());
                    }
                    let store = self
                        .stores
                        .get_mut(handle)
                        .ok_or("unknown or closed session")?;
                    if store.runtime.is_waiting()
                        && (op == "branch" || (op == "append" && r["entry"]["type"] == "message"))
                    {
                        return Err("runtime pending; branch or external message mutation requires explicit coordination".into());
                    }
                    match op {
                        "runtime" => store
                            .runtime
                            .step(&mut store.store, &r)
                            .map_err(|e| e.to_string()),
                        "snapshot" => store.store.snapshot().map_err(|e| e.to_string()),
                        "append" => store
                            .store
                            .append(r["entry"].clone())
                            .map_err(|e| e.to_string()),
                        "append_compaction" => store.store.append_compaction(
                            r["id"].as_str().ok_or("id required")?,
                            r["timestamp"].as_str().ok_or("timestamp required")?,
                            r["summary"].as_str().ok_or("summary required")?,
                            r["firstKeptEntryId"].as_str().ok_or("firstKeptEntryId required")?,
                            r["tokensBefore"].as_i64().ok_or("tokensBefore required")?,
                        ).map_err(|e| e.to_string()),
                        "branch" => store
                            .store
                            .branch(r["leaf"].clone())
                            .map(|_| Value::Null)
                            .map_err(|e| e.to_string()),
                        _ => Err("unknown operation".into()),
                    }
                }
            }
        })();
        result
    }
}
unsafe fn failure(env: Handle) -> Handle {
    let mut pending = false;
    if napi_is_exception_pending(env, &mut pending) == 0 && !pending {
        napi_throw_error(env, null(), c"native session binding failed".as_ptr());
    }
    null_mut()
}
unsafe extern "C" fn cleanup(_env: Handle, data: Handle, _hint: Handle) {
    if !data.is_null() {
        drop(Box::from_raw(data.cast::<RefCell<Registry>>()));
    }
}
unsafe extern "C" fn request(env: Handle, info: Handle) -> Handle {
    let mut argc = 1;
    let mut argument = null_mut();
    if napi_get_cb_info(env, info, &mut argc, &mut argument, null_mut(), null_mut()) != 0
        || argc != 1
    {
        return failure(env);
    }
    let mut len = 0;
    if napi_get_value_string_utf16(env, argument, null_mut(), 0, &mut len) != 0
        || len > 16 * 1024 * 1024
    {
        return failure(env);
    }
    let mut data = vec![0u16; len + 1];
    if napi_get_value_string_utf16(env, argument, data.as_mut_ptr(), data.len(), &mut len) != 0 {
        return failure(env);
    }
    data.truncate(len);
    let input = match String::from_utf16(&data) {
        Ok(s) => s,
        Err(_) => return failure(env),
    };
    let mut registry = null_mut();
    if napi_get_instance_data(env, &mut registry) != 0 || registry.is_null() {
        return failure(env);
    }
    // Only Rust operations under the borrow; all JS value creation happens afterward.
    let response = {
        let state = &*registry.cast::<RefCell<Registry>>();
        let result = match serde_json::from_str(&input) {
            Ok(value) => match state.try_borrow_mut() {
                Ok(mut s) => s.request(value),
                Err(_) => Err("native session busy".into()),
            },
            Err(e) => Err(e.to_string()),
        };
        match result {
            Ok(value) => json!({"result":value}),
            Err(error) => json!({"error":error}),
        }
    };
    let output: Vec<u16> = response.to_string().encode_utf16().collect();
    let mut value = null_mut();
    if napi_create_string_utf16(env, output.as_ptr(), output.len(), &mut value) != 0 {
        return failure(env);
    }
    value
}
#[no_mangle]
pub unsafe extern "C" fn napi_register_module_v1(env: Handle, exports: Handle) -> Handle {
    let mut existing = null_mut();
    if napi_get_instance_data(env, &mut existing) != 0 || !existing.is_null() {
        return failure(env);
    }
    let prefix =
        match NEXT_ENV.fetch_update(Ordering::Relaxed, Ordering::Relaxed, |n| n.checked_add(1)) {
            Ok(n) => n,
            Err(_) => return failure(env),
        };
    let state = Box::into_raw(Box::new(RefCell::new(Registry {
        prefix,
        next: 0,
        stores: HashMap::new(),
        queues: HashMap::new(),
        producers: HashMap::new(),
    })))
    .cast();
    if napi_set_instance_data(env, state, Some(cleanup), null_mut()) != 0 {
        cleanup(env, state, null_mut());
        return failure(env);
    }
    let mut function = null_mut();
    if napi_create_function(
        env,
        c"request".as_ptr(),
        7,
        Some(request),
        null_mut(),
        &mut function,
    ) != 0
    {
        return failure(env);
    }
    if napi_set_named_property(env, exports, c"request".as_ptr(), function) != 0 {
        return failure(env);
    }
    exports
}
