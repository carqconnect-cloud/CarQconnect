# API reference

Base URL: `http://localhost:4000/api/v1`

## Headers

| Header | When | Value |
| --- | --- | --- |
| `Authorization` | all private routes | `Bearer <accessToken>` |
| `X-Organization-Id` | private routes, when the user has >1 org | organization id |
| `X-Request-Id` | optional | echoed back; use it when reporting a bug |

## Envelope

```json
{ "success": true, "data": {}, "meta": { "pagination": {} } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Lead not found" }, "requestId": "..." }
```

Error codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `INVALID_CREDENTIALS`,
`TOKEN_EXPIRED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`,
`TENANT_REQUIRED`, `INTERNAL_ERROR`.

## List query params

`?page=1&limit=20&sortBy=createdAt&sortOrder=desc&search=priya`
(`limit` caps at 100; `sortBy` only accepts the module's allow-listed columns.)

---

## Health (public)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness |
| GET | `/health/ready` | readiness, pings the database |

## Auth

| Method | Path | Auth | Body |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | `firstName, lastName, email, password, organizationName, phone?` |
| POST | `/auth/login` | public | `email, password, organizationId?` |
| POST | `/auth/refresh` | public | `refreshToken` |
| POST | `/auth/logout` | public | `refreshToken` |
| GET | `/auth/me` | bearer | — |
| POST | `/auth/logout-all` | bearer | — |
| POST | `/auth/switch-organization` | bearer | `organizationId` |
| POST | `/auth/change-password` | bearer | `currentPassword, newPassword` |

`register` and `login` return:

```json
{
  "user": { "id": "...", "email": "...", "firstName": "...", "isSuperAdmin": false },
  "organizations": [{ "id": "...", "name": "...", "slug": "...", "role": "OWNER", "isDefault": true }],
  "activeOrganizationId": "...",
  "tokens": { "accessToken": "...", "refreshToken": "...", "expiresIn": "15m" }
}
```

Password rules: 8+ chars, one lowercase, one uppercase, one digit.
Refresh tokens rotate — store the new one and discard the old.

## Users / members (bearer + org)

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/users` | any member |
| GET | `/users/:id` | any member |
| PATCH | `/users/me` | any member (own profile) |
| POST | `/users/invite` | ADMIN |
| PATCH | `/users/:id` | ADMIN (role/status) |
| DELETE | `/users/:id` | ADMIN |

`:id` is the **membership** id, not the user id. The last OWNER cannot be demoted,
suspended or removed.

## Organization

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/organizations/current` | any member |
| PATCH | `/organizations/current` | ADMIN |

## CRM — leads

| Method | Path | Min role |
| --- | --- | --- |
| GET | `/crm/leads` | any member (`?status=NEW&ownerId=...`) |
| GET | `/crm/leads/stats` | any member |
| GET | `/crm/leads/:id` | any member |
| POST | `/crm/leads` | EXECUTIVE |
| PATCH | `/crm/leads/:id` | EXECUTIVE |
| DELETE | `/crm/leads/:id` | TEAM_HEAD |

`status`: `NEW | CONTACTED | QUALIFIED | PROPOSAL | NEGOTIATION | WON | LOST`.

*Note: The minimum role requirements for lead mutations (`EXECUTIVE` for create/update, `TEAM_HEAD` for delete) represent an explicit Phase 3C.3 project authorization decision mapping operations to the reconciled Role enum, rather than requirements originally specified in the SOW or PRD.*

## Super Admin (/api/v1/admin/*)

Requires active Super Admin authentication (`isSuperAdmin: true`). Does not require `X-Organization-Id` or tenant membership.

| Method | Path | Auth | Parameters / Body | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/admin/health` | Super Admin | — | Super Admin routing health check |
| GET | `/admin/users` | Super Admin | Query: `page, limit, search, isActive, isSuperAdmin, sortBy, sortOrder` | Global platform user directory & search |
| GET | `/admin/users/:id` | Super Admin | Path: `id` (CUID) | Customer 360 view (profile, vehicles, memberships, activity) |
| PATCH | `/admin/users/:id/status` | Super Admin | Body: `{ isActive: boolean, reason?: string }` | Update user status (deactivate / reactivate) |
| GET | `/admin/organizations` | Super Admin | Query: `page, limit, search, isActive, sortBy, sortOrder` | Global platform organization directory & search |
| GET | `/admin/organizations/:id` | Super Admin | Path: `id` (CUID) | Retrieve organization detail with membership count |
| PATCH | `/admin/organizations/:id/status` | Super Admin | Body: `{ isActive: boolean, reason?: string }` | Update organization status (activate / deactivate) |
| GET | `/admin/audit-logs` | Super Admin | Query: `page, limit, search, action, entity, entityId, actorId, organizationId, startDate, endDate, sortBy, sortOrder` | Platform-wide audit logs directory & search |
| GET | `/admin/dashboard` | Super Admin | Query: `period, startDate, endDate` | Executive dashboard platform-wide metrics & trends |
| GET | `/admin/dashboard/executive` | Super Admin | Query: `period, startDate, endDate` | Alias for executive dashboard metrics |
| GET | `/admin/dashboard/alerts` | Super Admin | Query: `severity, limit` | Operational alerts for platform anomalies & suspensions |
| GET | `/admin/dashboard/system-health` | Super Admin | — | System runtime, database health, & integration status |
| GET | `/admin/inventory/stock-dashboard` | Super Admin | — | Warehouse inventory & stock telemetry summary (alias: `/stock`) |
| GET | `/admin/inventory/products` | Super Admin | Query: `page, limit, search, category` | Product catalog listing & stock levels |
| POST | `/admin/inventory/products` | Super Admin | Body: `{ name, sku, category, price, available }` | Create catalog product |
| GET | `/admin/inventory/warehouses` | Super Admin | — | Warehouse locations directory |
| GET | `/admin/inventory/movements` | Super Admin | Query: `page, limit, productId, warehouseId` | Stock movement audit history |
| GET | `/admin/inventory/serial-imei` | Super Admin | Query: `page, limit, search, status` | Serial number and IMEI inventory tracking |
| GET | `/admin/memberships/plans` | Super Admin | — | Consumer membership plans listing |
| POST | `/admin/memberships/plans` | Super Admin | Body: `{ name, slug, price, interval, benefits, entitlements, isActive }` | Create consumer membership plan |
| GET | `/admin/memberships/subscriptions` | Super Admin | Query: `page, limit, status, search` | Active consumer subscriptions list |
| GET | `/admin/memberships/renewals` | Super Admin | Query: `days, page, limit` | Upcoming renewals desk & reminder tracking |
| GET | `/admin/orders` | Super Admin | Query: `page, limit, status, search` | Hardware & e-store orders listing |
| GET | `/admin/orders/:id` | Super Admin | Path: `id` (CUID) | Order fulfillment details & item breakdown |
| POST | `/admin/orders/:id/refund` | Super Admin | Body: `{ amount?, reason? }` | Initiate order refund (atomic DB state transition) |
| GET | `/admin/gps` | Super Admin | Query: `page, limit, search, status` | GPS devices directory & online status |
| POST | `/admin/gps` | Super Admin | Body: `{ imei, model, simNumber? }` | Register hardware GPS tracker |
| POST | `/admin/gps/:id/assign` | Super Admin | Body: `{ vehicleId }` | Bind GPS tracker to vehicle |
| POST | `/admin/gps/:id/unbind` | Super Admin | Body: `{ reason? }` | Unbind GPS tracker from vehicle |
| GET | `/admin/gps/:id/trips` | Super Admin | Query: `startDate, endDate` | GPS vehicle trip history & telematics |
| GET | `/admin/gps/:id/geofences` | Super Admin | — | Geofence boundaries for device |

### Super Admin Customer 360 (`GET /admin/users/:id`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **Path Parameter:** `id` (CUID) — Target user ID.
- **Returns:** Full customer overview including user profile, registered vehicles with document reminder statuses, organization memberships, and recent audit activity.

### Super Admin User Status Management (`PATCH /admin/users/:id/status`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **Path Parameter:** `id` (CUID) — Target user ID.
- **Request Body:**
  ```json
  {
    "isActive": false,
    "reason": "Administrative suspension (optional, max 500 characters)"
  }
  ```
  - `isActive` (boolean, required).
  - `reason` (string, optional) — Trimmed; maximum 500 characters.
- **Self-Deactivation Guard:** An acting Super Admin cannot deactivate their own account (`400 BAD_REQUEST`).
- **Super Admin Target Restriction:** Accounts with `isSuperAdmin === true` cannot be deactivated via this endpoint (`403 FORBIDDEN`).
- **Session Revocation & Reactivation Lifecycle:**
  - Transitioning a user to inactive (`isActive: false`) atomically updates `User.isActive`, revokes all persisted refresh tokens (`RefreshToken`) in PostgreSQL, and records an audit event (`admin.user_deactivated`).
  - Reactivation (`isActive: true`) re-enables login and emits `admin.user_reactivated`, but does not restore previously revoked refresh tokens; the user must re-authenticate.
  - Individual-session inspection and per-session revocation are not established as approved requirements and are not supported.
- **Audit Logging:** Emits `admin.user_deactivated` or `admin.user_reactivated` atomically within the suspension/reactivation database transaction.
- **Idempotency:** If the target user already has the requested status, the endpoint returns `200 OK` as a no-op without duplicate audit records or token changes.
- **Residual Access-Token Expiry Limitation:**
  - **Observed Behavior & Residual Window:** Super Admin routes (`requireSuperAdmin`) dynamically re-verify `User.isActive` directly against PostgreSQL on every request and reject suspended accounts immediately (`403 FORBIDDEN`). In contrast, ordinary authenticated routes (`requireAuth`) follow a stateless JWT verification model, cryptographically verifying the access token without querying `User.isActive` in the database. Consequently, an already-issued access JWT remains cryptographically valid until its natural expiration, creating a residual access window of up to the configured `ACCESS_TOKEN_TTL` (configured default: 1 hour in `src/config/env.ts`).
  - **Refined Residual-Risk Disclosure:** This residual window is not zero-risk; a suspended user possessing an unexpired access JWT can continue to execute ordinary authenticated requests that rely solely on stateless token verification and do not independently re-validate user account status or otherwise deny access (such as via inactive membership/organization status checks or domain-specific authorization logic) until the access token expires.
  - **Scope & Specification Status:** Immediate invalidation or real-time blacklisting of already-issued stateless access JWTs across ordinary routes is not an approved implementation requirement based on the available SOW v1.0, PRD v1.0, and Developer Execution Plan. These authoritative sources require account suspension, session security, and refresh token revocation, but do not mandate immediate invalidation of active access tokens across all routes.
  - **Audit Limitation Note:** The locked "Fioner Super Admin Backend — Completion Status" checklist could not be located in the repository or artifact storage during the requirements audit, so its specific wording could not be independently verified.

### Super Admin Organization Management (`GET /admin/organizations`, `GET /admin/organizations/:id`, `PATCH /admin/organizations/:id/status`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`). Does not require `X-Organization-Id` or tenant membership.
- **Listing (`GET /admin/organizations`):** Supports pagination (`page, limit`), boolean status filter (`isActive`), search term (`name, slug`), and sorting (`createdAt, updatedAt, name, slug`). Returns safe projection with aggregate `_count.memberships`.
- **Detail (`GET /admin/organizations/:id`):** Path parameter `id` (CUID). Returns safe projection including `_count.memberships`. Returns `404 NOT_FOUND` for unknown organizations.
- **Status Management (`PATCH /admin/organizations/:id/status`):**
  - Path parameter `id` (CUID).
  - Body: `{ isActive: boolean, reason?: string }` (trimmed reason up to 500 characters).
  - Emits `admin.organization_deactivated` or `admin.organization_reactivated` atomically in the same PostgreSQL transaction.
  - If the target organization already has the requested status, the endpoint returns `200 OK` idempotently without duplicate mutations or audit records.
  - **Tenant Resolution Impact:** Deactivating an organization sets `Organization.isActive = false`. Protected tenant routes via `resolveTenant` immediately reject requests for inactive organizations with `403 FORBIDDEN` (`TENANT_REQUIRED`). Reactivation restores tenant-route access immediately.

