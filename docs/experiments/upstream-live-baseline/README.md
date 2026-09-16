# Upstream live baseline and prompt contribution defect

Pinned upstream Pi on gpt-5.4-mini completed one workflow (2/2 stages). Native baseline on 1c1d230 failed the resumed stage by modifying protected test_maths.py. Every native request included the AGENTS restriction. Request audit found native system prompt rendered Available tools: (none) despite four tool schemas; builtin contribution plumbing was missing.

A native smoke with the initial prompt contribution patch still failed protected-file integrity (1/2 stages, 0/1 workflows). This patch was uncommitted atop 160c80e during that run; it later became 5194f0d. Do not attribute its result solely to sourceCommit. No acceptance change or manual steering.

These are not controlled causal trials: upstream uses developer role, omits reasoning_effort and adds store=false/max_completion_tokens=8192; native uses system role and explicit reasoning_effort=none. Same model ID, prompts and external acceptance do not make the requests identical. One upstream success does not establish reliability or isolate the remaining cause. Native prompt fix is independently justified by deterministic upstream builder equality; no live improvement is claimed.

Next: compare and align supported request semantics with pinned upstream, recording every parameter change, before another fixed three-repetition protocol. Raw traces stay at paths in compact summaries; auth headers/keys are not committed.
