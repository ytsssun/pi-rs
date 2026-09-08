//! Bounded, thread-safe event queue used by the native streaming seam.
use serde_json::Value;
use std::collections::VecDeque;
use std::sync::{Condvar, Mutex};

#[derive(Debug, Clone, PartialEq)]
pub struct StreamEvent {
    pub value: Value,
    pub terminal: bool,
}

#[derive(Debug, PartialEq)]
pub enum PushError {
    Closed,
    Full,
    TerminalAlreadySent,
}

struct State {
    events: VecDeque<StreamEvent>,
    closed: bool,
    terminal_sent: bool,
}

/// A bounded queue. `poll` is non-blocking; `wait_poll` blocks until an event
/// is available or the queue is closed and drained.
pub struct StreamQueue {
    capacity: usize,
    state: Mutex<State>,
    wake: Condvar,
}

impl StreamQueue {
    pub fn new(capacity: usize) -> Self {
        assert!(capacity > 0, "stream queue capacity must be positive");
        Self { capacity, state: Mutex::new(State { events: VecDeque::new(), closed: false, terminal_sent: false }), wake: Condvar::new() }
    }

    pub fn push(&self, event: StreamEvent) -> Result<(), PushError> {
        let mut s = self.state.lock().unwrap();
        if s.closed { return Err(PushError::Closed); }
        if event.terminal && s.terminal_sent { return Err(PushError::TerminalAlreadySent); }
        if s.events.len() >= self.capacity { return Err(PushError::Full); }
        if event.terminal { s.terminal_sent = true; }
        s.events.push_back(event);
        self.wake.notify_one();
        Ok(())
    }

    pub fn poll(&self) -> Option<StreamEvent> {
        self.state.lock().unwrap().events.pop_front()
    }

    pub fn wait_poll(&self) -> Option<StreamEvent> {
        let mut s = self.state.lock().unwrap();
        loop {
            if let Some(e) = s.events.pop_front() { return Some(e); }
            if s.closed { return None; }
            s = self.wake.wait(s).unwrap();
        }
    }

    pub fn close(&self) {
        let mut s = self.state.lock().unwrap();
        s.closed = true;
        self.wake.notify_all();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::Arc;
    use std::thread;

    fn e(n: i64, terminal: bool) -> StreamEvent { StreamEvent { value: json!(n), terminal } }

    #[test]
    fn bounded_and_terminal_once() {
        let q = StreamQueue::new(1);
        q.push(e(1, false)).unwrap();
        assert_eq!(q.push(e(2, false)), Err(PushError::Full));
        assert_eq!(q.poll(), Some(e(1, false)));
        q.push(e(3, true)).unwrap();
        assert_eq!(q.push(e(4, true)), Err(PushError::TerminalAlreadySent));
    }

    #[test]
    fn close_unblocks_waiter_and_rejects_future_events() {
        let q = Arc::new(StreamQueue::new(2));
        let r = Arc::clone(&q);
        let t = thread::spawn(move || r.wait_poll());
        q.close();
        assert_eq!(t.join().unwrap(), None);
        assert_eq!(q.push(e(1, false)), Err(PushError::Closed));
        assert_eq!(q.poll(), None);
    }
}