### Super Admin Audit Logs Directory (`GET /admin/audit-logs`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`). Does not require `X-Organization-Id` or tenant membership.
- **Listing & Filters:**
  - Query parameters:
    - `page` (integer >= 1, default `1`)
    - `limit` (integer between 1 and 100, default `20`)
    - `search` (string, max 200 characters — searches `action`, `entity`, `entityId`, `ipAddress`)
    - `action` (string — exact action filter, e.g. `admin.user_deactivated`)
    - `entity` (string — exact entity filter, e.g. `User`)
    - `entityId` (string — exact entity identifier)
    - `actorId` (string — exact actor user ID)
    - `organizationId` (string — exact organization ID)
    - `startDate` (ISO 8601 date string — lower bound on `createdAt`)
    - `endDate` (ISO 8601 date string — upper bound on `createdAt`)
    - `sortBy` (allowed: `createdAt`, `action`, `entity`; default `createdAt`)
    - `sortOrder` (`asc` or `desc`, default `desc`)
- **Deterministic Ordering:** Sorts primarily by requested `sortBy` / `sortOrder`, with deterministic tie-breaking by `id: desc`.
- **Security & Safe Projections:**
  - Never exposes passwords, password hashes, secrets, JWT tokens, or credentials.
  - Returns `actor` summary (`id`, `email`, `firstName`, `lastName`) and `organization` summary (`id`, `name`, `slug`).
  - Metadata payload is recursively sanitized via `sanitizeAuditMetadata`.
