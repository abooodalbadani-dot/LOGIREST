<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Workflow Engine (Phase 4)

We have implemented a zero-trust **Workflow Engine** featuring dynamic document status transitions, role capability checks, warehouse operational lock checking, and PR-to-PO conversion.

### Core Features

1. **Document Status Transitions**: Fully integrated with `@logirest/shared-types` state machines. Bypassing state machine rules is strictly rejected. Every status transition logs an event to the `ApprovalEvent` and `AuditLog` tables inside a transaction database block.
2. **Role-Based Workflow Capabilities**: Validates user roles against document type and status actions (e.g. `WH_KEEPER` is blocked from submitting a PR, throwing `403 Forbidden`).
3. **Warehouse Operational Locks**: Dynamic operational locks (e.g. during a stocktake `WarehouseLock` active state) block any physical inventory mutations (e.g. GRN, Transfer, Adjustment) with a `423 Locked` response, while still allowing procurement processes (PR/PO).
4. **PR-to-PO Conversion**: Allows manual conversion of an `APPROVED` Purchase Request (PR) to a `DRAFT` Purchase Order (PO) with validated line item unit pricing. Ensures exactly one PO maps to one PR using a unique database constraint on the `prId` field, throwing `409 Conflict` on duplicate requests.

### Usage and Verification

- Run unit tests: `npm run test --workspace=api`
- Run integration E2E tests: `npm run test:e2e --workspace=api`
- Type checking: `npm run typecheck --workspace=api`
- Formatting/Linter: `npm run lint --workspace=api`

## Concurrency Control & Consistency (Phase 5)

We have implemented robust concurrency safety and consistency mechanisms across the NestJS API application:

### Core Features

1. **Optimistic Locking (US1/US3)**:
   - Validates document `version` fields during status transitions to prevent concurrent update races (stale updates).
   - Mismatched client versions result in a structured `409 Conflict` response (`VersionConflictException`), detailing the `currentVersion`, `lastModifiedBy`, and `lastModifiedAt` data retrieved from the document and audit logs.

2. **Idempotency Subsystem (US2)**:
   - Registers `@Idempotent()` decorator to guard POST creation routes.
   - Requires client-supplied `x-idempotency-key` (validated UUID v4).
   - Prevents duplicate requests during processing with a `409 Conflict` (102 Processing) and caches successful responses to return them sequentially on retries without re-invoking business logic.
   - Cleans up locks on handler failure.
   - Prunes expired idempotency logs older than 24 hours using an automated hourly cron scheduler.

3. **Warehouse Locks & Admin Override (US4)**:
   - Restores stale lock bypass protection: active warehouse locks (`isActive: true`) block physical mutations even if their expiration date (`expiresAt`) is in the past.
   - Exposes a restricted endpoint `POST /api/v1/warehouse-locks/:id/force-unlock` guarded with `JwtAuthGuard`.
   - Restricts force-unlock overrides strictly to `Role.ADMIN` users with a minimum 10-character reason notes requirement.
   - Executes force-unlock inside a transaction, disabling the lock and writing a `FORCE_UNLOCK` entry to the `AuditLog` table containing before/after states, admin ID, and client IP address.

### E2E Test Execution Note
Due to the strict InsForge PostgreSQL connection limit (exactly `3` concurrent connections), run the E2E tests individually or with sequence-controlled pacing:
- Concurrency control: `npx jest --config ./test/jest-e2e.json test/concurrency.e2e-spec.ts`
- Idempotency checks: `npx jest --config ./test/jest-e2e.json test/idempotency.e2e-spec.ts`
- Warehouse lock overrides: `npx jest --config ./test/jest-e2e.json test/warehouse-lock.e2e-spec.ts`
- Workflow roles & locks: `npx jest --config ./test/jest-e2e.json test/workflow-roles.e2e-spec.ts`

