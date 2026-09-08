# Resource accounting

Cycle starts 2026-09-06 (local). Concurrent agent cap: 4 including coordinator.
Native agent token/cost counters remain unavailable. Actual live OpenAI usage is recorded in experiments/live-openai-results.json; M5 retry accounting is exported from response records by experiments/summarize_live.py. Missing/incomplete response usage is unknown.

## Historical cycle entries

The entries below describe their own time, including the former access blocker; they do not mean that no live calls exist now.
No performance claims yet. Startup, memory, concurrency and model/tool latency require separate measurements.

M1: 3 worker agents (upstream research + continuation spike, runtime, independent verifier); maximum concurrent agents 4 including coordinator. No live project inference calls; local HTTP double responses only. Successful runtime provider usage is persisted in session. Failed/incomplete request usage is currently not captured. Coordinator/native worker token cost is unavailable through the collaboration API, not estimated. Rust toolchain and Cargo dependencies downloaded locally. No startup/RSS/throughput benchmark performed.

M2: reused runtime worker plus coding_tools and independent round2_verify; capped at four active agents including coordinator. Agent creation limit prompted reuse rather than more delegation. Three workers initially hit account usage quota and were later resumed; no reset credit consumed. Native worker token/cost counters unavailable. Local HTTP requests and fixtures are not billable provider inference measurements. Standard provider API credential presence rechecked (values not read/printed): absent. Real-model acceptance pending access. Heartbeats dispatched during outage but did not themselves prove coding progress.

Final M2 clean candidate verification was interrupted once more by account quota before checkout; resumed existing verifier after user resume and later wakeup. No extra implementation workers spawned. Actual clean-build/test results are recorded separately from prior interrupted attempts.

M3: coordinator plus two reused workers; no new worker handles. Another verifier quota interruption occurred; partial original/adversarial artifacts preserved and resumed after external reset. No usage resets, no live inference calls, native token/cost counters unavailable. Direct dependency unicode-normalization added; unrelated lockfile rustls update reverted before integration.

Live-model cycle from ef2b8e6: coordinator plus one independent acceptance/review worker (2 concurrent total). No actual inference requests; provider tokens/cost not applicable because access blocked. Native agent token counters unavailable. Local relay test used fake upstream responses, not a paid provider. No usage reset or desktop auth change.

## M5 closeout

Coordinator plus one newly active replacement verifier (2 active, cap4); previous pending_init review never produced work. Pilot02:5 actual HTTP responses,3242 reported total tokens. Existing artifacts reused, no pilot rerun needed. No native usage counters or capacity-reset actions. Final matrix usage is exported without summing cumulative session vectors.

Final retry matrix: 64 responses with usage, 61719 input tokens and 5538 completion tokens (provider-reported, no invoice claim). 7/9 independent successes,2 failed tasks. Export: experiments/live-retry-results.json. No missing response usage in this matrix.

Architecture cycle2: coordinator plus1 worker, at most2 active (cap4). npm ci installed320 pinned dependencies with scripts disabled; public catalog hydration required actual loader imports. No credentials or live project-model calls. Native agent usage unavailable. Positive and negative deterministic probes independently rerun. No performance claims.

### Callback reentry architecture cycle

Coordinator plus one independent source/runtime reviewer (cap4,2used). Reviewer
finding about registered-tool activation metadata changed coordinator experiment
before final verification. No user intervention, new dependencies, model calls or
API spend. Agent token usage unavailable; build/probe command duration is not an
agent-performance benchmark. Next work derives from uncovered callback semantics,
not another repeat of successful activation cases.

### Async tool boundary cycle (starting dc3393c)

Two active agents, cap4. Independent reviewer produced executable upstream-derived
acceptance reused directly by coordinator; discovered undefined rejection and
pending-peer failure mismatches, both fixed and independently rerun. No user
intervention or redundant acceptance implementation. No new dependencies, live
model calls or credentials. Native agent token accounting unavailable. Host
execution times are not performance measurements or end-to-end speed claims.

### Native seam comparison (starting68f5369)

Coordinator+one independent reviewer,2active against cap4. Reviewer proposed actual
Text/Theme case and found lone-surrogate loss plus UTF16 FFI declaration mismatch;
coordinator used those findings and fixed both. No user intervention, model calls,
credentials or dependencies added. Node docs/public local headers inspected. Agent
token usage unavailable. Native build/probe timings are not performance evidence.

### Real Pi session seam (startingc90c0e4)

Coordinator+independent reviewer,2active/cap4. Source reviewer established branch
persistence and delayed first flush obligations; coordinator experiment already
uses durable branch child, reviewer independently reproduced counterexamples and
ran combined tests. No new dependencies, user intervention, live model calls or
credentials. Agent usage unavailable; no benchmark claims.

### Rust Pi read index (starting63c7e79)

Coordinator+independent fixture/review worker,2active cap4. Worker-owned upstream
oracle consumed unchanged; added empty-ID counterexample changed implementation.
Coordinator tested unchanged Todo with Rust branch reader. No user intervention,
new dependencies, live model calls or credentials. Agent usage unavailable. No
performance claims; existing cargo tests are local/fixture tests, not live-model E2E.

### Rust Pi writer (starting6e6a674)

Coordinator+independent writer oracle/reviewer,2active cap4. Worker acceptance
reused unchanged; seventh failure case found upstream memory-before-persist
semantics, changed implementation and independently passed. No user intervention,
credentials/model calls or new dependencies. Agent token counts unavailable. Cargo
suite uses fixtures/local tools; no benchmark/full reliability claims.

### Native session integration (starting123dc3f)

Coordinator+independent native reviewer,2active cap4. Reused frozen writer7 and
Todo acceptance unchanged except selecting transport; reviewer added reusable
lifecycle checks. Registration overwrite hazard addressed before integration.
No user intervention/dependencies/model calls/keys. Usage unavailable; no timing,
RSS, crash isolation or allocator-leak claims. Bounded lifecycle allocation is
64sessions, not a new runtime maximum imposed on compatibility.

### Architecture decision and UI method lifecycle (starting0788e3b)

Coordinator+independent architecture/UI reviewer,2active cap4. Reviewer confirmed
native direction and identified integrated scheduler as decisive remaining work.
Both executed original UI lifecycle positive and negative; harness padding error
preserved/corrected. No user intervention, new dependencies, keys or model calls.
Agent token usage unavailable. No performance/whole-TUI compatibility claims.
