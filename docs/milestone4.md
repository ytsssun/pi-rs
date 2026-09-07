# M4 bounded text read pagination

Base f67611a, same pinned Pi. Acceptance frozen before runtime integration:

- Route CLI read through offset/limit text pagination, preserving Pi all-lines/trailing-newline behavior and exact output/continuation text for tested ordinary paths; default truncation 2000 lines/50 KiB.
- Reuse the previously verified truncation implementation as a local library, retaining the standalone differential binary. Do not duplicate algorithm.
- Keep raw bounded file loading for edit separate: never edit a truncated/page view or continuation notice. Source read cap 8 MiB, raw edit cap 64 KiB; image/MIME attachments unsupported. Positive integer offsets/limits only; characterize upstream zero/negative behavior as a scope difference.
- Compare actual unchanged upstream text-read execution with fixed cases before claiming compatibility. Validate source beyond 64 KiB now pages successfully, and overlong lines provide useful fallback. Escape unsafe shell path characters in suggested fallback rather than generating executable path injection; record any deliberate formatting deviation.
- Check errors preserve session, files stay unchanged, pending/continued requests see correct pages after restart, M2/M3 regressions pass. No live inference claim.

Coordinator owns compatibility library refactor/Cargo/module dispatch/docs. coding_tools owns src/read.rs/tests/read.rs; verifier owns experiments/read-*. Cap unchanged; two workers plus coordinator. No new external service or model dependency.
