Project uses:

Frontend:

- Next.js
- TypeScript
- Functional components only
- No class components
- Prefer hooks

Backend:

- Node.js
- TypeScript
- Prisma + PostgreSQL

Architecture:

- Each domain contains: controller, service, repository
- Controllers handle HTTP only
- Services contain business logic
- Repositories handle database access (Prisma)
- No shared god-services

Rules:

- Follow existing domain structure
- Do NOT introduce new layers or abstractions
- No `any`
- Always use async/await
- Explicit return types
- Prefer composition over inheritance
- Keep functions small and focused
- Do not invent new patterns

Rules:

- No any
- Use Classes and Interfaces appropriately
- Use async/await
- Follow existing folder structure
- Services contain business logic
- Controllers only handle HTTP
- Prefer simple solutions

Code style:

- Explicit types
- Small functions
- No overengineering

General:

- Respect current project conventions
- Reuse existing types and utilities
- Ask before large structural changes
