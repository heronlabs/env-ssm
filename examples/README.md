# Integration examples

Three tiny TypeScript HTTP APIs that consume the **built** package (`bin/src`)
and prove it resolves real SSM parameters end-to-end against
[LocalStack](https://www.localstack.cloud/) — an emulated AWS, no real account.
Playwright boots the apps, waits for readiness, and asserts each `GET /config`
response with its `request` fixture (API testing only — no browser).

| App                | Surface                          | Demonstrates                                       |
| ------------------ | -------------------------------- | -------------------------------------------------- |
| `apps/lambda-sim`  | `SsmInitFactory.env(...).eval()` | Lambda cold-start hydrating `process.env` at boot  |
| `apps/npx-eval`    | `bin/src/cli.js` via `eval`      | `eval "$(npx env-ssm)"` before launching a service |
| `apps/param-store` | `SsmConfigFactory.make()`        | Resolving one secret by ARN per request            |

Each server is plain `node:http` (no web framework) and imports the built output
by relative path (`../../../bin/src/main.js`). `apps/lambda-sim` `await`s
`eval()` before it listens, so its readiness URL only comes up once hydration
succeeds — a failed fetch crashes the process and fails the run. `apps/npx-eval`
does not call the library itself; its Playwright `webServer` command runs the
real CLI bin and `eval`s the exported shell vars before starting the server:

```sh
sh -c 'eval "$(node ../bin/src/cli.js)" && exec npx tsx apps/npx-eval/server.ts'
```

Servers run via `tsx`; ports are `4011` / `4012` / `4013` (see `fixtures.ts`).

## Seeding and the single source of truth

`fixtures.ts` holds the seed triples (name / value / type), the expected
responses, the ARN, and the ports — defined once and imported by both the
seeder and the spec, so there is no duplicated `EXPECTED`.

`global-setup.ts` seeds the parameters with the AWS SDK we already depend on
(`putParameter({Overwrite: true, ...})`), exercising `SecureString` (decrypted
on read) and `String`:

| Name                        | Type           | Used by                  |
| --------------------------- | -------------- | ------------------------ |
| `/env-ssm-it/DATABASE_URL`  | `SecureString` | `lambda-sim`, `npx-eval` |
| `/env-ssm-it/API_KEY`       | `String`       | `lambda-sim`, `npx-eval` |
| `/env-ssm-it/single-secret` | `SecureString` | `param-store`            |

The seed must run **before** the web servers, because Playwright starts
`webServer` before `globalSetup` and `lambda-sim` / `npx-eval` read at boot. So
`pnpm test:integration` seeds via `tsx examples/seed.ts` first and then runs
Playwright; `playwright.config.ts` also wires `globalSetup` for idempotent
re-seeding. Seeding is idempotent (`Overwrite: true`) and the suite is
re-runnable.

## Run locally

1. Build the package so `bin/` exists:

   ```bash
   pnpm build
   ```

2. Bring up LocalStack via Docker (only the SSM service is needed):

   ```bash
   docker run --rm -d -p 4566:4566 -e SERVICES=ssm localstack/localstack:4
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

## CI

The `[ CI ] | Env SSM` workflow runs this automatically in an `integration` job
with a health-gated LocalStack service container and the AWS contract exported at
job level — no manual setup.
