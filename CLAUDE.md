Project uses:

Frontend:

- React
- Mantine UI
- Tailwind
- TypeScript
- Functional components only
- No class components
- Prefer hooks

Backend:

- NestJS
- TypeScript
- Prisma + PostgreSQL

Architecture:

- Each domain contains: controller, service
- Services contain business logic
- Database access in services (Prisma)
- No shared god-services

Rules:

- Follow existing domain structure
- You can introduce new layers or abstractions but only after discussion and approval
- No `any`, only if it's necessary, like unknown response of API calls
- Always use async/await
- Explicit return types
- Prefer composition over inheritance
- Keep functions small and focused
- Do not invent new patterns, if it's necessary, discuss first
- never ever delete node_modules, package-lock.json, or yarn.lock
- if you bump to a big problem, better stop and ask
- after every implementation, give me very clear review what was done and what is the biggest problem - be very concise, if any, and what is the next step

Code style:

- Explicit types
- Small functions
- No overengineering
- Every code in English, comments too
- Comments: one line, two at most. Say why, not what; no essays, no prose, no restating the code

General:

- When reporting information to me, be extremely concise and sacrifice grammar for the sake of concision
- do not run dev server on background
- Respect current project conventions
- Reuse existing types and utilities
- Ask before large structural changes
- Use concise answers by default
- Explain shortly but also with example

## Project conventions

### Issue tracker

Issues and PRDs live as GitHub issues in `Jaffator/bikecheck-app`, managed via the `gh` CLI. See `docs/conventions/issue-tracker.md`.

### Triage labels

Default canonical vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/conventions/triage-labels.md`.

### Frontend structure

A domain owns its data in its root and its components in `ui/`; a `<domain>_page/` folder holds
only the route and its empty state. See `docs/conventions/frontend-structure.md`.

### Drawers

Every bottom sheet opens with the same slide-up transition; a remounted one flips `opened`
on the next frame so it animates. See `docs/conventions/drawers.md`.

### Typography

Geist only; figures get `tabular-nums`, weights 400–700, letter-spacing only via `--tracking-*` tokens.
See `docs/design.md` §9 Typography.

### Domain docs

Single-context — one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/conventions/domain.md`.
