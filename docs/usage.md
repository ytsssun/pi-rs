# Resource accounting

Cycle starts 2026-09-06 (local). Concurrent agent cap: 4 including coordinator.
Native subagents used: upstream research (1). Model token/cost counters are not exposed by these subagent calls; unknown, not zero. No project provider calls yet. Record provider-reported usage in persisted model responses when available.
No performance claims yet. Startup, memory, concurrency and model/tool latency require separate measurements.

M1: 3 worker agents (upstream research + continuation spike, runtime, independent verifier); maximum concurrent agents 4 including coordinator. No live project inference calls; local HTTP double responses only. Successful runtime provider usage is persisted in session. Failed/incomplete request usage is currently not captured. Coordinator/native worker token cost is unavailable through the collaboration API, not estimated. Rust toolchain and Cargo dependencies downloaded locally. No startup/RSS/throughput benchmark performed.

M2: reused runtime worker plus coding_tools and independent round2_verify; capped at four active agents including coordinator. Agent creation limit prompted reuse rather than more delegation. Three workers initially hit account usage quota and were later resumed; no reset credit consumed. Native worker token/cost counters unavailable. Local HTTP requests and fixtures are not billable provider inference measurements. Standard provider API credential presence rechecked (values not read/printed): absent. Real-model acceptance pending access. Heartbeats dispatched during outage but did not themselves prove coding progress.
