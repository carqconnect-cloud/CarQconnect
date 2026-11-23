# Git workflow (2 developers)

## Branches

```
main       always deployable, protected, no direct pushes
develop    integration branch, both devs branch from here
feature/*  one branch per task
```

Branch names: `feature/crm-lead-import`, `fix/refresh-token-rotation`,
`chore/upgrade-prisma`.

## Commits

Conventional Commits — CI and changelogs depend on the prefix:

```
feat(crm): add lead status filter
fix(auth): revoke sibling sessions on refresh reuse
refactor(users): move owner check into service
chore(deps): bump prisma to 6.14
docs(api): document pagination meta
```

Small and frequent. One concern per commit.

## Day-to-day

```bash
git checkout develop && git pull
git checkout -b feature/orders-module

# work, then before pushing:
npm run lint && npm run typecheck && npm test

git push -u origin feature/orders-module
# open a PR into develop, assign the other dev
```

Rebase on `develop` rather than merging it in, so history stays linear:

```bash
git fetch origin && git rebase origin/develop
```

## Splitting work so you do not collide

The module structure is the split. Agree on module ownership per sprint:

| Dev | Owns |
| --- | --- |
| A | `auth`, `users`, `organization`, `admin` |
| B | `crm`, `products`, `orders`, `subscriptions` |

Shared files are the collision risk — `src/routes/index.ts`, `prisma/schema/*`,
`src/common/*`. When touching those:

- Announce it before you start.
- Keep the change small and merge it fast.
- Prefer adding a new `prisma/schema/<domain>.prisma` file over editing someone
  else's.

## Migrations with two people

This is the number-one source of pain. The rules:

1. Only create a migration when your schema change is final.
2. Name it: `npx prisma migrate dev --name add_orders_table`.
3. Pull and rebase **before** creating a migration, so yours is last.
4. If you both created migrations from the same parent, the second person deletes
   their local migration folder, rebases, and regenerates it.
5. After pulling someone's migration: `npm install && npm run prisma:migrate`.
6. Broken local DB: `npm run db:reset` — it drops, re-migrates and re-seeds.
7. Never edit a migration that has been pushed. Write a new one.

## PR checklist

The template in `.github/pull_request_template.md` covers it. The reviewer checks:

- Layer boundaries respected (no Prisma in controllers, no `res` in services).
- Every new tenant query is scoped, and new tenant models are in `TENANT_MODELS`.
- Inputs validated with zod; errors thrown as `ApiError`.
- `.env.example` updated if a new env var was added.

## Releasing

`develop` -> PR into `main` -> tag. Deploy runs `npm ci`, `prisma migrate deploy`,
`npm run build`, `npm start`. Never run `prisma migrate dev` against production.
