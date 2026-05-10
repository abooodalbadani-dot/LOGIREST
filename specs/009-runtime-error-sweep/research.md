# Research: Phase 6 Runtime Error Sweep

## Decision: Automated Hydration Detection
**Decision**: Use a combination of `next build` static analysis and a manual navigation audit with a "Hydration Guard" script.
**Rationale**: Next.js 15+ highlights hydration mismatches during `next build` if it can. Manual navigation while monitoring the console for `Warning: Expected server HTML...` is the most reliable way to catch dynamic component drift.
**Alternatives considered**: 
- Automated Playwright audit (high overhead).
- `suppressHydrationWarning` (rejected as per spec).

## Decision: React Key Enforcement
**Decision**: Use a custom lint-like `ripgrep` audit combined with React Strict Mode.
**Rationale**: React Strict Mode in development will log key warnings. A static sweep will catch the majority of missing keys in `.map()` calls.
**Alternatives considered**: 
- ESLint rule `react/jsx-key` (already should be on, but might be ignored).

## Decision: AbortController Integration
**Decision**: Modify `apiClient.ts` to accept an optional `AbortSignal`. Update all mutation hooks to pass the signal from a cleanup effect or `useQuery` automatically.
**Rationale**: `AbortController` is the standard Web API for canceling fetch requests. It prevents the "state update on unmounted component" warning at the source.
**Alternatives considered**: 
- `isMounted` ref check (reactively reactive but less efficient than canceling the network request).

## Decision: Global Error Boundary
**Decision**: Use Next.js `error.tsx` file at the root level and a custom `GlobalErrorBoundary` component for client-side catch-all.
**Rationale**: Next.js provides built-in error handling for routes, but client-side promise rejections (outside of React render) need a `window.onunhandledrejection` listener.
**Alternatives considered**: 
- Sentry (deferred as per spec recommendation to use Console + Error Boundary).
