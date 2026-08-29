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
- Do not invent new patterns

Code style:

- Explicit types
- Small functions
- No overengineering
- Every code in English, comments too, comments short and concise, one liner if possible

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

### Domain docs

Single-context — one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/conventions/domain.md`.
