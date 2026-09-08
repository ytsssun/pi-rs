# M5 — close the live coding/resume validation cycle

Starting commit: db29a58f956447ce34e87ef05e3b3438237f27d4.

## Outcome and frozen scope

Finish the already authorized Luna retry with independent evidence and publish a
usable checkpoint. This milestone is about reaching a supported conclusion, not
sampling repeatedly until a lucky matrix passes. Preserve the original 8/9 and
all nano failures. A completed experiment with failures does not satisfy the
existing 9/9 reliability criterion.

- Resolve pilot-02 review now; a pending agent handle is not active work.
- If independently passed, execute exactly one baseline-02 matrix using the same
  binary, model gpt-5.6-luna, reasoning none, prompts, acceptance and environment.
- Independent verifier reviews actual commands/results, protected tests, external
  assertions, process IDs and canonical prefixes. Coordinator runs and integrates;
  verifier cannot steer candidates. Maximum two active agents for this work.
- Stop after two consecutive independently failed runs or transport/harness
  blocker. Record unrun cases explicitly. No baseline-03 without a new evidenced
  hypothesis and separately recorded change; no silent prompt/environment fixes.
- Retain 9/9 gate before one long-output context/resume trial. If retry fails,
  context stays unverified; report both matrices, not only the better one.
- Preserve requests, tool results, diffs, external outcomes, usage, times, failure
  classification and zero/nonzero steering. Raw private artifacts stay ignored.
- Repair checkpoint stale statements, record actual collaboration failures and
  publish sanitized results with commands. Commit and push main, no force-push.

## Next milestone selection rule

If the remaining defect is model omission of new tests, do not pretend a runtime
bug was found. Propose an explicitly versioned generic completion/verification
contract and evaluate it as a separate intervention, rather than altering frozen
acceptance or claiming improved reasoning. If an actual transport/session/tool
bug appears, fix that with its counterexample first. Provider/model binding on
resume is a known daily-use gap worth considering after this cycle closes.
Claude API-key provider is user-authorized but outside this current matrix; no
Claude key is assumed from the OpenAI-only dotenv. TUI, multiplayer, extension
integration and broad provider coverage remain deferred.

## Recovery correction

Earlier coordinator messages repeatedly sent messages to a pending_init verifier
and ended turns. Those messages did not start a working verifier or complete any
review. Replace stalled ownership with a concrete bounded review task, check its
status, and continue useful local integration work. Do not describe an idle or
pending_init worker as actively reviewing.
