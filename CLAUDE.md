# env-ssm — SSM Parameter Loader

Standalone, framework-free library (`@heronlabs/env-ssm`, published to npmjs). Loads AWS SSM Parameter Store values into `process.env`. Ejected from the `heronlabs/workloads` monorepo. A separate `nestjs-env-ssm` wrapper layers NestJS DI on top of this core.

## Stack

- `@aws-sdk/client-ssm` — the only runtime dependency; plain classes, no DI container
- Exported entry: `./bin/src/main.js` (`main:`, `types:`)
- Built with `tsc -p tsconfig.bin.json`; tests run on vitest's default esbuild transform (no swc)

## Structure

```
src/
├── core/
│   ├── errors/value-undefined.ts
│   └── services/
│       ├── ssm-init-service.ts        # evalParameters(): fetches path, writes to process.env
│       └── ssm-config-service.ts      # getOrThrow(): resolves a single value, optionally from an ARN
└── main.ts                            # exports ParameterFactory + SsmConfigFactory + services + errors
```

## API

```ts
const factory = await ParameterFactory.make('AWS_ENV_PATH');
await factory.evalParameters();
```

- `ParameterFactory.make(paramRoot)` — constructs and returns an `SsmInitService` bound to `paramRoot` (a `new SSM(...)` client wired in directly)
- `SsmInitService.evalParameters()` — reads `process.env[paramRoot]` as the SSM path, fetches all parameters under it and writes leaf names to `process.env`
- Throws `ValueUndefined` if `process.env[paramRoot]` is unset; throws `PathUndefined` if the path returns zero parameters
- `SsmConfigService.getOrThrow(key)` — reads `process.env[key]` and resolves a single value (literal or SSM ARN); throws `ValueUndefined` if the key is unset or the ARN resolves to no value. Construct one with `SsmConfigFactory.make()`

## Verify

```bash
pnpm build
pnpm test:unit       # 100% coverage
pnpm test:mutation   # 100% mutation score
pnpm lint:check
pnpm dep:cruise
```

## Release

`[ CD ] | Tags` (manual `workflow_dispatch`, choose `major`/`minor`/`patch`) runs the full release in one flow: `setup-tags` bumps + tags + creates the GitHub release, then `publish-npm` checks out the new tag, builds, and runs `npm publish --access public --provenance` (sigstore provenance is enabled now that the repo is public — npm only signs provenance for public source repos). The `publish-npm` job needs `id-token: write` (plus `contents: read`) permissions for provenance signing. Needs `NPM_TOKEN` (npmjs automation token) and `PAT` (GitHub repo+workflow token) repo secrets. To cut a release: `gh workflow run '[ CD ] | Tags' --repo heronlabs/env-ssm -f spec=patch`.