- **Read-Only:** Strictly read-only; does not create, modify, or delete any audit records.

### Super Admin Dashboard (`GET /admin/dashboard`, `GET /admin/dashboard/executive`, `GET /admin/dashboard/alerts`, `GET /admin/dashboard/system-health`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`). Does not require `X-Organization-Id` or tenant membership.
- **Executive Dashboard (`GET /admin/dashboard`, `GET /admin/dashboard/executive`):**
  - **Query Parameters:**
    - `period`: Filter window (`today`, `last7days`, `thismonth`, `thisyear`; default: `thismonth`).
    - `startDate`, `endDate`: Optional custom ISO 8601 date range override. When provided, both parameters are required and `startDate` must be $\le$ `endDate`.
  - **Aggregated Metrics (Live Persisted DB Data):**
    - `users`: Total registered, active, inactive, super admin count, new registrations in window, and growth trend percentage.
    - `organizations`: Total platform organizations, active, inactive, new in window, and growth trend percentage.
    - `memberships`: Platform organization staff/tenant memberships (`OrganizationMember`), active memberships, and breakdown by role (`OWNER`, `ADMIN`, `TEAM_HEAD`, `EXECUTIVE`, `VIEWER`). Note: Consumer paid subscriptions belong to the unbuilt `subscriptions` domain.
    - `crm`: Platform totals for customers, leads, leads by status, and `wonDealValue` (aggregate deal value of WON leads; represents CRM deal pipeline, not settled consumer payment revenue).
    - `audit`: Total audit log count and volume recorded in the window.
  - **Recent Activity:** 5 most recent platform audit events with actor and organization summary.
  - **Unimplemented Domains:** Explicitly documents `vehicles`, `qrCodes`, `gpsDevices`, `orders`, `products`, `subscriptions`, and `payments` as `NOT_YET_BUILT` with architectural notes, avoiding fabricated counts.
- **Operational Alerts (`GET /admin/dashboard/alerts`):**
  - **Query Parameters:**
    - `severity`: Filter by `info`, `warning`, or `danger`.
    - `limit`: Maximum alerts to return (default: `20`, max: `100`).
  - **Identifies Live Anomalies:** Suspended organizations, deactivated users, active/escalated SOS emergencies (`danger` for `ESCALATED`, `warning` for `PENDING`), and high-impact security audit actions with severity weighting and counts (`total`, `filtered`, `bySeverity`).
