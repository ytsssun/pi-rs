# Upstream Pi process audit

Audited pinned Pi commit `9767ba275f3e9a5ee0f5c5342249b629ab1b2282` on 2026-09-10.

## What upstream actually does

- CI runs on pushes and pull requests to `main`, cancels superseded runs for the same ref, installs the complete npm workspace, then builds, checks and tests the monorepo.
- Action dependencies are pinned to commit SHAs rather than floating tags.
- Issue forms are short and require a concrete description and minimal reproduction. A separate contribution proposal asks what, why and (optionally) how.
- New-contributor issues and pull requests are gated by maintainer approval (`lgtmi` for issues, `lgtm` for issues and PRs). Triage workflows label stale/untriaged reports and close low-signal reports. This is a maintainer bandwidth guard, not an agent coordinator.
- AI is explicitly treated as useful for grouping and summarizing reports, but not trusted for final maintainer decisions.
- Binary publishing and model-catalog publishing are separate manual or workflow-triggered surfaces, not part of every CI run.

## What pi-rs adopts

- CI should have one clear build/check/test job with concurrency cancellation and dependency pinning where practical.
- Issues require an actionable reproduction and acceptance evidence; roadmap items require a concrete behavior and measurable test.
- GitHub remains the durable queue, while the coordinator owns assignment, independent verification and integration.
- Automated analysis may propose labels, duplicates or review comments, but a failing or passing bot result cannot replace runtime evidence.

## What pi-rs deliberately does not copy

- There is no need for upstream's anti-spam auto-close gate while this repository has one owner and an explicitly authorized coordinator.
- Do not run the full Pi monorepo build as pi-rs CI: the vendored upstream checkout is a compatibility oracle and must remain unchanged. Build the Rust crate, native seam, and selected unchanged extension tests instead.
- Do not publish binaries or model catalogs until a release process and artifact reproducibility are defined.

## Coordinator loop mapped to GitHub

1. A testing task reproduces a pinned upstream behavior and opens a bug issue with commands, versions, expected/actual output and an artifact path.
2. A worker claims the issue, implements the smallest compatible change, and adds deterministic or live verification.
3. CI runs on the branch or pull request. The coordinator independently reruns the acceptance case and reviews the diff against upstream.
4. The coordinator updates the issue with evidence, closes it only after verification, and appends the durable record to `docs/board.jsonl`.

The GitHub workflow is a gate and audit trail; the repository board remains the portable recovery record for local tasks and future orchestration systems.
