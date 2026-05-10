# Data Model: Runtime Error Sweep

## Entities

### ApiRequestConfig
Represents the extended configuration for `apiClient`.
- `method`: string (GET, POST, etc.)
- `path`: string
- `schema`: ZodSchema
- `body?`: unknown
- `signal?`: AbortSignal (Optional, used for request cancellation)

### ConflictEvent
Represents the event payload for the `ConflictBus`.
- `version`: number
- `documentId`: string
- `entityType`: string

## State Transitions
1. **Request Pending**: `AbortController` is active.
2. **Component Unmount**: `controller.abort()` is called.
3. **Request Cancelled**: `apiClient` catches `AbortError` and silences it (no console warning).