- **System & Integration Health (`GET /admin/dashboard/system-health`):**
  - Live PostgreSQL database connectivity latency check (`SELECT 1`, marked `status: 'connected'` / `'disconnected'`, `configured: true`, `verifiedLive: true`).
  - Server process uptime, memory usage, and node runtime version.
  - Integration status for external providers (`redis`, `msg91`, `razorpay`, `exotel`) reliably establishes configuration presence:
    - `configured: true`, `status: 'configured'`, `verifiedLive: false` when required environment variables are present.
    - `configured: false`, `status: 'pending_configuration'`, `verifiedLive: false` when configuration is missing or incomplete.
    - No external provider is ever reported as live-connected (`verifiedLive: true`) without an authorized executed health check, and zero secrets/credentials are exposed.

### Customer SOS (`/sos`)
- **Authentication:** Requires authenticated user (`requireAuth`).
- **Trigger Emergency (`POST /sos/trigger`):**
  - **Body:** `{ latitude, longitude, altitude?, accuracy?, speed?, heading?, address?, vehicleReg?, triggerSource?, notes? }`
  - Idempotent: If an active emergency (`PENDING`, `ACKNOWLEDGED`, `ESCALATED`) already exists for the user, returns the active event with `200 OK`.
  - Dispatches emergency notifications to user's saved emergency contacts (marked `UNCONFIGURED_PROVIDER` until MSG91/FCM live credentials are authorized).
  - Persists audit log (`sos.triggered`).
- **Get Active Emergency (`GET /sos/active`):**
  - Returns current active emergency event if any, or `{ event: null }`.
- **Get Incident History (`GET /sos/history`):**
  - Returns paginated history of SOS incidents for the calling user.
- **Cancel Emergency (`POST /sos/:id/cancel`):**
  - Allowed only for incident owner while incident is `PENDING` or `ACKNOWLEDGED`. Transitions to `RESOLVED` with resolution notes.
  - Persists audit log (`sos.cancelled`).
- **Emergency Contacts (`/sos/contacts`):**
  - `GET /sos/contacts`: List caller's emergency contacts (up to 5 max).
  - `POST /sos/contacts`: Add contact (`name`, `phone`, `relationship`, `isPrimary`).
  - `PATCH /sos/contacts/:id`: Update contact.
  - `DELETE /sos/contacts/:id`: Remove contact.

### Super Admin SOS & Incident Response (`/admin/sos`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **List Incidents (`GET /admin/sos`):**
  - **Query Parameters:**
    - `page`, `limit` (pagination)
    - `status` (`PENDING`, `ACKNOWLEDGED`, `ESCALATED`, `RESOLVED`)
    - `search` (searches vehicle reg, user name, email, phone, address)
    - `startDate`, `endDate` (ISO date filter)
    - `sortBy` (`createdAt`, `status`; default `createdAt`)
    - `sortOrder` (`asc`, `desc`; default `desc`)
  - Returns list with user summary, notified contacts count, and coordinates.
- **Get Incident Detail (`GET /admin/sos/:id`):**
  - Returns incident details with full contact notification records, audit timeline, and reporter user profile.
- **Acknowledge Incident (`POST /admin/sos/:id/acknowledge`):**
  - Transitions `PENDING` -> `ACKNOWLEDGED`. Idempotent if already acknowledged.
  - Records timeline item and transactional audit log (`admin.sos_acknowledged`).
- **Escalate Incident (`POST /admin/sos/:id/escalate`):**
  - Transitions `PENDING` or `ACKNOWLEDGED` -> `ESCALATED`.
  - Requires `reason` in body.
  - Records timeline item and transactional audit log (`admin.sos_escalated`).
- **Resolve Incident (`POST /admin/sos/:id/resolve`):**
  - Transitions active incident -> `RESOLVED` (terminal state).
  - Requires `notes` in body.
  - Records timeline item and transactional audit log (`admin.sos_resolved`).
- **Re-notify Emergency Contacts (`POST /admin/sos/:id/notify`):**
  - Dispatches contact notifications; records retry attempt without claiming unverified SMS/push delivery.

### Super Admin Vehicles (`/admin/vehicles`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **List Vehicles (`GET /admin/vehicles`):**
  - Returns paginated list with owner profile, document reminder status, and QR/GPS links.
  - Supports query filters: `search`, `fuel`, `page`, `limit`, `sortBy`, `sortOrder`.
- **Get Vehicle Detail (`GET /admin/vehicles/:id`):**
  - Returns vehicle details, owner identity, document reminder calculations, live QR code link status, and audit activity.

### Super Admin QR Code Management (`/admin/qr`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **List QR Inventory (`GET /admin/qr`):**
  - Query parameters: `page`, `limit`, `search` (searches code, batch, vehicle reg, owner), `status` (`AVAILABLE`, `ASSIGNED`, `ACTIVE`, `SUSPENDED`, `REPLACED`, `DEACTIVATED`), `batch`, `sortBy`, `sortOrder`.
  - Returns paginated QR code cards/rows with associated vehicle, owner, batch, and scan counts.
- **Get QR Code Detail (`GET /admin/qr/:id`):**
  - Returns QR detail including current status, linked vehicle/owner, total scans, recent scan logs, and full assignment history timeline.
- **Batch Generate / Import (`POST /admin/qr/batch`):**
  - Body: `{ batchName?, quantity?, codes? }`.
  - If `quantity` is specified, generates `quantity` unique random QR codes (`QRR-XXXXXX`) in `AVAILABLE` status within the specified batch.
  - If `codes` list is provided, imports predefined codes atomically, rejecting internal duplicates or collisions against existing codes with `409 CONFLICT`.
  - Records transactional audit log (`admin.qr_batch_generated` or `admin.qr_batch_imported`).
