# Testing

Vitest. `npm test` (CI) or `npm run test:watch` (dev).

## Two kinds of test

| Kind | File name | Needs a DB? | What it covers |
| --- | --- | --- | --- |
| Unit | `tests/*.test.ts` | no | Pure functions and services with a mocked repository |
| Integration | `tests/*.int.test.ts` | yes | Routes end-to-end with supertest against a test DB |

`tests/setup.ts` sets `NODE_ENV=test` and validates database configuration before
Prisma initializes. The test suite strictly requires PostgreSQL on loopback (`localhost`
or `127.0.0.1`) at explicit port `5433`, targeting `fioner_test`. If `DATABASE_URL` matches
the local development database (`localhost:5433/fioner`), it is automatically redirected
to `fioner_test`. Remote hosts, unapproved databases, missing/default ports, and port `5432`
are rejected to guarantee isolation. Rate limiting is skipped in tests, so suites are not flaky.

## Unit-testing a service

The repository is a plain object, so mock the module:

```ts
import { vi, describe, it, expect } from 'vitest';

vi.mock('../src/modules/users/user.repository', () => ({
  userRepository: {
    findMemberById: vi.fn().mockResolvedValue(null),
  },
}));

// then assert your service throws ApiError.notFound
```

## Integration tests

Use a separate database so a reset never wipes your dev data:

```bash
createdb fioner_test   # or: docker exec -it fioner-postgres createdb -U fioner fioner_test
DATABASE_URL=postgresql://fioner:fioner@localhost:5433/fioner_test npx prisma migrate deploy
```

```ts
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

it('rejects an unauthenticated request', async () => {
  const res = await request(app).get('/api/v1/crm/leads');
  expect(res.status).toBe(401);
});
```

Truncate tables between tests rather than resetting the schema — it is much faster.

## What is worth testing here

- Anything with a rule attached: refresh-token rotation and reuse detection, the
  "last owner cannot be demoted" check, role guards.
- Tenant isolation: create two orgs, confirm org A cannot read org B's leads.
  This is the test most worth writing first.
- Not worth testing: pass-through repositories, getters.
