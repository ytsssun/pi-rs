# M2 acceptance — coding, test, resume

Frozen 2026-09-06 before M2 integration. Base: 00766dc46b5beb81eae85f9b48512fdcf7c83dc6. Work branch: work/coding-loop; no merge to main or force push.

Why: independent clean-checkout baseline confirms read/tool round-trip but cannot change a repository, execute its tests, or accept a new user turn after resuming. Prior H001 priority of extension integration is superseded by this user-visible blocker; extension and Pi session interoperability remain tracked, not abandoned.

## Required deterministic acceptance

1. A fresh small repository contains an intentional defect and a runnable test. Through the Rust CLI, a fixture or local HTTP model double requests actual tool operations: test fails, write changes code, test passes. Verify file bytes and process results, not final model text.
2. Exit the CLI. A separate process uses `--resume --input TEXT` to continue the same session, changes or tests the repository again, and succeeds. Previous user/assistant/tool history stays present with valid call/result pairing.
3. Mutating tools (`write`, `bash`) require explicit invocation flag `--allow-mutations`; without it, a fabricated model call cannot execute them. Bash is host-authority execution, not a workspace sandbox.
4. Persist intent before a mutating effect. An interrupted effect with no durable result is uncertain; resume must not automatically repeat it. Provide explicit resolution with an observed outcome. Test no duplicate effect on normal resume and refusal on an uncertain checkpoint.
5. Bash failure/timeout yields a correlated error with bounded output; normal background descendants cannot make the CLI wait indefinitely. Malformed input, path escape in file tools and corrupt session cannot silently overwrite existing work.
6. Persist the context projection policy across resume; canonical history remains intact. Continue M1 regression tests. Report each compatibility profile separately; Pi-shaped write/bash arguments do not imply exact Pi tools or session compatibility.
7. Verify the integration from a clean checkout; record commands, outputs, limitations, commit identity. Scan the proposed tracked changes for secrets/internal/unrelated artifacts, then push the work branch without merging main.

## Separate real-model acceptance

A real provider must independently choose tools to fix and test the small repository and continue a follow-up. Only an actually executed provider request qualifies. Lack of available credentials does not waive this criterion: report it as unverified/blocked, retain the working deterministic milestone, and do not claim daily-driver or real coding success. Do not equate fixture final text with model intelligence.

## Ownership

Coordinator: docs, board, README, integration. runtime worker: src/lib.rs, src/main.rs, tests/session2.rs. coding_tools worker: src/tools.rs, tests/coding_tools.rs. Independent verifier: experiments/round2*. Max simultaneous agents 4 total. Previous worker quota failures interrupted delivery; inspect partial files rather than discarding or declaring them done. No new orchestration platform.
