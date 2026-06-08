# env-ssm — SSM Parameter Loader

Standalone library (`@heronlabs/env-ssm`, published to npmjs). Loads AWS SSM Parameter Store values into `process.env` for NestJS apps before bootstrap. Ejected from the `heronlabs/workloads` monorepo.

## Stack

- `@aws-sdk/client-ssm` + NestJS application context
- NestJS packages (`@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `reflect-metadata`) are **peer dependencies** — the host app provides them
- Exported entry: `./bin/src/main.js` (`main:`, `types:`)

## Structure

```
src/
├── core/
│   ├── ssm-init-module.ts             # DynamicModule: wires SSM client + SsmInitService
│   ├── ssm-config-module.ts           # Module: wires SSM client + SsmConfigService
│   ├── errors/value-undefined.ts
│   └── services/
│       ├── ssm-init-service.ts        # evalParameters(): fetches path, writes to process.env
│       └── ssm-config-service.ts      # getOrThrow(): resolves a single value, optionally from an ARN
└── main.ts                            # exports ParameterFactory
```

## API

```ts
const factory = await ParameterFactory.make('AWS_ENV_PATH');
await factory.evalParameters();
```

- `ParameterFactory.make(paramRoot)` — reads `process.env[paramRoot]` as the SSM path prefix, returns `SsmInitService`
- `SsmInitService.evalParameters()` — fetches all parameters under the path and writes leaf names to `process.env`
- Throws `PathUndefined` if the SSM path returns zero parameters
- `SsmConfigService.getOrThrow(key)` — resolves a single value (literal or SSM ARN); obtained via DI by importing `SsmConfigModule` and injecting `SsmConfigService`

## Verify

```bash
pnpm build
pnpm test:unit       # 100% coverage
pnpm test:mutation   # 100% mutation score
pnpm lint:check
pnpm dep:cruise
```

## Release

`[ CD ] | Tags` (manual `workflow_dispatch`, choose `major`/`minor`/`patch`) runs the full release in one flow: `setup-tags` bumps + tags + creates the GitHub release, then `publish-npm` checks out the new tag, builds, and runs `npm publish --access public` (no `--provenance` — npm only signs sigstore provenance for public source repos, and this repo is private). Needs `NPM_TOKEN` (npmjs automation token) and `PAT` (GitHub repo+workflow token) repo secrets. To cut a release: `gh workflow run '[ CD ] | Tags' --repo heronlabs/env-ssm -f spec=patch`.
