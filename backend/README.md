# Fioner — Backend API

Express 4 + TypeScript + Prisma (PostgreSQL). Multi-tenant: every user belongs to one
or more organizations, and all business data is scoped to an organization.

Serves all four frontends (`app`, `crm`, `super-admin`, `website`).

---

## 1. Get running in 5 minutes

You need **Node 20+** and **Docker** (for Postgres + Redis).

```bash
git clone <repo-url> Fioner
cd Fioner/backend

cp .env.example .env          # then generate real secrets, see below
npm install                   # runs `prisma generate` automatically
npm run db:up                 # starts Postgres 5432 + Redis 6379 in Docker
npm run prisma:migrate        # creates tables (name the migration when asked)
npm run seed                  # demo org + users + leads
npm run dev                   # http://localhost:4000/api/v1
```

Generate the two secrets `.env` file needs:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Check it works:

```bash
curl http://localhost:4000/api/v1/health/ready
```

### Seeded logins

All use the password `Password123`:

| Email | Role |
| --- | --- |
| `owner@fioner.test` | OWNER |
| `admin@fioner.test` | ADMIN |
| `member@fioner.test` | MEMBER |
| `admin@connect.com` | super admin (no org) |

Open `requests.http` in VS Code (REST Client extension) to hit the API without Postman.

---

## 2. Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload (tsx watch) |
| `npm run build` / `npm start` | Compile to `dist/` and run the compiled output |
| `npm run typecheck` | `tsc --noEmit` — run before every push |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` | Prettier |
| `npm test` / `npm run test:watch` | Vitest |
| `npm run db:up` / `npm run db:down` | Start/stop Postgres + Redis |
| `npm run prisma:migrate` | Create + apply a migration in dev |
| `npm run prisma:deploy` | Apply migrations in CI/prod (never `migrate dev`) |
| `npm run prisma:studio` | Browse the database in a GUI |
| `npm run db:reset` | Drop, re-migrate, re-seed (destroys local data) |
| `npm run seed` | Re-run the seed |
| `npm run gen:module -- products` | Scaffold a new module (see below) |

---

## 3. Folder map

```
backend/
├── prisma/
│   ├── schema/              # one .prisma file per domain (NOT one big file)
│   ├── migrations/          # generated — always commit these
│   └── seed.ts
├── src/
│   ├── config/              # env, database, logger, cors — no business logic
│   ├── common/
│   │   ├── middleware/      # auth, tenant, authorize, validate, error, rateLimit
│   │   ├── utils/           # ApiError, ApiResponse, pagination, jwt, password
│   │   ├── constants/       # HTTP codes, error codes, roles
│   │   ├── types/           # Express request augmentation
│   │   └── validators/      # shared zod schemas
│   ├── modules/             # feature modules (see the contract below)
│   ├── routes/index.ts      # public vs private router groups, /api/v1
│   ├── app.ts               # builds the Express app (no port binding)
│   └── server.ts            # boots, listens, handles graceful shutdown
├── tests/
├── scripts/generate-module.ts
└── docs/                    # architecture, conventions, git workflow, API
```

---

## 4. The module contract

Every module is the same five files. Nothing skips a layer.

```
modules/<feature>/
├── <name>.routes.ts       paths + middleware only
├── <name>.controller.ts   read req -> call service -> ApiResponse. No business rules.
├── <name>.service.ts      ALL business rules. Never touches req/res.
├── <name>.repository.ts   Prisma queries only. No business rules.
└── <name>.schema.ts       zod input schemas + inferred types
```

Rules:

- A **controller never imports Prisma**. A **service never imports express**.
- Throw `ApiError.notFound('Lead')` — never `res.status(404)` inside a service.
- Every response goes through `ApiResponse.ok/created/noContent`, so all four
  frontends can unwrap `{ success, data, meta }` in one shared client.
- Every handler is wrapped in `asyncHandler(...)` or thrown errors are lost.

Scaffold a new one instead of copy-pasting:

```bash
npm run gen:module -- products
npm run gen:module -- crm/customers
```

Then: add the model to `prisma/schema/`, register it in `TENANT_MODELS`
(`src/config/database.ts`), mount the router in `src/routes/index.ts`.

Read `src/modules/crm/leads/` first — it is the reference implementation.

---

## 5. Multi-tenancy (read this before writing a query)

Every tenant row carries `organizationId`. Requests carry it in the
`X-Organization-Id` header; `resolveTenant` verifies the caller's membership and
sets `req.tenant = { organizationId, membershipId, role }`.

In repositories, use `tenantClient(organizationId)` instead of the bare `prisma`
client. It injects `organizationId` into every `where` and `data`, so a forgotten
filter cannot leak another tenant's rows:

```ts
const db = tenantClient(organizationId);
await db.lead.findMany();            // WHERE organization_id = '...'
await db.lead.create({ data });      // organizationId set for you
await db.lead.findFirst({ where: { id } });  // findUnique is blocked on tenant models
```

Two hard rules:

1. Add every new tenant model to `TENANT_MODELS` in `src/config/database.ts`.
2. Never pass a user-supplied `organizationId` from the body or query into a
   query. The only trusted source is `req.tenant.organizationId`.

---

## 6. Auth model

- **Access token**: JWT, 15 min, sent as `Authorization: Bearer <token>`.
- **Refresh token**: opaque random string, 30 days, stored only as a SHA-256 hash
  and **rotated** on every refresh. Reuse of a revoked token revokes every session
  for that user.
- **Roles** (`OWNER > ADMIN > MANAGER > MEMBER > VIEWER`) live on `Membership`, so
  one person can be an ADMIN in one org and a VIEWER in another. Guard routes with
  `requireMinRole(Role.ADMIN)` or `requireRole(Role.OWNER, Role.ADMIN)`.
- `isSuperAdmin` lives on `User` and is for the `super-admin` app only.

---

## 7. Docs

| File | Contents |
| --- | --- |
| `docs/ARCHITECTURE.md` | Request lifecycle, layering, what goes where |
| `docs/CONVENTIONS.md` | Naming, errors, responses, validation, logging |
| `docs/GIT_WORKFLOW.md` | Branches, commits, PRs, how two devs avoid collisions |
| `docs/API.md` | Endpoint reference + response envelope |
| `docs/TESTING.md` | Unit vs integration tests |
| `requests.http` | Ready-to-run requests for VS Code REST Client |

---

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid environment configuration` on boot | A var is missing in `.env`; the message names it. Secrets must be 32+ chars. |
| `Can't reach database server at localhost:5432` | `npm run db:up`, then `docker ps` to confirm. |
| `@prisma/client did not initialize yet` | `npm run prisma:generate` |
| Types missing after pulling a schema change | `npm install && npm run prisma:generate` |
| Migration conflict after a merge | `npm run db:reset` locally; never edit an applied migration file. |
| CORS error in the browser | Add the frontend origin to `CORS_ORIGINS` in `.env`. |
| `findUnique is not allowed on tenant model` | Use `findFirst({ where: { id } })` — that error is intentional. |