- **Assign QR to Vehicle (`POST /admin/qr/:id/assign`):**
  - Body: `{ vehicleId, notes? }`.
  - Enforces single active QR per vehicle constraint: rejects with `409 CONFLICT` if the target vehicle already has an active QR.
  - Rejects assignment if the QR code is in a terminal retired state (`REPLACED` or `DEACTIVATED`).
  - Records new assignment history entry and audit log (`admin.qr_assigned`).
- **Replace QR Code (`POST /admin/qr/:id/replace`):**
  - Body: `{ replacementQrId?, replacementCode?, reason?, notes? }`.
  - Marks current QR as `REPLACED`, terminates its active association in `qr_assignment_history`, and unbinds vehicle.
  - Associates target vehicle with replacement QR code (auto-generated or selected from available inventory) in `ASSIGNED` state.
  - Retains complete historical association in `qr_assignment_history`.
  - Records transactional audit log (`admin.qr_replaced`).
- **Suspend QR Code (`POST /admin/qr/:id/suspend`):**
  - Body: `{ reason? }`.
  - Transitions QR state to `SUSPENDED`, temporarily blocking public resolution.
  - Records transactional audit log (`admin.qr_suspended`).
- **Reactivate QR Code (`POST /admin/qr/:id/reactivate`):**
  - Body: `{ notes? }`.
  - Transitions a `SUSPENDED` QR back to `ACTIVE` (if vehicle remains linked) or `AVAILABLE` (if unlinked).
  - Records transactional audit log (`admin.qr_reactivated`).
- **Deactivate QR Code (`POST /admin/qr/:id/deactivate`):**
  - Body: `{ reason?, notes? }`.
  - Transitions QR state to `DEACTIVATED` (permanent terminal state) and unbinds vehicle.
  - Closes active assignment history and records transactional audit log (`admin.qr_deactivated`).
- **List QR Scan Logs (`GET /admin/qr/:id/scans`):**
  - Returns paginated list of public scan events (`scannedAt`, `ipAddress`, `userAgent`, `city`, `actionTaken`).

### Customer Vehicles & QR Linkage (`/vehicles`)
- **Authorization:** Authenticated user (`requireAuth`), canonical `User.id` scoping.
- **List User Vehicles (`GET /vehicles`):** Returns caller's registered vehicles with document reminder statuses and linked QR summary.
- **Register Vehicle (`POST /vehicles`):** Body: `{ reg, model, fuel, mileage?, docExpiry?, isDefault?, documents? }`.
- **Get Vehicle (`GET /vehicles/:id`):** Returns vehicle details if owned by caller.
- **Update Vehicle (`PATCH /vehicles/:id`):** Updates vehicle fields and documents.
- **Delete Vehicle (`DELETE /vehicles/:id`):** Cascades documents and records audit log.
- **Link / Activate QR (`POST /vehicles/:id/qr`):** Body: `{ code }`. Validates caller ownership, verifies QR is available, enforces single-active-QR constraint, sets QR to `ACTIVE`, and records history.
- **Unlink QR (`DELETE /vehicles/:id/qr`):** Unlinks active QR from vehicle, returning QR to `AVAILABLE` state.

### Super Admin Inventory & Warehousing (`/admin/inventory`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **Stock Dashboard (`GET /admin/inventory/stock-dashboard`, alias: `GET /admin/inventory/stock`):** Real-time aggregate telemetry across all warehouses (total products, in-stock count, low stock warnings, out-of-stock items, total inventory value in paise).
- **Products Catalog (`GET /admin/inventory/products`, `POST /admin/inventory/products`, `GET /admin/inventory/products/:id`, `PUT /admin/inventory/products/:id`):** Full CRUD for hardware products (QR tags, GPS trackers, accessories) with category filters, unit price, and SKU constraints.
- **Stock Adjustment (`POST /admin/inventory/products/:id/adjust`):** Manual stock level adjustment (`quantityDelta`, `reason`, `warehouseId`).
- **Warehouses Directory (`GET /admin/inventory/warehouses`, `POST /admin/inventory/warehouses`, `GET /admin/inventory/warehouses/:id`, `PUT /admin/inventory/warehouses/:id`):** Multi-warehouse configuration and location management.
- **Stock Movements (`GET /admin/inventory/movements`):** Immutable audit ledger of all stock transitions (`RESERVATION`, `DISPATCH`, `RETURN`, `ADJUSTMENT`).
- **Serial & IMEI Tracking (`GET /admin/inventory/serial-imei`):** Hardware device inventory by individual serial number / IMEI, batch, status (`AVAILABLE`, `ALLOCATED`, `DEFECTIVE`), and warehouse.

### Super Admin Consumer Memberships (`/admin/memberships`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **Membership Plans (`GET /admin/memberships/plans`, `POST /admin/memberships/plans`, `GET /admin/memberships/plans/:id`, `PUT /admin/memberships/plans/:id`):** Management of consumer membership tiers (e.g. Free, Silver, Gold, Platinum) with benefits list, entitlements, pricing, and billing interval (`ANNUAL`, `MONTHLY`).
- **Subscriptions Desk (`GET /admin/memberships/subscriptions`, `GET /admin/memberships/subscriptions/:id`, `PATCH /admin/memberships/subscriptions/:id/status`):** Active consumer subscription tracking, user link, validity dates, auto-renewal flag, and administrative cancellation/suspension.
- **Renewals Desk (`GET /admin/memberships/renewals`):** Identifies subscriptions approaching expiration (configurable lookahead days) with renewal notification logs.
- **Subscription Renewal Reminder (`POST /admin/memberships/subscriptions/:id/remind`):** Dispatches renewal notification to member (emits audit event; provider status reported truthfully as unconfigured if carrier integration is offline).

