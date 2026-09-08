# Claude authentication: supported route versus Pi behavior

Checked 2026-09-08 UTC. Research only: no Claude credentials read, login started,
token exchanged, or inference attempted. pi-rs starting commit:
`2b5d52f89a8a9d95806b3398350a85d144f7dd19`.

## Current conclusion

**Verified documentation/source finding, not live compatibility:** Pi contains a
Claude subscription OAuth implementation. That does not establish authorization
for a pi-rs implementation to reuse that flow or identify itself as Claude Code.
The documented straightforward route for a separately implemented coding agent
is a Claude Console API key or supported cloud provider.

Anthropic's current legal page says developers should use API keys/cloud
providers, disallows offering Claude.ai login in their own applications, and
disallows collecting/storing/intermediating Claude.ai credentials. It separately
permits the end user to sign into an **unmodified Claude Code binary**. Running
that binary would test Claude Code's agent loop, not prove pi-rs's native loop.
[Source: Authentication and credential use](https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use).

There is nuance: the current help page says Anthropic may allow certain
third-party tools for paid users with usage credits, and may charge credits
instead of subscription limits. It prohibits identity misrepresentation. No
evidence found establishes pi-rs as such an allowed tool, or provides its own
registered OAuth client. This is an access/permission unknown, not a claim that
all conceivable third-party OAuth is forbidden forever.
[Source: Authenticating to subscription plans and Developers](https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account).

## What the pinned Pi code actually does

Reference: `badlogic/pi-mono` at
`9767ba275f3e9a5ee0f5c5342249b629ab1b2282`.

- Authorization-code/PKCE flow, loopback callback, state checking, access/refresh
  token storage and refresh with an expiry margin. It embeds a client identifier
  and requests subscription inference/session scopes.
  [Source: auth/oauth/anthropic.ts](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/ai/src/auth/oauth/anthropic.ts).
- OAuth inference uses a Claude CLI User-Agent, Claude Code beta features,
  normalized tool names, and a system identity claiming the official Claude CLI.
  This is an architectural compatibility detail, **not a recommended pi-rs
  implementation or proof of provider permission**.
  [Source: api/anthropic-messages.ts](https://github.com/badlogic/pi-mono/blob/9767ba275f3e9a5ee0f5c5342249b629ab1b2282/packages/ai/src/api/anthropic-messages.ts#L931).

Local reproduction (no network/auth requests):

```sh
git -C vendor/pi-mono rev-parse HEAD
sed -n '1,45p' vendor/pi-mono/packages/ai/src/auth/oauth/anthropic.ts
sed -n '931,952p' vendor/pi-mono/packages/ai/src/api/anthropic-messages.ts
sed -n '1060,1080p' vendor/pi-mono/packages/ai/src/api/anthropic-messages.ts
```

## Minimum next implementation, proposed

1. Keep native provider transport separate from credential resolution. Anthropic
   Messages needs its own request/tool-result/usage mapping; an OpenAI endpoint
   option alone does not implement that protocol.
2. First implement/test Console API-key authentication for that transport. Keep
   credentials outside canonical sessions, logs, model context, and bash env.
3. If OAuth is required, use an explicitly supported identity route. Anthropic
   documents Workload Identity Federation: an IdP JWT is exchanged for a
   short-lived Claude API access token. Setup requires a Console service account,
   federation issuer, and rule. This is workload OAuth, not a Claude Pro/Max
   browser subscription login, and no such configuration has been verified here.
   [Source: Workload Identity Federation](https://platform.claude.com/docs/en/manage-claude/authentication#workload-identity-federation).
4. A future authorized OAuth adapter needs expiry/refresh handling, atomic secret
   persistence, cancellation, redacted errors, and provider identity preserved
   through resume. Implement only after the actual allowed flow is identified;
   do not create a speculative login claiming Claude Code identity.

**Blocked portion:** user-requested direct Claude subscription OAuth in pi-rs
has no verified authorized flow/client. No provider implementation or auth
configuration was changed by this research. API-key Claude testing remains a
separate implementable path, subject to available authorized credentials.

## Evidence limits

Official pages were opened directly after search on the checked date. Search
snippets can be older than opened pages; the help-page usage-credit exception is
retained rather than silently simplified into a blanket prohibition. These
findings can be superseded by a documented pi-rs OAuth registration/permission or
new official guidance. No Claude live outcome is claimed.
