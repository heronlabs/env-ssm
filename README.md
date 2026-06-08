# @heronlabs/env-ssm

[![npm version](https://img.shields.io/npm/v/@heronlabs/env-ssm.svg)](https://www.npmjs.com/package/@heronlabs/env-ssm)
[![license](https://img.shields.io/npm/l/@heronlabs/env-ssm.svg)](./LICENSE)

Loads AWS SSM Parameter Store values into `process.env` for NestJS apps before bootstrap.

## Install

```bash
npm i @heronlabs/env-ssm
# or: pnpm add @heronlabs/env-ssm
```

Peer dependencies (provided by the host app): `@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `reflect-metadata`.

## Usage

Call before `NestFactory` in your entry point (e.g. a Lambda handler). The argument is the name of the env var holding the SSM path prefix.

```ts
import {ParameterFactory} from '@heronlabs/env-ssm';

const factory = await ParameterFactory.make('AWS_ENV_PATH');
await factory.evalParameters();
```

- `ParameterFactory.make(paramRoot)` — reads `process.env[paramRoot]` as the SSM path prefix, returns an `SsmInitService`.
- `SsmInitService.evalParameters()` — fetches every parameter under the path (`WithDecryption: true`) and writes each leaf name to `process.env`. Throws `PathUndefined` if the SSM path returns zero parameters.
- `SsmConfigService.getOrThrow(key)` — resolves a single config value. Obtained via NestJS DI: import `SsmConfigModule` (exported from `@heronlabs/env-ssm`) and inject `SsmConfigService`. Reads `key` via the underlying `ConfigService.getOrThrow`. If the value is an SSM parameter ARN (`arn:aws:ssm:<region>:<account>:parameter/<name>`) it fetches that parameter (`WithDecryption: true`) and returns the resolved value; otherwise it returns the raw value unchanged. Throws `ValueUndefined` if the ARN resolves to no value. Returns a `Promise<string>`.

### Resolving a single value

`getOrThrow` is handy when a config entry may be either a literal value or a reference to an SSM parameter ARN — the same call works for both. It lives on `SsmConfigService`, obtained through NestJS DI: import `SsmConfigModule` and inject `SsmConfigService` where you need it.

```ts
import {Module} from '@nestjs/common';
import {SsmConfigModule} from '@heronlabs/env-ssm';

@Module({
  imports: [SsmConfigModule],
})
export class AppModule {}
```

```ts
import {Injectable} from '@nestjs/common';
import {SsmConfigService} from '@heronlabs/env-ssm';

@Injectable()
export class DbProvider {
  constructor(private readonly config: SsmConfigService) {}

  async password(): Promise<string> {
    // DB_PASSWORD may hold a literal, or an SSM ARN like
    // arn:aws:ssm:us-east-1:123456789012:parameter/app/db-password
    return this.config.getOrThrow('DB_PASSWORD');
  }
}
```

### Errors

- `PathUndefined` — thrown by `evalParameters()` when the SSM path returns zero parameters.
- `ValueUndefined` — thrown by `getOrThrow(key)` when the resolved ARN points to a parameter with no value.

## How it works

```
src/
├── core/
│   ├── ssm-init-module.ts             # DynamicModule: wires the SSM client + SsmInitService
│   ├── ssm-config-module.ts           # Module: wires the SSM client + SsmConfigService
│   ├── errors/value-undefined.ts
│   └── services/
│       ├── ssm-init-service.ts        # evalParameters(): fetches path, writes to process.env
│       └── ssm-config-service.ts      # getOrThrow(): resolves a single value, optionally from an ARN
└── main.ts                            # exports ParameterFactory
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
