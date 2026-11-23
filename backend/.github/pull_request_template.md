## What changed

<!-- One or two lines. Link the issue: Closes #123 -->

## Type

- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] chore / docs

## Checklist

- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] `npm test` passes
- [ ] New/changed endpoints are documented in `docs/API.md` and added to `requests.http`
- [ ] New tenant models are registered in `TENANT_MODELS` (`src/config/database.ts`)
- [ ] Every new query on a tenant model is scoped by `organizationId`
- [ ] Input is validated with a zod schema in `*.schema.ts`
- [ ] Migration committed (`prisma/migrations/`) if the schema changed
- [ ] No secrets, `.env`, or `console.log` left behind

## How to test

<!-- curl / requests.http snippet or steps -->