### Super Admin Hardware Orders & Refunds (`/admin/orders`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **List Orders (`GET /admin/orders`):** Paginated directory of hardware purchases with status filters (`PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, `CANCELLED`, `RETURNED`), search, and date bounds.
- **Order Details (`GET /admin/orders/:id`):** Comprehensive order record including line items, shipping address, fulfillment status, and payment summary.
- **Order Lifecycle Update (`PATCH /admin/orders/:id/status`):** State machine transitions enforcing inventory reserving and releasing invariants.
- **Refund Management (`POST /admin/orders/:id/refund`):**
  - Body: `{ amount?: number, reason?: string }` (paise).
  - Enforces adversarial refund safety: rejects refunds on unpaid orders, prevents over-refund beyond captured amount, and acquires transactional database row locks.
  - Sets order status to `REFUND_PENDING` / `REQUESTED` in PostgreSQL without falsely claiming external settlement until provider webhook confirms.

### Super Admin GPS & Telematics (`/admin/gps`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`).
- **Device Management (`GET /admin/gps`, `POST /admin/gps`, `GET /admin/gps/:id`):** Hardware GPS tracker registry by IMEI, device model, firmware, and SIM phone number.
- **Vehicle Assignment (`POST /admin/gps/:id/assign`):** Binds GPS device to vehicle; rejects duplicate active tracker assignments.
- **Vehicle Unbind (`POST /admin/gps/:id/unbind`):** Safely detaches GPS device from vehicle while preserving past telemetry and trip history.
- **Trips & Telematics (`GET /admin/gps/:id/trips`):** Historical vehicle trips, route waypoints, distance, and duration.
- **Geofences (`GET /admin/gps/:id/geofences`, `POST /admin/gps/:id/geofences`):** Circular and polygonal boundary definitions with alert triggers on enter/exit.

### Super Admin Support Desk (`/admin/support`)
- **Authorization:** Requires active Super Admin authentication (`isSuperAdmin: true`, `isActive: true`). Rejects unauthenticated callers with `401 UNAUTHENTICATED` and non-super-admin callers with `403 FORBIDDEN`.
- **Supported Ticket Statuses:** `OPEN`, `IN_PROGRESS`, `ESCALATED`, `RESOLVED`. (Statuses such as `CLOSED`, `DRAFT`, `ARCHIVED`, or `PENDING` are strictly rejected with `400 VALIDATION_ERROR`).
- **Supported Priorities:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

#### Endpoints

1. **Support Analytics (`GET /admin/support/analytics`):**
   - Returns aggregate operational support telemetry directly from PostgreSQL:
     - `totalTickets`, `openTickets`, `inProgressTickets`, `escalatedTickets`, `resolvedTickets`, `aiEscalatedCount`, `unassignedCount`.
     - `byCategory` and `byPriority` breakdowns.
   - **Truthful Metric Boundaries:**
     - `firstResponse`: Returned as `{ percentage: null, status: "UNCONFIGURED", reason: "Authoritative SLA window not defined" }`. Synthetic placeholders are prohibited.
     - `aiContainment`: Returned as `{ percentage: null, status: "UNAVAILABLE", reason: "Customer AI conversation data deferred" }`. Synthetic placeholders are prohibited.

2. **AI Escalation Queue (`GET /admin/support/ai-escalations`):**
   - Query Parameters: Identical to ticket listing (`page`, `limit`, `status`, `priority`, `category`, `search`).
   - Automatically filters tickets to `aiEscalated: true` for administrative triage.

3. **Ticket Directory & Triage (`GET /admin/support/tickets`):**
   - Query Parameters:
     - `page` (integer >= 1, default: 1)
     - `limit` (integer between 1 and 100, default: 20)
     - `status` (`OPEN` | `IN_PROGRESS` | `ESCALATED` | `RESOLVED`)
     - `priority` (`LOW` | `MEDIUM` | `HIGH` | `URGENT`)
     - `category` (string, case-insensitive match)
     - `assignedToId` (string CUID/UUID)
     - `unassigned` (boolean string `true` / `false` — filters `assignedToId: null`)
     - `aiEscalated` (boolean string `true` / `false`)
     - `search` (searches subject, ID, customer name, user email)
   - Returns paginated ticket list ordered by `createdAt: desc` with attached summary relations (`user`, `vehicle`, `customer`, `organization`, `assignedTo`, `_count.messages`).

4. **Ticket Detail (`GET /admin/support/tickets/:id`):**
   - Returns full ticket details including full relations and all `messages` ordered chronologically (`createdAt: asc`).
   - Rejects missing ticket with `404 NOT_FOUND`.

5. **Ticket Status Transition (`PATCH /admin/support/tickets/:id/status`):**
   - Body: `{ status: "OPEN" | "IN_PROGRESS" | "ESCALATED" | "RESOLVED" }`.
   - **Lifecycle & Reopening Semantics:**
     - Transitioning to `RESOLVED` sets `resolvedAt: new Date()`.
     - Transitioning from `RESOLVED` back to `OPEN`, `IN_PROGRESS`, or `ESCALATED` (reopening) atomically resets `resolvedAt: null` and sets `reopened: true` in the audit metadata.
     - Redundant transitions to the same status are idempotent and bypass duplicate audit emission.
     - Atomically records audit event `support_ticket.status_updated`.

