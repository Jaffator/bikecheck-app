Project uses:

Frontend:

- React
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
- Do NOT introduce new layers or abstractions
- No `any`, only if it's neccesary, like unknow response of api calls
- Always use async/await
- Explicit return types
- Prefer composition over inheritance
- Keep functions small and focused
- Do not invent new patterns

Code style:

- Explicit types
- Small functions
- No overengineering
- Every code in English, comments too

General:

- Respect current project conventions
- Reuse existing types and utilities
- Ask before large structural changes
- Use concise answers by default
- Explain shortly but also with example
