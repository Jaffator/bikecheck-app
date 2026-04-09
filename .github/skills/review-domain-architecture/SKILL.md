---
name: review-domain-architecture
description: 'Review domain architecture in this project. Use for checking NestJS domain boundaries, controller/service/repository responsibilities, Prisma access placement, design patterns, coupling, cohesion, overengineering, and architectural anti-patterns in apps/backend/src domains.'
argument-hint: 'Provide a domain, folder, module, or architecture question to review, for example: component domain, auth module, or service vs repository responsibilities.'
user-invocable: true
disable-model-invocation: false
---

# Review Domain Architecture

Use this skill when reviewing the architecture of a backend domain in this repository, especially under `apps/backend/src/<domain>`.

This project follows these conventions:
- NestJS + TypeScript backend
- Domain structure should contain controller, service, repository
- Controllers handle HTTP only
- Services contain business logic
- Repositories handle Prisma and database access
- Avoid shared god-services and unnecessary abstractions
- Prefer small functions, explicit types, async/await, and simple solutions

## When to Use

- Review whether a domain respects controller/service/repository boundaries
- Explain which architectural or design patterns are used in a module
- Identify anti-patterns like leaking Prisma into services or bloated services
- Compare where logic should live: controller vs service vs repository
- Teach a junior developer why the current design is good or problematic

## Inputs

Provide one of these:
- Domain name, for example `component`, `auth`, or `bike-event`
- A folder path or a set of files
- A specific architecture question, for example `Should this Prisma query live in repository or service?`

## Procedure

1. Identify the review scope.
If the user gives a domain, inspect the module, controller, service, repository, DTOs, and closely related files.

2. Map the execution flow.
Trace how requests enter through the controller, where business rules live, and where persistence happens.

3. Check architectural boundaries.
Review the following:
- Controller should parse input, call service, and shape HTTP responses only.
- Service should orchestrate domain logic and business rules.
- Repository should contain Prisma queries and persistence concerns.
- Prisma access should not spread across unrelated layers unless there is a strong project-specific reason.
- Module wiring should be minimal and consistent.

4. Identify patterns and anti-patterns.
Look for:
- Repository pattern
- Service layer pattern
- Transaction boundary decisions
- Feature-module organization
- Dependency direction problems
- Tight coupling between layers
- Low cohesion inside services
- Duplicated domain logic
- God-service growth
- Overengineering or unnecessary abstractions

5. Judge the design in context.
Do not label something as wrong only because it differs from textbook architecture. Evaluate whether the design matches this codebase's conventions and complexity.

6. Produce review findings.
Order findings by severity and focus on concrete risks, maintainability issues, and likely regressions.

## Output Format

Use this structure:

### Verdict
One short paragraph summarizing whether the domain architecture is sound.

### Findings
List concrete issues first, ordered by severity.
For each finding include:
- what is wrong
- why it matters
- where it is located
- what boundary or pattern is being violated or applied poorly

### Patterns In Use
Name the relevant patterns that are actually present and explain briefly how they are used.

### Recommendation
State the smallest sensible improvement path.

### What Not To Do
Call out tempting but harmful refactors, especially adding abstractions without need.

## Review Heuristics For This Repository

- If a service directly performs Prisma queries, check whether that bypasses an existing repository boundary.
- If a repository contains business rules, suggest moving them to the service.
- If a controller transforms too much data or contains branching logic, flag it.
- If a module exports too much or wires unrelated providers together, flag it.
- If naming and folder structure hide the actual responsibility, mention it.

## Example Prompts

- `/review-domain-architecture component`
- `/review-domain-architecture auth module`
- `/review-domain-architecture Review whether Prisma is leaking outside repositories in bike-event`
- `/review-domain-architecture Explain what patterns are used in the ride domain and whether they fit`