# LaunchDarkly Onboarding Log

## Checklist

| Step | Status |
|------|--------|
| 0 — Onboarding log | done |
| 1 — Explore project | done |
| 2 — Detect agent | done |
| 3 — Install companion skills | done |
| 4 — Configure MCP | in progress |
| 5 — Install and initialize SDK | not started |
| 6 — Create first feature flag | not started |

## Context

- **Coding agent:** cursor
- **Language / framework:** TypeScript, Next.js 16 (App Router), React 19, Prisma, MUI
- **Environment type:** Full-stack (server + client) — Next.js storefront + API routes + admin
- **Package manager:** npm
- **Monorepo target:** n/a (single app at repo root)
- **Existing LaunchDarkly:** none in app code
- **LaunchDarkly project key:** (unknown)
- **LaunchDarkly environment key:** (unknown)
- **Signup URL:** https://app.launchdarkly.com/signup?source=agent

## MCP

- Configured: no — user rejected OAuth prompt
- Hosted vs fallback: Cursor LaunchDarkly plugin servers present; awaiting user choice (retry auth / quick install / skip MCP)
- Plugin servers: `plugin-launchdarkly-LaunchDarkly Feature Management`, `plugin-launchdarkly-LaunchDarkly AI Configs`

## Commands run

- `npx skills add launchdarkly/agent-skills --skill onboarding -y`
- `npx skills add launchdarkly/ai-tooling --skill launchdarkly-flag-create launchdarkly-flag-discovery launchdarkly-flag-targeting launchdarkly-flag-cleanup -y --agent cursor`

## Blockers / errors

- MCP OAuth for Feature Management was rejected by user (2026-07-10)

## Next step

Step 4: Await user choice — retry MCP auth, use quick install, or skip MCP and continue SDK with ldcli/dashboard fallback
