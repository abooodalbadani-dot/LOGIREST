
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
dont rename proxy.ts to middleware.ts because we use nextjs16 .
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
E:\kitchen-store-inventory-system\specs\047-hardening-e2e-validation\plan.md
<!-- SPECKIT END -->

# CRITICAL TYPESCRIPT RULES FOR THIS WORKSPACE:

1. ABSOLUTELY NO `any` OR `as any`: Under no circumstances are you allowed to use `any` or type assertions like `as any` to bypass type errors.
2. NO `@ts-ignore` OR `@ts-expect-error`: Do not suppress compiler errors. You must solve the root cause of the type mismatch.
3. USE `unknown` PROPERLY: If a type is truly unknown (e.g., from an external API or try/catch block), type it as `unknown` and use Zod parsing or strict Type Guards (e.g., `typeof`, `instanceof`, or custom predicates) to narrow it down before using it.
4. STRICT INTERFACES: Always explicitly define the shape of your data using interfaces or Zod schemas. If an API returns an array, type it as an array. If a field is optional, use `?`.
5. NO LAZY FIXES: If a component expects a specific type and you have a different one, do not force the cast. Write the proper transformation or mapping function.

If you violate these rules, the PR will be immediately rejected. Provide strictly typed, production-ready code only.


## CRITICAL ARCHITECTURE RULES FOR ENTIRE WORKSPACE (FRONTEND & BACKEND):

1. STRICT NAMING CONVENTIONS (NO SCHIZOPHRENIA):
   - ABSOLUTELY NO `snake_case` in TypeScript code, DTOs, or API Payloads.
   - Everything MUST use `camelCase` (e.g., `branchId`, NOT `branch_id`).
   - The ORM (Prisma) is solely responsible for mapping `camelCase` to database `snake_case`.

2. ZERO FALLBACK POLICY (NO GUESSING):
   - NEVER use nullish coalescing (`?? ''`) or logical OR (`|| []`) to silently bypass missing mandatory data in API endpoints or controllers.
   - If data is missing or invalid, fail fast and throw an exception (e.g., 400 Bad Request). Do not try to "patch" it with empty strings.

3. NO BLIND TYPE CASTING:
   - NEVER cast values manually using `Number(val)`, `String(val)`, or `as any`.
   - Backend: All incoming payloads MUST be strictly validated and transformed using DTOs with `class-validator` and `class-transformer` (e.g., `@Type(() => Number)`, `@IsNumber()`).
   - Frontend: All data must be validated using `Zod` schemas before being sent or used.

Any code generated that violates these rules, includes mixed casing, or uses fallback hacks for missing data will be rejected immediately.
# PROTOCOL — GRAPHIFY-DRIVEN NAVIGATION (TOKEN OPTIMIZATION)

This repository has been mapped using Graphify to optimize context windows and prevent token bleeding. 

Before searching the codebase, requesting file contents, or tracing a workflow, you MUST:
1. Consult `GRAPH_REPORT.md` to understand the system's architectural hubs and "God Nodes".
2. Query `graph.json` to trace exact dependencies, imports, and component relationships.

CRITICAL RULE:
- Do NOT perform blind recursive directory searches.
- Do NOT guess file paths or rely on your training data for Next.js/NestJS file structures.
- Resolve file locations and dependency chains through the Graphify map FIRST, then explicitly read ONLY the specific files necessary for the task.
<!--
- the update command must be run manually in the terminal: `graphify update .`
 after any session where code files are created or modified to ensure subsequent tasks navigate the codebase accurately. -->
# CRITICAL RULES - MUST FOLLOW

## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- Never implement features yourself when possible - use sub-agents!
- Identify changes from the plan that can be implemented in parallel, and use sub-agents to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## TESTING

- Use any testing tools, libraries available to the project for testing your changes
- Never assume your changes simply work, always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## UI DESIGN

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md , E:\kitchen-store-inventory-system\.impeccable\design.json

## DATA INTEGRITY & STATE
- NEVER mutate database records directly. Always follow the state machine transitions defined in the project.
- ALWAYS respect the Optimistic Locking mechanism (`version` field) in Prisma updates to prevent concurrency bugs.
 
 ## MONOREPO ARCHITECTURE
- Strictly separate concerns. Do NOT mix Backend logic (NestJS/Prisma) inside Frontend components (Next.js).
- ALWAYS place shared types and Zod schemas in `packages/shared-types` and import them in both apps.
---
description: Instructions building apps with MCP
globs: *
alwaysApply: true
---


