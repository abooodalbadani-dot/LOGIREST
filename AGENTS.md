
<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
dont rename proxy.ts to middleware.ts because we use nextjs16 .
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
E:\Kitchen‑Store Inventory System\specs\035-sprint-2-completion\plan.md
<!-- SPECKIT END -->


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
- Design System: @DESIGN.md , E:\Kitchen‑Store Inventory System\.impeccable\design.json

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


