
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
dont rename proxy.ts to middleware.ts because we use nextjs16 .
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
c:\kitchen-store-inventory-system\specs\048-rbac-master-data-guards\plan.md
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


# AI Agent Guardrails & Scope Freeze Policy
**Project:** LogiRest (Kitchen-Store-Inventory-System)
**Status:** Active / Mandatory
**Phase:** Pre-Launch Stabilization
**Target Environment:** Antigravity IDE (AI Developer Agents Integration)

## 1. Objective & Purpose
This document establishes absolute behavioral guardrails and operational constraints for AI development agents operating within the IDE. The immediate goal is to halt scope creep, enforce a strict feature freeze, and focus exclusively on stabilizing the core internal logistics and inventory scope defined in the project proposal, without breaking the existing codebase or deleting forward-looking architectural files.

## 2. Core Directives for AI Agents (The System Prompt)
All AI agents must strictly adhere to the following execution rules during this phase:
- **Debug & Refactor Mode Only:** The agent must operate exclusively in a stabilization capacity. Do not propose, generate, or inject new features, additional database fields, or unrequested UI components.
- **Scope Absolute Restriction:** The active development scope is limited strictly to internal logistics (ledger-based stock movements, FEFO lot allocation, stocktake snapshots/locks, and basic procurement workflows). Any request or auto-suggested path outside this definition must be flagged as out-of-scope.
- **Idempotency and Non-Disruption:** Code modifications must be highly localized. Agents must ensure that bug fixes do not alter existing established logic or introduce breaking changes to the project's architecture boundaries or UI routing.

## 3. File Management & Deactivation Strategy (Hiding vs. Deletion)
To preserve work done on extended features while ensuring a clean MVP presentation, the following protocols must be followed to hide out-of-scope files without deleting them:

| Layer / Component | Preservation & Hiding Strategy | Safety Condition (Prevent Code Breaking) |
| :--- | :--- | :--- |
| **Frontend Application / UI Layer** | Move out-of-scope page directories or views into a backup/features directory prefixed with an underscore (e.g., `_v2-features/`) or exclude them from the main navigation layout dynamically. | Ensure no active router/navigation links point to the hidden routes. Replace active links with disabled states or hide the navigation links entirely. |
| **Backend API / Application Layer** | Retain all extra domain entities, handlers, controllers, or services. Deactivate the entry points by commenting them out from the main routing/API registration, or wrapping them in conditional compilation blocks if applicable. | If active core features depend on extended models, stub the dependencies with default or null responses rather than removing the properties, ensuring compilation/execution remains 100% successful. |
| **Database Schema & Seed Data** | Keep extended tables and columns intact. Do not drop any tables. Update the active migrations, ORM models, or data access logic to simply ignore these columns or pass default/nullable values. | Ensure no database constraints (like non-nullable foreign keys on extended tables) block the core transactional flow of the inventory ledger. |

## 4. Execution Guardrails for Antigravity IDE Agents
When prompting or interacting with AI agents within the IDE, the following instruction block must be appended to the active context layer:

> **CRITICAL INSTRUCTION FOR THE AGENT:**
> 1. You are locked in STABILIZATION AND BUG-FIX MODE for the LogiRest project.
> 2. DO NOT delete any existing files, classes, or database columns, even if they appear unused or related to future phases.
> 3. If a file or route is designated as "hidden" or "V2", preserve it completely but exclude it from the current active UI navigation and compilation path.
> 4. Focus only on resolving errors within the active MVP scope (Ledger, FEFO, Stocktake, basic PR/PO/GRN).
> 5. Maintain strict architectural boundaries based on the current codebase. Do not introduce speculative code or assume specific frameworks unless they already exist in the project files.

## 5. Project Proposal Reference
**Active Proposal Link/Path:** `[C:\kitchen-store-inventory-system\PROJECT PROPOSAL.md]`
The agent must read the specified proposal document to cross-reference and validate whether a specific feature or screen belongs to the active MVP boundary before execution.