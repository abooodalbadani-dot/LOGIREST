# Research: Route & Navigation Integrity Audit Methodology

## Objective
Establish a reliable method for identifying all routes, verifying their connectivity, and ensuring they are correctly protected by the authentication middleware.

## Decision: Python-Based Static Analysis
We will use a Python script (`audit-routes.py`) to perform the audit. This approach is preferred over manual auditing due to the large number of routes (~100) and the need for repeatable verification.

### Rationale
- **Efficiency**: Automated scanning is faster and less prone to human error.
- **Repeatability**: The script can be run again after refactoring to ensure no new orphans were created.
- **Integration**: Python provides excellent file system and regex capabilities for parsing Next.js page structures and source code references.

## Methodology

### 1. Route Extraction
- **Target**: `apps/web/src/app/[locale]`
- **Pattern**: Find all `page.tsx` files.
- **Normalization Rules**:
  - Remove `apps/web/src/app/[locale]` prefix.
  - Remove route groups: `(app)`, `(auth)`, `(operations)`, `(procurement)`, `(master-data)`.
  - Handle root `page.tsx` as `/`.
  - Normalize path separators to `/`.

### 2. Navigation Mapping
- **Search Patterns**:
  - `href=["']([^"']+)["']` (for `<Link>` and `<a>`)
  - `push\(["']([^"']+)["']\)` (for `router.push`)
  - `replace\(["']([^"']+)["']\)` (for `router.replace`)
- **Scope**: Entire `apps/web/src` directory.
- **Dynamic Paths**: Identify patterns like `` `${path}/...` `` or `router.push(variable)` and flag them for manual review.

### 3. Security Verification
- **Source of Truth**: `apps/web/src/proxy.ts` -> `publicPaths`.
- **Logic**:
  - If a route is NOT in `publicPaths`, it MUST be considered protected.
  - Verification involves ensuring the `proxy.ts` `matcher` covers all extracted routes.

## Alternatives Considered

### Alternative 1: Runtime Crawling (Playwright)
- **Evaluated**: Using a web crawler to click every link.
- **Rejected**: Too slow, difficult to handle authenticated states without complex setup, and might miss hidden routes not immediately visible in the UI.

### Alternative 2: TypeScript Compiler API
- **Evaluated**: Using AST parsing to find links.
- **Rejected**: High implementation complexity for the scope of a stabilization audit. Regex is sufficient for 95% of cases in this codebase.

## Risk Assessment
- **Dynamic Routing**: Some links might be constructed dynamically at runtime.
  - **Mitigation**: Flag all non-literal string link arguments as "Review Required".
- **External Redirects**: Redirects from the backend or external services.
  - **Mitigation**: Focus on internal application integrity first; identify external dependencies in Phase 2.
