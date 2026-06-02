# @heronlabs/env-ssm

Loads AWS SSM Parameter Store values into `process.env` for NestJS apps before bootstrap.

## Install

```bash
pnpm add @heronlabs/env-ssm
# or: npm i @heronlabs/env-ssm
```

Peer dependencies (provided by the host app): `@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `reflect-metadata`.

## Usage

Call before `NestFactory` in your entry point (e.g. a Lambda handler). The argument is the name of the env var holding the SSM path prefix.

```ts
import {ParameterFactory} from '@heronlabs/env-ssm';

const factory = await ParameterFactory.make('AWS_ENV_PATH');
await factory.evalParameters();
```

- `ParameterFactory.make(paramRoot)` — reads `process.env[paramRoot]` as the SSM path prefix, returns an `SsmService`.
- `SsmService.evalParameters()` — fetches every parameter under the path (`WithDecryption: true`) and writes each leaf name to `process.env`. Throws `PathUndefined` if the SSM path returns zero parameters.
- `SsmService.getOrThrow(key)` — resolves a single config value. Reads `key` via the underlying `ConfigService.getOrThrow`. If the value is an SSM parameter ARN (`arn:aws:ssm:<region>:<account>:parameter/<name>`) it fetches that parameter (`WithDecryption: true`) and returns the resolved value; otherwise it returns the raw value unchanged. Throws `ValueUndefined` if the ARN resolves to no value. Returns a `Promise<string>`.

### Resolving a single value

`getOrThrow` is handy when a config entry may be either a literal value or a reference to an SSM parameter ARN — the same call works for both:

```ts
import {ParameterFactory} from '@heronlabs/env-ssm';

const factory = await ParameterFactory.make('AWS_ENV_PATH');

// DB_PASSWORD may hold a literal, or an SSM ARN like
// arn:aws:ssm:us-east-1:123456789012:parameter/app/db-password
const password = await factory.getOrThrow('DB_PASSWORD');
```

### Errors

- `PathUndefined` — thrown by `evalParameters()` when the SSM path returns zero parameters.
- `ValueUndefined` — thrown by `getOrThrow(key)` when the resolved ARN points to a parameter with no value.

## How it works

```
src/
├── core/
│   ├── core-bootstrap.ts        # DynamicModule: wires the SSM client + SsmService
│   ├── errors/value-undefined.ts
│   └── services/ssm-service.ts  # evalParameters(): fetches path, writes to process.env
└── main.ts                      # exports ParameterFactory
```

## Develop

```bash
pnpm install
pnpm build            # nest build -> bin/
pnpm lint:check
pnpm test:unit        # 100% coverage enforced
pnpm test:mutation    # 100% mutation score enforced
pnpm dep:cruise       # architecture rules
```

## Release

Publishing is automated by a single manual workflow:

1. Run the **`[ CD ] | Tags`** workflow (`workflow_dispatch`) with a semver `spec` (`major` / `minor` / `patch`). The `setup-tags` job bumps `package.json`, tags, and creates a GitHub release; the `publish-npm` job then checks out the new tag, builds, and publishes `@heronlabs/env-ssm` to npmjs with `npm publish --access public` (no `--provenance` — npm only signs sigstore provenance for public source repos, and this repo is private).

Requires the `NPM_TOKEN` repository secret (an npmjs automation token with publish rights on the `@heronlabs` scope) and the `PAT` secret used by the tag workflow.

## License

MIT © HeronLabs
