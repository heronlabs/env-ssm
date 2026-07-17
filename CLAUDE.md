# env-ssm — SSM Parameter Loader

Standalone, framework-free library (`@heronlabs/env-ssm`, published to npmjs). Loads AWS SSM Parameter Store values into `process.env` (in-process) or shell `export`s / `.env` lines (npx CLI). Ejected from the `heronlabs/workloads` monorepo. A separate `nestjs-env-ssm` wrapper layers NestJS DI on top of this core.

## Stack

- `@aws-sdk/client-ssm` — the only runtime dependency; plain classes, no DI container
- Exported entry: `./bin/src/main.js` (`main:`, `types:`); CLI bin: `./bin/src/cli.js`
- Built with `tsc -p tsconfig.bin.json`; tests run on vitest's default esbuild transform (no swc)
- No custom error classes — every failure throws a plain `Error` (`Value Undefined | <name>`, `Name Collision | …`, `Unknown Format | …`)

## Structure

Three layers, one dependency direction — `application → core → infrastructure` — enforced by dependency-cruiser (also: no cycles, no dead code unreachable from `main.ts`/`cli.ts`, no devDependency imports in `src/`):

```
src/
├── cli.ts                                 # npx entry: --format=bash|dotenv → stdout for `eval`/`source`
├── main.ts                                # public exports: factories, commands, services
├── application/cli/
│   ├── cli-factory.ts                     # CliFactory — builds commands wired to core services
│   └── commands/                          # ProcessEnvCommand | BashEnvCommand | DotEnvCommand
│                                          #   executeOrThrow(pathEnvVar): unwrap result or throw
├── core/
│   ├── core-factory.ts                    # CoreFactory — builds services wired to infrastructure
│   ├── interfaces/eval.ts                 # Eval — evalAll(pathEnvVar) → result with joined lines
│   └── services/
│       ├── process-env-service.ts         # load(): fetched params raw → process.env
│       └── eval/
│           ├── line-env-service.ts        # abstract base: sanitize names, detect collisions, join lines
│           ├── bash-env-service.ts        # evalLine(): ANSI-C `export NAME=$'value'`
│           └── dot-env-service.ts         # evalLine(): single-quoted `NAME='value'`, byte-exact
└── infrastructure/aws/
    ├── aws-factory.ts                     # AwsFactory — owns the SSM client
    └── services/
        ├── parameter-service.ts           # fetchAllParameters(): SSM path → { leaf: value }, paginated
        └── config-service.ts              # getOrThrow(): one value, literal or SSM ARN
```

**Result pattern**: core and infrastructure services never throw — they return `{ok: true, data} | {ok: false, error}`. The throwing boundary is the application commands (`executeOrThrow`) and `ConfigService.getOrThrow`.

**Factories** are per-layer composition roots: `AwsFactory.make()` constructs the `SSM` client; `CoreFactory.make()` wires core services to a `ParameterService`; `CliFactory.make()` wires commands to core services.

## API

```ts
await CliFactory.make().getProcessEnvCommand().executeOrThrow('AWS_ENV_PATH');
const value = await AwsFactory.make().getConfigService().getOrThrow('KEY');
```

