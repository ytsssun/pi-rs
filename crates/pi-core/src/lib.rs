//! Experimental execution state machine imported for incremental Pi integration.
//!
//! This library is not yet connected to the fork's JavaScript Agent or CLI.
//! A host supplies model/tool effects and clocks; the runtime emits actions.
pub mod pi_runtime;
pub mod pi_session_index;
pub mod pi_session_store;