6. **Ticket Staff Assignment (`POST /admin/support/tickets/:id/assign`):**
   - Body: `{ assignedToId: string | null }`.
   - **Assignment Constraints:**
     - Setting `assignedToId: null` explicitly unassigns the ticket and records `unassigned: true` in audit metadata.
     - Providing a user ID requires the assignee to exist, have `isActive: true`, and have `isSuperAdmin: true`. Inactive users or non-super-admins are rejected with `400 BAD_REQUEST`.
     - Atomically records audit event `support_ticket.assigned`.

7. **Append Message (`POST /admin/support/tickets/:id/messages`):**
   - Body: `{ message: string (min 1 char) }`.
   - Injects a new message with `senderType: 'ADMIN'` and `senderId: req.auth.userId`.
   - Returns HTTP `201 CREATED`.

#### Identity Invariant Rules (Retail vs. B2B / Fleet Tickets)
- **Customer Organization Scope:** `customerId` requires a valid `organizationId`. The customer record must belong to that organization.
- **Vehicle / User Ownership:** `vehicleId` requires a valid platform `userId`. The vehicle record must belong to that user.
- **CRM Ticket Vehicle Exclusion:** A ticket without a platform `userId` cannot have a `vehicleId`.
- **Retail / Consumer Tickets:** Valid global retail tickets permit `organizationId: null` and `customerId: null`, with valid `userId` and associated `vehicleId`.

---

## Phase 3C: CMS and Notification Campaigns

All CMS and notification campaign endpoints require active Super Admin authorization (`requireAuth` + `requireSuperAdmin`).

### 1. CMS Banners (`/api/v1/admin/banners`)
- **GET `/api/v1/admin/banners`**: Returns paginated list of promotional banners. Query filters: `status` ('draft' | 'scheduled' | 'live' | 'paused' | 'archived'), `search`, `page`, `limit`.
- **GET `/api/v1/admin/banners/:id`**: Returns single banner by ID or `404 NOT_FOUND`.
- **POST `/api/v1/admin/banners`**: Creates a new banner. Fields: `title` (required, max 255), `schedule` (max 100), `status` (default: 'draft'), `targetUrl` (safe http/https/relative URL), `imageUrl`, `priority`. Records audit event `admin_banner.created`.
- **PATCH `/api/v1/admin/banners/:id`**: Updates banner properties. Records audit event `admin_banner.updated`.
- **PATCH `/api/v1/admin/banners/:id/status`**: Toggles status between `live` and `paused`/`draft`. Records audit event `admin_banner.status_updated`.
- **DELETE `/api/v1/admin/banners/:id`**: Removes banner from database. Records audit event `admin_banner.deleted`.

### 2. Notification Campaigns (`/api/v1/admin/campaigns`)
- **GET `/api/v1/admin/campaigns/audience-preview`**: Calculates eligible recipient count for an audience segment against live database records. Query parameter: `audience` ('All active users' | 'Expiring in 15 days' | 'Balance < ₹100' | 'Users without emergency contact').
- **GET `/api/v1/admin/campaigns`**: Returns paginated list of campaigns. Query filters: `status` ('Draft' | 'Scheduled' | 'Sent' | 'Cancelled'), `channel`, `search`, `page`, `limit`.
- **GET `/api/v1/admin/campaigns/:id`**: Returns single campaign by ID or `404 NOT_FOUND`.
- **POST `/api/v1/admin/campaigns`**: Creates a new draft campaign. Fields: `name` (required, max 255), `channel` ('SMS' | 'Push' | 'Email' | 'SMS + Push' | 'Email + Push' | 'In-app'), `audience` (one of the 4 approved segments), `message` (max 2000), `status` (default: 'Draft'), `scheduledAt`. Records audit event `admin_campaign.created`.
- **PATCH `/api/v1/admin/campaigns/:id`**: Updates draft campaign. Rejected with `400 BAD_REQUEST` if campaign status is already `Sent`. Records audit event `admin_campaign.updated`.
- **POST `/api/v1/admin/campaigns/:id/send`**: Triggers truthful simulated execution: calculates target audience size, transitions status to `Sent`, sets `sentAt: now()`, records `isSimulated: true`, updates target recipient count, and logs `admin_campaign.sent` audit entry. Repeated dispatch requests are rejected with `400 BAD_REQUEST`.
- **DELETE `/api/v1/admin/campaigns/:id`**: Deletes campaign. Records audit event `admin_campaign.deleted`.

### 3. FAQ and Help Content
FAQ management in the Super Admin CMS directly reuses the Phase 3A AI Knowledge Base (`/api/v1/admin/ai/knowledge`), ensuring unified governance and avoiding duplicated models.

---

## Phase 3D: CRM Visibility, Integration Health, and Platform Permissions

All Phase 3D administrative endpoints require active Super Admin authorization (`requireAuth` + `requireSuperAdmin`).

