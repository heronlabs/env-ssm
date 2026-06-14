# QA automator

Three tiny TypeScript HTTP APIs (`__mocks__/`) that consume the **built** package
(`bin/src`) and prove it resolves real SSM parameters end-to-end against
[LocalStack](https://www.localstack.cloud/) — an emulated AWS, no real account.
Playwright boots the apps, waits for readiness, and asserts each `GET /config`
response with its `request` fixture (API testing only — no browser). Each mock
app has its own spec under `tests/`.

| Mock app                | Surface                          | Demonstrates                                       |
| ----------------------- | -------------------------------- | -------------------------------------------------- |
| `__mocks__/lambda-sim`  | `SsmInitFactory.env(...).eval()` | Lambda cold-start hydrating `process.env` at boot  |
| `__mocks__/npx-eval`    | `bin/src/cli.js` via `eval`      | `eval "$(npx env-ssm)"` before launching a service |
| `__mocks__/param-store` | `SsmConfigFactory.make()`        | Resolving one secret by ARN per request            |

Each server is plain `node:http` (no web framework) and imports the built output
by relative path (`../../../bin/src/main.js`). `__mocks__/lambda-sim` `await`s
`eval()` before it listens, so its readiness URL only comes up once hydration
succeeds — a failed fetch crashes the process and fails the run.
`__mocks__/npx-eval` does not call the library itself; its Playwright `webServer`
command runs the real CLI bin and `eval`s the exported shell vars before starting
the server:

```sh
bash -c 'eval "$(node ../bin/src/cli.js)" && exec npx tsx __mocks__/npx-eval/server.ts'
```

Servers run via `tsx`; ports are `4011` / `4012` / `4013`
(see `__mocks__/fixtures.ts`).

## Seeding and the single source of truth

`__mocks__/fixtures.ts` holds the seed constants (name / value / type) and the
ports — defined once and imported by both the seeder and the per-app specs. Each
spec asserts its `/config` response straight off the seed constants (e.g.
`SEEDS_DATABASE_URL.value`), so the seeded values are the single source of
truth — no duplicated `EXPECTED` constants.

`seed.ts` seeds the parameters with the AWS SDK we already depend on
(`putParameter({Overwrite: true, ...})`), exercising `SecureString` (decrypted
on read) and `String`:

| Name                        | Type           | Used by                  |
| --------------------------- | -------------- | ------------------------ |
| `/env-ssm-it/DATABASE_URL`  | `SecureString` | `lambda-sim`, `npx-eval` |
| `/env-ssm-it/API_KEY`       | `String`       | `lambda-sim`, `npx-eval` |
| `/env-ssm-it/single-secret` | `SecureString` | `param-store`            |

The seed must run **before** the web servers, because Playwright starts
`webServer` before the tests and `lambda-sim` / `npx-eval` read at boot. So
`pnpm test:integration` runs `tsx qa-automator/seed.ts` first and then launches
Playwright. Seeding is idempotent (`Overwrite: true`) and the suite is
re-runnable.

## Run locally

1. Build the package so `bin/` exists:

   ```bash
   pnpm build
   ```

2. Bring up LocalStack via Docker Compose from the repo root (only the SSM
   service is needed):

   ```bash
   docker compose up -d
   ```

3. Export the AWS contract and run the suite. Playwright boots all three apps
   and waits for `/config` readiness automatically — no manual sleep:

   ```bash
   export AWS_ENDPOINT_URL=http://localhost:4566
   export AWS_REGION=us-east-1
   export AWS_DEFAULT_REGION=us-east-1
   export AWS_ACCESS_KEY_ID=test
   export AWS_SECRET_ACCESS_KEY=test

   pnpm test:integration
   ```

The AWS SDK v3 reads `AWS_ENDPOINT_URL` from the environment, so the library's
`new SSM(...)` clients talk to LocalStack with no code change. The per-app
`AWS_ENV_PATH` and `SINGLE_SECRET` (the seeded ARN, using LocalStack's fixed
account id `000000000000`) are supplied by `playwright.config.ts`; the endpoint,
region, and dummy credentials default in the config too, so the bare command
works once LocalStack is up on `localhost:4566`.

The tests use only Playwright's `request` fixture, so no browser binaries are
needed (`playwright install` is not required).

The run writes an HTML report to `qa-automator/reports/playwright/`; open it with
`npx playwright show-report qa-automator/reports/playwright`.

## CI

The `[ CI ] | Env SSM` workflow runs a sequential chain — **Install & Build →
Audit → Lint → Unit Tests** — then fans out to two parallel leaves gated on the
unit job: **Integration (LocalStack)** and **Mutation Tests**. Every job pins
pnpm with `cache: 'pnpm'` and restores the shared `node_modules` / `bin` caches.

**Integration** brings up LocalStack with `docker compose up -d --wait` (same
`docker-compose.yml` used locally), exports the AWS contract at job level, runs
`pnpm test:integration`, and tears LocalStack down. Playwright's `list` reporter
streams every test to the job log; its `html` reporter writes
`qa-automator/reports/playwright/`, uploaded as the **`playwright-report`**
artifact. A step-summary block shows the pass/fail line.

**Mutation** runs `pnpm test:mutation` and scrapes the clear-text `All files`
row to post **only** the score to the step summary (`Mutation score: 100.00%`);
the full Stryker output stays in the job log and `reports/mutation/` uploads as
the **`mutation-reports`** artifact. Stryker runs against
`vitest.stryker.config.ts` (base config + `reporters: ['default']`) so vitest's
CI `github-actions` reporter does not fire once per mutant and bury the score.
