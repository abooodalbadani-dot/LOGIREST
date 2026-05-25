# Data Models & Schemas: Wire Admin Roles UI to Real Backend API

This document details the runtime data structures and models for the Roles integration feature.

## Runtime Data Models

These types govern data transferred over the wire between the NestJS backend and Next.js frontend, exported in `shared-types`.

### 1. `RoleDescriptor`

This contract structures the details of each system role.

```typescript
import type { UserRole } from '../rbac';

export interface Permission {
  module: string;
  actions: {
    view: boolean;
    create: boolean;
    edit: boolean;
    approve: boolean;
    post: boolean;
  };
}

export interface RoleDescriptor {
  id: UserRole;
  displayName: string;
  description: string;
  userCount: number;
  permissions: Permission[];
}
```

### 2. Validation & DB Mappings

The role is persisted on the `User` model inside PostgreSQL as mapped by Prisma.

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role     // Role Enum: ADMIN, GM, INV_MGR, etc.
  isActive     Boolean  @default(true)
  version      Int      @default(1)
  
  @@map("users")
}
```

### Validation Constraints
- **Role Validation**: Inputs targeting roles must strictly match values from the `Role` database enum (which corresponds to `UserRole` in typescript packages).
- **Access Filter**: Only users with `isActive: true` are counted inside `userCount` statistics to reflect operational counts.
