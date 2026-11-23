# Architecture

## Request lifecycle

```
HTTP request
  -> requestId              assigns X-Request-Id (appears in logs + error bodies)
  -> httpLogger             one structured log line per request
  -> helmet / cors / gzip
  -> express.json           (webhooks bypass this - they need the raw body)
  -> globalRateLimiter
  -> /api/v1
       public group         health, auth, (qr scans, webhooks)
       private group        requireAuth -> resolveTenant -> feature routers
  -> validate(schema)       zod parses and REPLACES body/query/params
  -> requireMinRole(...)    role check against req.tenant.role
  -> controller             reads req, calls service, returns ApiResponse
  -> service                business rules, throws ApiError
  -> repository             Prisma, scoped via tenantClient()
  -> notFoundHandler        unmatched route
  -> errorHandler           ApiError | ZodError | Prisma error -> error envelope
```

## Layer boundaries

| Layer | May import | Must never |
| --- | --- | --- |
| routes | middleware, controller, schema | business logic |
| controller | service, ApiResponse, ApiError | `prisma`, SQL |
| service | repository, utils, other services | `express`, `req`, `res` |
| repository | `prisma` / `tenantClient` | throwing `ApiError`, business rules |

If a service needs the request IP or user agent, the controller passes it in as a
plain object (see `sessionFrom()` in `auth.controller.ts`).

## Why `app.ts` and `server.ts` are separate

`createApp()` returns a configured Express app without binding a port, so tests
can call it with supertest. `server.ts` owns the port, DB connection and graceful
shutdown. Never `app.listen()` from `app.ts`.

## Tenancy

- `User` is global identity. `Membership` joins a user to an organization with a role.
- Tenant rows carry `organizationId`; `tenantClient()` injects it automatically.
- `req.tenant.organizationId` is the only trusted source of the tenant id.

## Public vs private routes

The split in `src/routes/index.ts` exists so unauthenticated surface area is
explicit and auditable. Anything in the public group can be hit by anyone on the
internet — rate-limit it hard and validate it strictly. QR scan endpoints and
payment webhooks belong there; nothing else should, by default.

## Where the not-yet-built pieces go

| Concern | Home | Notes |
| --- | --- | --- |
| Payment webhooks | `modules/payments/webhook.routes.ts` | Needs `express.raw` registered **before** `express.json` in `app.ts` to verify signatures |
| Background jobs | `src/jobs/` (BullMQ + the Redis already in docker-compose) | Subscription renewals, notification fan-out, QR batch generation |
| Third-party clients | `src/integrations/` | Payment gateway, SMS/email, S3. Services call these; provider SDKs stay out of services |
| Audit logging | `modules/audit/` | The `AuditLog` model already exists; write to it from services on destructive actions |
| Caching / sessions | Redis | Container is already running on 6379 |

## Vehicle domain policies

- **Registration Uniqueness**: Registration uniqueness is enforced per owner through the database constraint `(userId, reg)` (`@@unique([userId, reg])`). Consistent trimming and uppercase normalization are applied across creation, updates, and searches. Different customers may independently register the same normalized registration number (e.g. supporting shared family vehicles, leasing, and guest drivers as described in PRD v1.0 Section 5.3). This is a **provisional implementation policy**, not a confirmed product requirement; formal product-owner confirmation is pending prior to public launch.
- **Document Expiry & Reminders**: `Vehicle.docExpiry` is derived from the earliest expiring associated document in `VehicleDocument` (`RC`, `INSURANCE`, `PUC`, `FITNESS`, `PERMIT`). Reminder classification is evaluated as: `EXPIRED` (< current time), `EXPIRING_SOON` (<= 30 days remaining), or `UP_TO_DATE` (> 30 days remaining).

## QR Code domain policies

- **Lifecycle States & Transitions**:
  - `AVAILABLE`: Newly minted/imported QR code, unallocated to any vehicle.
  - `ASSIGNED`: Allocated to a specific vehicle, awaiting initial physical installation or first scan.
  - `ACTIVE`: Linked and active.
  - `SUSPENDED`: Temporarily suspended (e.g. vehicle repair, user freeze). Reversible: can be reactivated to `ACTIVE` (if vehicle remains linked) or `AVAILABLE` (if unlinked).
  - `REPLACED`: Superseded by a replacement QR code. Terminal state: historical association is preserved in `qr_assignment_history` with unassignment timestamp and reason, but active linkage is cleared.
  - `DEACTIVATED`: Permanently retired/scrapped QR code (lost, damaged). Terminal state: cannot be reassigned or reactivated.
- **Single Active QR per Vehicle**: Enforced at the database level via a PostgreSQL unique index `@@unique([vehicleId])` on `qr_codes`. Any simultaneous or conflicting assignment attempt is rejected with `409 CONFLICT`.
- **Preservation of History**: Non-destructive historical preservation. Replaced or deactivated QRs maintain historical records in `qr_assignment_history` with foreign key integrity (`onDelete: SetNull` on `Vehicle` and `User`), ensuring historical associations and scan logs are never cascade-deleted.
- **Batch Operations**: Batch generation creates unique random codes (`QRR-XXXXXX`) in `AVAILABLE` status within a named batch. Batch import validates uniqueness and rejects payloads with internal duplicates or collisions against existing database codes with `409 CONFLICT`.
- **Public Scan Logs**: Every public scan event records a timestamped `qr_scan_logs` entry and increments `scansCount` on `qr_codes`.

## Scaling notes for later

- Shared types between backend and the four frontends: make the repo root a pnpm
  workspace and add `packages/shared` for zod schemas + the API client. That kills
  the drift between `crm/` and the API before it starts.
- Prisma schema is already a folder — add `products.prisma`, `orders.prisma`, etc.
  rather than growing one file.