### 1. Cross-Organization CRM Visibility (`/api/v1/admin/crm`)
- **GET `/api/v1/admin/crm/overview`**: Returns real-time aggregate CRM telemetry across all platform organizations:
  - `totalLeads`: Total leads in database.
  - `wonLeads`: Total leads with status `WON`.
  - `conversionRate`: Integer percentage (`wonLeads / totalLeads * 100`), or `0` if zero leads.
  - `callsToday`: Count of `CallRecord` entries created on or after start of today.
  - `leadFunnel`: Complete breakdown across all 7 canonical statuses (`NEW`, `CONTACTED`, `QUALIFIED`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`), with 0 count for unpopulated stages.
- **GET `/api/v1/admin/crm/calls`**: Paginated read-only directory of platform call records.
  - Query parameters: `page`, `limit`, `search` (customer or lead name), `type` (`AI` | `HUMAN`), `status`.
  - Returns items with `customerName`, `type`, `agent`, `outcome`, `durationSec`, `ts`, and owning `organization`.
- **GET `/api/v1/admin/crm/leads`**: Paginated read-only directory of leads across organizations.
  - Query parameters: `page`, `limit`, `search` (lead name or phone), `status` / `stage`.
  - Returns items with `name`, `phone`, `email`, `company`, `stage`, `source`, `owner`, `ts`, and owning `organization`.
- **Operational Boundary**: Super Admin CRM endpoints are strictly **read-only read-through visibility**. Lead mutations, creation, transitions, and calls are operationally owned by the tenant CRM app (`/api/v1/crm/*`).

### 2. Integration Health (`/api/v1/admin/integrations`)
- **GET `/api/v1/admin/integrations`**: Returns the canonical 9-item catalog of platform integrations:
  - `PostgreSQL`, `Razorpay`, `Exotel`, `MSG91`, `Akrix / Surepass`, `Google Maps Platform`, `Google Cloud STT/TTS`, `Shiprocket`, `Firebase FCM`.
  - **Truthful Status Semantics**:
    - `connected` (`verifiedLive: true`): Real live ping succeeded against locally managed infrastructure (PostgreSQL `SELECT 1`).
    - `configured` (`verifiedLive: false`): External provider required environment credentials are present and formatted, but no live connection is claimed or probed.
    - `pending_configuration` (`verifiedLive: false`): Configuration is missing or incomplete.
    - Zero secret exposure: Credentials, API keys, and connection strings are strictly omitted from all responses.
- **POST `/api/v1/admin/integrations/:id/test`**: Executes non-destructive connection verification.
  - PostgreSQL: Performs live database ping (`SELECT 1`), records latency, emits `admin_integration.tested` audit event.
  - External Gateways: Performs local configuration verification without firing external HTTP requests. Emits `admin_integration.tested` audit event with safe metadata.
  - **Limitation Note**: External gateway checks do NOT trigger real outbound HTTP network calls, initiate payments, send SMS, or trigger IVR telephony calls.

### 3. Platform Roles & Permission Governance (`/api/v1/admin/roles`)
- **GET `/api/v1/admin/roles`**: Returns the canonical platform role:
  - Roles: `Super Admin` (`perms: 'all'`).
  - Modules: `Users`, `Vehicles`, `QR`, `GPS`, `Orders`, `Inventory`, `Membership`, `SOS`, `Support`, `AI`, `CRM`, `Content`, `Reports`, `Settings`.
  - Actions: `view`, `edit`, `delete`.
- **PATCH `/api/v1/admin/roles/:id`**: Updates permissions for platform staff roles.
  - Super Admin Immutability Invariant: Requests attempting to modify `role_1` (Super Admin) are rejected with `400 BAD_REQUEST`.
  - Audit: Emits `admin_role.permissions_updated` audit event only after successful database transaction commit.
  - **Authoritative Persistence Architecture**:
    - Backed by the PostgreSQL `platform_roles` table (`PlatformRole` Prisma model).
    - Concurrency Safety: Updates execute inside an isolated transaction with optimistic version tracking (`version: { increment: 1 }`) to eliminate silent lost updates under concurrent mutations.
    - Fail-Closed Bootstrap: When the database is uninitialized, the system validates and imports from `backend/data/platform-roles.json`, preserving existing customizations (such as `role_3` CRM delete revocation). If the bootstrap artifact is missing or malformed, initialization fails closed with an explicit error rather than silently degrading.
    - Durability: Once seeded, PostgreSQL is the sole source of truth. Restarting the backend or re-running bootstrap never overwrites database records.
    - Write Failure Handling: Database write failures immediately roll back and return an error; no success response or audit log is emitted on failure.
    - Deployment Migration: Migration `20261021030000_add_platform_roles_domain` is additive. Apply using `prisma migrate deploy` against the authorized database on port 5433.
  - **Architectural Boundary**: This endpoint configures staff governance and catalog presets; it does NOT establish dynamic runtime RBAC enforcement across backend endpoints. Binary administrative access remains governed strictly by `User.isSuperAdmin` through `requireSuperAdmin`.

---

## Deferred Integrations & External Gateways (Phase 3 Backlog)

The following areas are intentionally deferred from Phase 2 and isolated:
- **Live external gateways:** MSG91 SMS dispatch, Exotel automated IVR calling, live Razorpay payment capture and refund settlement, Shiprocket courier dispatch and tracking webhooks.
- **Phase 3C Deferred Risks (Preserved):**
  - **Risk A — Low-balance campaign audience:** The `Balance < ₹100` audience remains unconfigured due to deferred consumer wallet/FASTag model.
  - **Risk B — Campaign dispatch concurrency:** Campaign send uses check-then-act pattern; atomic conditional update is deferred.
- **AI Console:** Autonomous support bot configuration and query analytics.
- **Marketing Campaigns:** Bulk promotional campaigns and email/SMS blast engines.
- **Consumer Mobile Application:** Dedicated Flutter mobile applications and consumer-facing vehicle onboarding portal.

