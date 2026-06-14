# env-ssm — SSM Parameter Loader

Standalone, framework-free library (`@heronlabs/env-ssm`, published to npmjs). Loads AWS SSM Parameter Store values into `process.env` (in-process) or shell `export`s (npx CLI). Ejected from the `heronlabs/workloads` monorepo. A separate `nestjs-env-ssm` wrapper layers NestJS DI on top of this core.

## Stack

- `@aws-sdk/client-ssm` — the only runtime dependency; plain classes, no DI container
- Exported entry: `./bin/src/main.js` (`main:`, `types:`)
- Built with `tsc -p tsconfig.bin.json`; tests run on vitest's default esbuild transform (no swc)
- No custom error classes — every failure throws a plain `Error` (`Value Undefined | <name>`)

## Structure

```
src/
├── cli.ts                             # npx entry: BashService.eval() → stdout for `eval`
├── core/
│   └── services/
│       ├── config-service.ts          # getOrThrow(): resolve one value (literal or ARN)
│       └── init/
│           ├── parameter-service.ts   # fetchParameters(): SSM path → { leaf: value }, shared fetch
│           ├── env-service.ts         # eval(): writes fetched params raw → process.env
│           └── bash-service.ts        # eval(): fetched params → escaped `export NAME=$'value'` lines
└── main.ts                            # SsmInitFactory + SsmConfigFactory + service classes
```

`ParameterService` is the shared SSM fetch; `EnvService` and `BashService` are injected with one and consume it — same parameters, two sinks (raw into `process.env`, escaped to stdout). No inheritance.

## API

```ts
await SsmInitFactory.env('AWS_ENV_PATH').eval();
```

- `SsmInitFactory.env(paramRoot)` / `.bash(paramRoot)` — construct an `EnvService` / `BashService`, each wired to a fresh `ParameterService` (`new SSM(...)` client + `paramRoot`); synchronous
- `ParameterService.fetchParameters()` — reads `process.env[paramRoot]` as the SSM path, fetches every parameter one level under it (`WithDecryption: true`, paginated) and returns `{ leaf: value }`. Throws `Value Undefined | <paramRoot>` if the root env var is unset; returns `{}` (no throw) when the path has zero parameters
- `EnvService.eval()` — `fetchParameters()` then writes each leaf to `process.env` **raw** (no escaping, no name rewriting); returns `void`
- `BashService.eval()` — `fetchParameters()` then returns `export NAME=$'value'` lines (values escaped for bash ANSI-C quoting, names sanitized to valid shell identifiers) for the `cli.ts` / `eval` path; does not touch `process.env`. Throws `Name Collision | <a>, <b> -> <identifier>` when two names sanitize to the same identifier (rejects the silent overwrite). Sanitize + escape are bash-only — the `env` path writes raw, since bash decodes the escaping back to the original value anyway
- `ConfigService.getOrThrow(key)` — reads `process.env[key]` and resolves a single value (literal or SSM ARN); throws `Value Undefined | <key>` if the key is unset or the ARN resolves to no value. Construct one with `SsmConfigFactory.make()`

## Verify

```bash
pnpm build
pnpm test:unit       # 100% coverage
pnpm test:mutation   # 100% mutation score
pnpm lint:check
pnpm dep:cruise
```

`pnpm test:integration` (Playwright + LocalStack) lives in `qa-automator/` — see its README.

## CI

`[ CI ] | Env SSM` (`pull_request` to `main` + `workflow_dispatch`) is a sequential chain — Install & Build → Audit & Supply Chain → Lint → Unit Tests — then two parallel leaves gated on Unit: Mutation Tests and Integration (LocalStack). Reports are trimmed to the step summary: the mutation job scrapes the clear-text `All files` row for the score only and uploads `reports/mutation/` as `mutation-reports`; the integration job uploads the Playwright HTML report (`qa-automator/reports/playwright/`) as `playwright-report`. Stryker runs against `vitest.stryker.config.ts` (base config + `reporters: ['default']`) — without that, vitest auto-enables its `github-actions` reporter in CI and writes one "Vitest Test Report" to the step summary per mutant, burying the score.

## Release

`[ CD ] | Tags` (manual `workflow_dispatch`, choose `major`/`minor`/`patch`) runs the full release in one flow: `setup-tags` bumps + tags + creates the GitHub release, then `publish-npm` checks out the new tag, builds, and runs `npm publish --access public --provenance` (sigstore provenance is enabled now that the repo is public — npm only signs provenance for public source repos). The `publish-npm` job needs `id-token: write` (plus `contents: read`) permissions for provenance signing. Needs `NPM_TOKEN` (npmjs automation token) and `PAT` (GitHub repo+workflow token) repo secrets. To cut a release: `gh workflow run '[ CD ] | Tags' --repo heronlabs/env-ssm -f spec=patch`.
