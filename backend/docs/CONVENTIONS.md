# Conventions

Two people writing the same backend only stays readable if the boring choices are
already made. These are the boring choices.

## Naming

| Thing | Convention | Example |
| --- | --- | --- |
| Folders | kebab-case, plural for collections | `modules/users/`, `modules/crm/leads/` |
| Files | `<singular>.<layer>.ts` | `lead.service.ts`, `user.repository.ts` |
| Prisma models | PascalCase singular, `@@map` to snake_case plural | `model Lead { ... @@map("leads") }` |
| DB columns | camelCase in Prisma, snake_case table names | `organizationId` -> `organization_id` |
| Routes | kebab-case, plural nouns | `POST /crm/leads`, `POST /auth/switch-organization` |
| Exported objects | camelCase | `leadService`, `userRepository` |
| Types/interfaces | PascalCase, no `I` prefix | `AuthResult`, not `IAuthResult` |
| Env vars | SCREAMING_SNAKE_CASE | `JWT_ACCESS_SECRET` |
| Zod schemas | `<action><Entity>Schema` | `createLeadSchema`, `listUsersSchema` |

Backend module names match the frontend they serve: backend `admin` module serves
the `super-admin` app, backend `crm` module serves the `crm` app. If you rename
one, rename both in the same PR.

## HTTP

- Base path `/api/v1`. Breaking changes get `/api/v2`, they never mutate v1.
- `GET` list, `GET /:id` read, `POST` create, `PATCH` partial update,
  `DELETE` remove. No `PUT` unless you truly replace the whole resource.
- `201` for create, `204` for delete, `200` for everything else.
- List endpoints always accept `page`, `limit`, `sortBy`, `sortOrder`, `search`
  (via `paginationSchema`) and always return pagination `meta`.

## Response envelope

Success:

```json
{ "success": true, "data": { }, "meta": { "pagination": { } } }
```

Error:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [] },
  "requestId": "0f8b..."
}
```

Frontends switch on `error.code`, never on `error.message`. Add new codes to
`ErrorCode` in `src/common/constants/http.ts` so they are discoverable.

## Errors

```ts
throw ApiError.notFound('Lead');
throw ApiError.badRequest('Current password is incorrect');
throw ApiError.forbidden('Requires ADMIN access');
```

- Never `res.status(...).json(...)` an error by hand — go through `ApiError`.
- Never swallow an error with an empty `catch {}` unless you write why.
- Prisma `P2002` / `P2025` are already mapped to 409 / 404 in the error handler.
- Auth failures say "Invalid email or password" for both unknown email and wrong
  password. Do not "improve" that message — it leaks which emails exist.

## Validation

- Validate **everything** that crosses the boundary in `*.schema.ts` with zod.
- Use `validate({ body, query, params })` in the route, not inside the controller.
- Derive types with `z.infer` instead of hand-writing a duplicate interface.
- `sortBy` is always checked against an allow-list (`getSortArgs`) — never pass raw
  input into Prisma `orderBy`.

## Logging

- Use the pino `logger`, never `console.log` (ESLint will fail the build).
- Structured first arg, message second: `logger.info({ userId }, 'User registered')`.
- Never log a password, token, or full request body. `logger` redacts the common
  fields, but do not rely on it.

## Async

- Wrap every async route handler in `asyncHandler`.
- Prefer `Promise.all` for independent queries; use `prisma.$transaction` when two
  writes must succeed or fail together.

## Git hygiene inside the backend

- Commit `prisma/migrations/` — never edit a migration that is already applied.
- Never commit `.env`. Add any new var to `.env.example` **and** `src/config/env.ts`
  in the same commit, or the other developer's boot will fail.
