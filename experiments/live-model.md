# Live-model cycle: frozen acceptance and current result

Starting runtime commit: `ef2b8e6a11bb54f5600e30880f19c05d5ce229ad` on `main`.
This cycle changes only validation infrastructure and records. No new TUI,
provider, multiplayer or extension implementation is included.

## Current result: blocked before first live request

Access inspection found no provider API variables, no Pi auth/models files, and
no project dotenv file. Codex auth mode is `chatgpt`; its API key field is empty.
Only credential presence/type was reported, never values. The existing runtime
uses `/chat/completions` and `OPENAI_API_KEY`; ChatGPT login tokens are not assumed
to authorize that API. Desktop login/configuration has not been changed.
The user was asked for an authorized credential file path, endpoint and model ID,
not a secret pasted into chat. No selected live model or endpoint has been frozen
because that information is unavailable.

- Live attempts: **0**; independently completed: **0**; model/task failures: **0**.
- Human-steered model attempts: **0**. One user access-configuration response is
  required before execution; that is a prerequisite, not a model success/failure.
- Nine baseline repetitions and the context trial: **not run**.
- Daily-use readiness: **not established**.
- Native coordinator/worker token counters: unavailable, not zero.

`python3 experiments/run_live.py --phase pilot --output .runs/live-access-check --model unspecified`
exited 2 with missing-credential preflight and created no run directory. This is
an environment block, not an inference request. No fallback to fixtures exists.

## Frozen acceptance

Task definitions and independent expectations: [live-acceptance.md](live-acceptance.md).

1. One bug-fix pilot must pass before the matrix. Then run bug, added behavior,
   and two-process resume from clean inputs three times each (9 runs, 12 CLI
   invocations). Pilot is separate, not one of the nine repetitions.
2. Pin endpoint, model, binary hash, acceptance hash and maximum rounds (16 per
   process). Leave context editing off throughout baseline. Model chooses all
   tool calls/arguments. Prompts are fixed before execution. No coordinator
   changes candidate files or gives corrective hints during a measured run.
3. External acceptance copies only candidate source to a fresh directory; checks
   fixed expected behavior and original test hashes. Zero process exit alone is
   insufficient. All stages must pass, original canonical messages must survive
   resume exactly, and the model must actually execute relevant tests.
4. `automated_passed` fields mean mechanical checks only. A separate verifier
   must inspect correlated bash calls and results, confirm actual relevant test
   execution and no steering, and record `independent_review` in summary.json as
   `{ "status": "passed", "reviewer": "...", "evidence": "..." }` only after
   every run/stage passes. Evidence must identify test tool-call IDs and reviewed
   artifacts. Pilot/matrix gates reject missing independent review. This is agent
   verification, not a requirement for user signoff. Never certify model prose
   or bash presence alone. Preserve failed summaries instead of editing results.
5. Once all nine are independently verified, run the long-output resume variant:
   first turn produces real long tool output with context off; second process
   uses 1024-character projection and continues the task. Verify exact projected
   content/call IDs, new policy event and unchanged full canonical prefix, plus
   external functionality. No quality/speed benefit is presumed.
6. Preserve failures. Classify provider, tool contract, session/context, model or
   environment using actual HTTP/tool/session/external-verifier evidence.
   A fix starts a new output directory and requires a fresh pilot for its binary.

## Run after access is supplied

The key file contains only the API key, read into the coordinator process; do not
source a shell file or put a key on the command line. Replace placeholders with
the user's authorized configuration. Keep desktop ChatGPT login unchanged.

```sh
export PATH="$HOME/.cargo/bin:$PATH"
cargo build --locked
python3 experiments/live_acceptance.py self-check
python3 experiments/live_transport_check.py
python3 experiments/run_live.py --phase pilot --output .runs/live-pilot-01 \
  --key-file /absolute/path/to/key --endpoint https://AUTHORIZED-HOST/v1 --model MODEL
# Independent verifier reviews pilot summary and tool evidence before next phase.
python3 experiments/run_live.py --phase baseline --output .runs/live-baseline-01 \
  --gate .runs/live-pilot-01/summary.json \
  --key-file /absolute/path/to/key --endpoint https://AUTHORIZED-HOST/v1 --model MODEL
# Independent verifier reviews every matrix stage before next phase.
python3 experiments/run_live.py --phase context --output .runs/live-context-01 \
  --gate .runs/live-baseline-01/summary.json \
  --key-file /absolute/path/to/key --endpoint https://AUTHORIZED-HOST/v1 --model MODEL
```

The relay records real upstream request/response JSON, HTTP status, usage when
provided and request duration. Each run retains fixed task commit/prompts,
runtime commit/binary hash, session snapshots, stdout/stderr, PID/exit status,
external acceptance and diffs. Usage is labeled cumulative and stage-local; absent
usage is unknown. Timing is observed wall time, not a performance comparison.
Raw artifacts stay in ignored `.runs` with restrictive creation permissions.
Publish only reviewed sanitized result summaries, never wholesale live sessions.

A per-run relay holds the real key; child environment includes only test paths,
locale, disposable HOME/TMPDIR, and an expiring loopback capability. HTTPS endpoint
validation, no redirects and a 32-request cap bound transport behavior. The relay
uses no ambient HTTP proxy. Tools still have host-user filesystem/process/network
access: this is environment minimization, **not a sandbox**. Temporary loopback
capabilities can occur in raw model output; review artifacts before sharing.
Process timeout kills the runtime process group, but tools create their own
process groups: after a timeout inspect surviving tools before continuing. The
runner never retries an uncertain effect automatically.

## Local evidence and collaboration

`cargo build --locked` passed. Acceptance self-check passed broken/reference
solutions, missing second-stage behavior, test tampering, import-time exit that
skips assertions, and long-output marker counterexamples. These are deterministic
harness checks, **zero live inference**.

One worker prepared acceptance independently while coordinator checked access
and built the recorder (2 active agents, below cap4). Coordinator's import-time
`os._exit(0)` counterexample was used by the worker to require completed-check
payloads. Worker's recorder review was used to add independent trace-review gates,
preserve exceptional failed runs, compare exact context projections/events, and
separate stage usage. No duplicate provider research or extra orchestration was
added. User intervention is needed only for currently absent authorized access.

Runner stops after two consecutive unsuccessful runs, any harness exception, or
a process timeout for inspection; unrun repetitions remain unrun, never passes.
CLI exit zero denotes automated checks only; independent completion requires the
recorded verifier review as well.
