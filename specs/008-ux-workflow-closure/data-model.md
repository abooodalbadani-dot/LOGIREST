# Data Model: UX Completeness & Workflow Closure

## Entities

### DocumentState
- **Status**: enum (Draft, Pending, Approved, Closed, Rejected)
- **isLocked**: boolean (Derived: Status === 'Approved' || Status === 'Closed')
- **Actions**: array of strings (Create, Edit, Delete, Post, Reject)

### UXRegistry
- **ListPages**: List of all list-view routes in `apps/web`.
- **DestructiveMutations**: Map of mutation keys that require confirmation.

## State Transitions

| Initial Status | Action | New Status | Lock State Change |
| :--- | :--- | :--- | :--- |
| Draft | Post | Approved | Unlocked -> Locked |
| Draft | Delete | Deleted | N/A |
| Pending | Approve | Approved | Unlocked -> Locked |
| Approved | Close | Closed | Locked -> Locked |
