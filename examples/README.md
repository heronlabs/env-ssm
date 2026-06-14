# Integration examples

Three self-asserting example apps that exercise the **built** package
(`bin/src`) end-to-end against a real SSM API surface, emulated by
[LocalStack](https://www.localstack.cloud/) — no real AWS account needed. Each
app exits non-zero on any mismatch, so they double as the `test:integration`
suite that CI runs.

| App                | Surface                            | Simulates                                       |
| ------------------ | ---------------------------------- | ----------------------------------------------- |
| `lambda-sim/`      | `SsmInitFactory.env(...).eval()`   | Lambda cold-start hydrating `process.env`        |
| `npx-eval/`        | `bin/src/cli.js` via `eval "$(…)"` | `eval "$(npx env-ssm)"` before launching a service |
| `param-store/`     | `SsmConfigFactory.make()`          | Resolving one secret by ARN at runtime           |

`lambda-sim` and `param-store` `require('../../bin/src/main.js')` directly.
`npx-eval` runs the actual built bin (`bin/src/cli.js`) — the same entry point
`npx env-ssm` invokes — and asserts the exported shell vars.

## Run locally

Build the package first so `bin/` exists:

```bash
pnpm build
```

Bring up LocalStack via Docker (the SSM service is all that's needed):

```bash
docker run --rm -d -p 4566:4566 -e SERVICES=ssm localstack/localstack:4
```

Export the env contract and run the suite. `run.sh` seeds the parameters
(idempotently, with `--overwrite`) and then runs all three apps in sequence:

```bash
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_ENV_PATH=/env-ssm-it/
export SINGLE_SECRET=arn:aws:ssm:us-east-1:000000000000:parameter/env-ssm-it/single-secret

pnpm test:integration
```

The AWS SDK v3 reads `AWS_ENDPOINT_URL` from the environment, so the library's
`new SSM(...)` clients talk to LocalStack with no code change. `run.sh` applies
the same defaults shown above, so the bare `pnpm test:integration` works once
LocalStack is up on `localhost:4566`. The seeded values use `000000000000` as
the account id — LocalStack's fixed account — which is why `SINGLE_SECRET`'s ARN
references it.

## Seeded parameters

| Name                          | Type           | Used by                  |
| ----------------------------- | -------------- | ------------------------ |
| `/env-ssm-it/DATABASE_URL`    | `SecureString` | `lambda-sim`, `npx-eval` |
| `/env-ssm-it/API_KEY`         | `String`       | `lambda-sim`, `npx-eval` |
| `/env-ssm-it/single-secret`   | `SecureString` | `param-store`            |

The `SecureString` parameters exercise the library's `WithDecryption: true`
fetch.

## CI

The `[ CI ] | Env SSM` workflow runs this automatically in an `integration` job
with a health-gated LocalStack service container — no manual setup needed.