- `CliFactory.make()` — `getProcessEnvCommand()` / `getBashEnvCommand()` / `getDotEnvCommand()`; each command's `executeOrThrow(pathEnvVar)` runs the matching core service and throws on `{ok: false}`
- `ParameterService.fetchAllParameters(pathEnvVar)` — reads `process.env[pathEnvVar]` as the SSM path, fetches every parameter one level under it (`WithDecryption: true`, paginated, **not** recursive) and returns `{ leaf: value }`. `{ok: false, error: 'Value Undefined | <pathEnvVar>'}` if the env var is unset; `{ok: true, data: {}}` (not an error) when the path has zero parameters
- `ProcessEnvService.load(pathEnvVar)` — fetch then write each leaf to `process.env` **raw** (no escaping, no name rewriting)
- `BashEnvService.evalAll(pathEnvVar)` — fetch then `export NAME=$'value'` lines (values ANSI-C-escaped: `\\`, `\'`, `\n`; names sanitized to valid shell identifiers) for the CLI `eval` path; does not touch `process.env`. `Name Collision | <a>, <b> -> <identifier>` error when two names sanitize to the same identifier (rejects the silent overwrite). Sanitize + escape are shell-only — the `process.env` path writes raw, since bash decodes the escaping back to the original value anyway
- `DotEnvService.evalAll(pathEnvVar)` — fetch then `NAME='value'` lines (no `export` prefix) for the CLI `--format=dotenv` path. Same name sanitize + same `Name Collision` error as bash. Value escaping is single-quote-only: each `'` → `'\''`; backslashes and newlines stay **literal** — inside bash single quotes both are verbatim, so the emitted `.env` is byte-exact and `source`-able. This is the deliberate difference from `BashEnvService`'s ANSI-C `$'…'` escaping
- Both line services extend `LineEnvService` (implements `Eval`), which owns fetch → sanitize → collision check → join; subclasses only define `evalLine(identifier, value)`
- `cli.ts` reads `--format=<value>` from `process.argv` (default `bash`): `dotenv` → `getDotEnvCommand()`, `bash` → `getBashEnvCommand()`, any other explicit value throws `Unknown Format | <value>`; path env var is hardwired to `AWS_ENV_PATH`
- `ConfigService.getOrThrow(key)` — reads `process.env[key]`; if it matches `arn:aws:ssm:<region>:<account>:parameter/<name>` fetches + decrypts that parameter, else returns the literal. Throws `Value Undefined | <key>` if the key is unset or the ARN resolves to no value. Construct via `AwsFactory.make().getConfigService()`

## Verify

```bash
pnpm build
pnpm test:unit       # 100% coverage
pnpm test:mutation   # 100% mutation score
pnpm lint:check
pnpm dep:cruise
pnpm test:integration  # Playwright vs LocalStack — needs `docker compose up -d`
```

Integration harness lives in `playwright/`: `seed.ts` seeds LocalStack SSM, then `playwright.config.ts` boots four HTTP mock servers against the built `bin/` — one per delivery path (`process.env`, `eval`'d bash exports, generated `.env`, single-value `ConfigService`) — and the specs assert each serves the seeded values.

## CI

`Continuous Integration` (`pull_request` to `main` + `workflow_dispatch`) runs an `install` (build) job first, then audit, lint, and unit tests in parallel. Mutation tests and integration tests (LocalStack via `docker compose`) run in parallel after unit. Each job runs `pnpm install --frozen-lockfile` directly — no `actions/cache` steps; `setup-node`'s built-in `cache: 'pnpm'` handles the pnpm store. Reports are trimmed to the step summary: the mutation job scrapes the clear-text `All files` row for the score only; the integration job greps the Playwright pass/fail lines. Artifacts: `unit-test-coverage` (`reports/vitest/`), `mutation-reports` (`reports/mutation/`), `playwright-report`. Stryker runs against `vitest.stryker.config.ts` (base config + `reporters: ['default']`) — without that, vitest auto-enables its `github-actions` reporter in CI and writes one "Vitest Test Report" to the step summary per mutant, burying the score. `stryker.conf.json` excludes the entry points and factories (`main.ts`, `cli.ts`, `*-factory.ts`) from mutation.

## Release

`Continuous Deployment` runs on **every push to `main`** (auto `patch`) and on manual `workflow_dispatch` (choose `major`/`minor`/`patch`). One flow: `setup-tags` bumps + tags + creates the GitHub release via `action-tag-release-build`, then `publish-npm` checks out the new tag, builds, and runs `npm publish --access public --provenance` (sigstore provenance — npm only signs provenance for public source repos; the job needs `id-token: write`). Needs `NPM_TOKEN` (npmjs automation token) and `PAT` (GitHub repo+workflow token) repo secrets. Manual cut: `gh workflow run 'Continuous Deployment' --repo heronlabs/env-ssm -f spec=minor`.
