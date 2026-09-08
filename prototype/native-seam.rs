//! Isolated Node-API seam experiment, NOT production bindings.
//! All handles remain in the current native callback scope; no async/thread use.
use std::cell::RefCell;
use std::ffi::{c_char, c_void};
use std::ptr::{null, null_mut};
type Handle = *mut c_void;
type Callback = unsafe extern "C" fn(Handle, Handle) -> Handle;
extern "C" {
    fn napi_get_cb_info(
        e: Handle,
        i: Handle,
        n: *mut usize,
        args: *mut Handle,
        this: *mut Handle,
        data: *mut Handle,
    ) -> i32;
    fn napi_get_undefined(e: Handle, out: *mut Handle) -> i32;
    fn napi_create_function(
        e: Handle,
        name: *const c_char,
        len: usize,
        cb: Option<Callback>,
        data: Handle,
        out: *mut Handle,
    ) -> i32;
    fn napi_set_named_property(e: Handle, obj: Handle, name: *const c_char, value: Handle) -> i32;
    fn napi_get_named_property(
        e: Handle,
        obj: Handle,
        name: *const c_char,
        out: *mut Handle,
    ) -> i32;
    fn napi_call_function(
        e: Handle,
        recv: Handle,
        cb: Handle,
        argc: usize,
        args: *const Handle,
        out: *mut Handle,
    ) -> i32;
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
}
// Thread-local Rust-owned scalar state only. Not per-environment/session storage.
thread_local! { static STATE: RefCell<Vec<u16>> = const { RefCell::new(Vec::new()) }; }
unsafe fn failure(env: Handle) -> Handle {
    let mut pending = false;
    if napi_is_exception_pending(env, &mut pending) == 0 && !pending {
        napi_throw_error(env, null(), c"native seam operation failed".as_ptr());
    }
    null_mut()
}
unsafe fn args(env: Handle, info: Handle, values: &mut [Handle]) -> bool {
    let mut count = values.len();
    napi_get_cb_info(
        env,
        info,
        &mut count,
        values.as_mut_ptr(),
        null_mut(),
        null_mut(),
    ) == 0
        && count == values.len()
}
unsafe extern "C" fn get_state(env: Handle, _info: Handle) -> Handle {
    // Drop borrow before any JS callback. String creation invokes no user callback.
    let bytes = STATE.with(|s| s.borrow().clone());
    let mut result = null_mut();
    if napi_create_string_utf16(env, bytes.as_ptr(), bytes.len(), &mut result) != 0 {
        return failure(env);
    }
    result
}
unsafe extern "C" fn set_state(env: Handle, info: Handle) -> Handle {
    let mut values = [null_mut()];
    if !args(env, info, &mut values) {
        return failure(env);
    }
    let mut len = 0;
    if napi_get_value_string_utf16(env, values[0], null_mut(), 0, &mut len) != 0
        || len > 1024 * 1024
    {
        return failure(env);
    }
    let mut bytes = vec![0u16; len + 1];
    if napi_get_value_string_utf16(env, values[0], bytes.as_mut_ptr(), bytes.len(), &mut len) != 0 {
        return failure(env);
    }
    bytes.truncate(len);
    STATE.with(|s| *s.borrow_mut() = bytes);
    let mut result = null_mut();
    if napi_get_undefined(env, &mut result) != 0 {
        return failure(env);
    }
    result
}
unsafe extern "C" fn dispatch(env: Handle, info: Handle) -> Handle {
    let mut values = [null_mut(); 2];
    if !args(env, info, &mut values) {
        return failure(env);
    }
    let mut receiver = null_mut();
    if napi_get_undefined(env, &mut receiver) != 0 {
        return failure(env);
    }
    let mut result = null_mut();
    // No Rust borrow/lock survives this reentrant call. Pending JS exception is preserved.
    if napi_call_function(env, receiver, values[0], 1, &values[1], &mut result) != 0 {
        return failure(env);
    }
    result
}
unsafe extern "C" fn abort(env: Handle, info: Handle) -> Handle {
    let mut values = [null_mut(); 2];
    if !args(env, info, &mut values) {
        return failure(env);
    }
    let mut method = null_mut();
    if napi_get_named_property(env, values[0], c"abort".as_ptr(), &mut method) != 0 {
        return failure(env);
    }
    let mut result = null_mut();
    if napi_call_function(env, values[0], method, 1, &values[1], &mut result) != 0 {
        return failure(env);
    }
    result
}
#[no_mangle]
pub unsafe extern "C" fn napi_register_module_v1(env: Handle, exports: Handle) -> Handle {
    let methods: [(&std::ffi::CStr, Callback); 4] = [
        (c"getState", get_state),
        (c"setState", set_state),
        (c"dispatch", dispatch),
        (c"abort", abort),
    ];
    for (name, callback) in methods {
        let mut function = null_mut();
        if napi_create_function(
            env,
            name.as_ptr(),
            name.to_bytes().len(),
            Some(callback),
            null_mut(),
            &mut function,
        ) != 0
        {
            return failure(env);
        }
        if napi_set_named_property(env, exports, name.as_ptr(), function) != 0 {
            return failure(env);
        }
    }
    exports
}
