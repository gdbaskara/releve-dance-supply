# AGENTS.md — rules for agents building this project

Read in order before writing code: `docs/00-brief.md` → `docs/09-work-plan.md` (find your workstream) → the documents that workstream references.

## Source of truth
| Topic | File |
|---|---|
| What to build & AC | `docs/02-requirements.md` |
| Demo scope & test scenarios | `docs/03-demo.md` |
| Stack, structure, conventions, env | `docs/04-tech-stack.md` |
| DB schema, state machine, provider contracts, WA templates | `docs/05-data-and-contracts.md` |
| Tokens, components, copy | `docs/07-design-system.md`, `design-system/*` |
| Pages & flows | `docs/08-pages-and-flows.md` |
| Seed data | `data/**` (do not edit by hand; regenerate via `scripts/build_catalog.py`) |

If documents conflict: `00-brief` > `02-requirements` > other documents. Record the conflict & your decision in `docs/10-decisions.md`.

## Hard rules (review fails if violated)
1. **No COD** — no enum, option, text, or code for COD/cash on delivery.
2. **No installments/paylater** in v1.
3. **No claims** of "Official", "Authorized", "Resmi Só Dança", "Só Dança Indonesia"; the Só Dança logo is not used as the store logo. Full list: `design-system/glossary.json` → `forbidden_strings`.
4. **Prices & totals are calculated on the server.** Never trust numbers from the client.
5. **Stock must never oversell** — atomic reservation (`05` §4).
6. **No hard-coded UI strings** — everything goes through next-intl; id & en keys must match.
7. **Tokens only** for color/spacing/radius/font. WhatsApp green only for WA elements.
8. Money = integer Rupiah; displayed via `formatIDR()`; times displayed in WIB (Western Indonesia Time).
9. All external integrations go through a provider interface; the demo uses mocks; secrets are never committed.
10. sodanca.com reference images only if `DEMO_USE_REFERENCE_IMAGES=true` (internal presentation).

## How to work
- Work only in the folders owned by your workstream (`09-work-plan.md`). Shared contracts are changed via a separate PR.
- Commits: `feat(<FR-ID>): …` / `fix(<FR-ID>): …`. PRs list the completed FRs + a mobile screenshot (390×844) for UI.
- Before a PR: `pnpm lint && pnpm typecheck && pnpm test` (and `pnpm test:e2e` for WS-4/5/6).
- Unsure about behavior → follow the AC in `02-requirements.md`; no AC → pick the simplest option & record it in `10-decisions.md`.
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
