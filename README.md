# @heronlabs/env-ssm

[![npm version](https://img.shields.io/npm/v/@heronlabs/env-ssm.svg)](https://www.npmjs.com/package/@heronlabs/env-ssm)
[![license](https://img.shields.io/npm/l/@heronlabs/env-ssm.svg)](./LICENSE)

Loads AWS SSM Parameter Store values into your environment. Standalone — no
framework required. Works in-process (Lambda, NestJS) or as a CLI you `eval` in
a shell.

## Install

```bash
npm i @heronlabs/env-ssm
# or: pnpm add @heronlabs/env-ssm
```

The only runtime dependency is `@aws-sdk/client-ssm`.

## Usage

Three entry points, one job — get SSM Parameter Store values where your code
needs them.

| You have | Use | Effect |
|---|---|---|
| A Node process (Lambda, NestJS app) | `ParameterFactory` → `evalParameters()` | Loads every parameter under a path into `process.env` |
| A single value to resolve (literal or ARN) | `SsmConfigService.getOrThrow(key)` | Returns one resolved value on demand |
| A shell entry point with Node available | `eval "$(npx @heronlabs/env-ssm)"` | Exports every parameter into the current shell |

### 1. Load all parameters into `process.env`

`ParameterFactory.make(paramRoot)` reads `process.env[paramRoot]` as the SSM path
prefix, fetches every parameter under it (`WithDecryption: true`), and writes each
leaf name into `process.env`. Call it once, before anything reads config.

A Lambda handler bootstrapping a NestJS context:

```ts
import 'reflect-metadata';

import {ParameterFactory} from '@heronlabs/env-ssm';
import {NestFactory} from '@nestjs/core';
import {SQSEvent, SQSHandler} from 'aws-lambda';

import {FunctionModule} from './application/function/function-module';

export const handler: SQSHandler = async (event: SQSEvent) => {
  // AWS_ENV_PATH = /my-service/prod → loads /my-service/prod/* into process.env
  const factory = await ParameterFactory.make('AWS_ENV_PATH');
  await factory.evalParameters();

  const app = await NestFactory.createApplicationContext(FunctionModule);
  // ...the app and its providers now read the loaded process.env
  await app.close();
};
```

Throws `ValueUndefined` if `process.env[paramRoot]` is unset, and `PathUndefined`
if the path returns zero parameters.

### 2. Resolve a single value on demand

`SsmConfigService.getOrThrow(key)` reads `process.env[key]`. If the value is an
SSM parameter ARN it fetches and decrypts that parameter; otherwise it returns the
raw value unchanged. One call handles both literal config and ARN references —
useful on a long-running server that reads config lazily.

In a framework-free script, build one with the factory:

```ts
import {SsmConfigFactory} from '@heronlabs/env-ssm';

const config = SsmConfigFactory.make();
// DB_URL may be a literal, or arn:aws:ssm:us-east-1:123…:parameter/app/db-url
const dbUrl = await config.getOrThrow('DB_URL');
```

In NestJS, register it as a provider so it injects anywhere:

```ts
import {SsmConfigFactory, SsmConfigService} from '@heronlabs/env-ssm';
import {Module} from '@nestjs/common';

@Module({
  providers: [
    {provide: SsmConfigService, useFactory: () => SsmConfigFactory.make()},
  ],
  exports: [SsmConfigService],
})
export class ConfigModule {}
```

Then inject it alongside Nest's own `ConfigService`:

```ts
import {SsmConfigService} from '@heronlabs/env-ssm';
import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

@Injectable()
export class EnvironmentService {
  async database() {
    const databaseUrl = await this.ssmConfigService.getOrThrow('DB_URL');
    const url = new URL(databaseUrl); // throws on a malformed value

    return {
      host: url.hostname,
      port: url.port,
      name: url.pathname.slice(1),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    };
  }

  get storage() {
    return {
      bucketName: this.configService.getOrThrow<string>('AWS_S3_BUCKET_NAME'),
    };
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly ssmConfigService: SsmConfigService,
  ) {}
}
```

Throws `ValueUndefined` if the key is unset or the ARN resolves to no value.

### 3. Run as a CLI in a shell

For shell entry points — a Docker `ENTRYPOINT`, a CI step — where the process that
needs the variables is *not* Node, run the package with `npx`. It prints `export`
lines to stdout; wrap it in `eval` so the **current** shell applies them.

A child process cannot mutate its parent's environment — that's an OS rule, not a
library limit. So bare `npx @heronlabs/env-ssm` would print the exports and exit
without changing your shell. `eval` runs those exports in-place, in the shell that
launches your app.

```bash
#!/bin/bash
set -e

# AWS_ENV_PATH must be set; loads every parameter under it as exports
eval "$(npx @heronlabs/env-ssm)"

node index.js
```

- Reads the SSM path from `$AWS_ENV_PATH` — the same variable `evalParameters()` uses.
- Emits one line per parameter: `export NAME=$'value'`, using bash ANSI-C quoting
  (`$'…'`) so newlines, single quotes, and backslashes in secrets survive intact.
- Parameter names are sanitized to valid shell identifiers — characters outside
  `[A-Za-z0-9_]` become `_`, and a leading digit is prefixed with `_`
  (`foo.bar` → `foo_bar`). Names already written as `FOO_BAR_BAZ` pass through unchanged.
- Requires Node on the host (that's what runs `npx`). Skip the `eval` and the
  exports print but never reach your process.

### Errors

- `ValueUndefined` — the param-root env var is unset (`evalParameters()`), or the
  key is unset / the resolved ARN points to a parameter with no value (`getOrThrow`).
- `PathUndefined` — the SSM path returns zero parameters (`evalParameters()`).

## How it works

```
src/
├── cli.ts                              # npx entry: prints `export …` lines for eval
├── core/
│   ├── errors/value-undefined.ts
│   └── services/
│       ├── export-format.ts            # eval-safe value escaping + shell-name sanitizing
│       ├── ssm-init-service.ts         # evalParameters() / fetchParameters()
│       └── ssm-config-service.ts       # getOrThrow(): resolves a single value, optionally from an ARN
└── main.ts                             # exports ParameterFactory + SsmConfigFactory
```

## Develop

```bash
pnpm install
pnpm build            # tsc -> bin/
pnpm lint:check
pnpm test:unit        # 100% coverage enforced
pnpm test:mutation    # 100% mutation score enforced
pnpm dep:cruise       # architecture rules
```

## Release

Publishing is automated by a single manual workflow:

1. Run the **`[ CD ] | Tags`** workflow (`workflow_dispatch`) with a semver `spec` (`major` / `minor` / `patch`). The `setup-tags` job bumps `package.json`, tags, and creates a GitHub release; the `publish-npm` job then checks out the new tag, builds, and publishes `@heronlabs/env-ssm` to npmjs with `npm publish --access public --provenance`.

Requires the `NPM_TOKEN` repository secret (an npmjs automation token with publish rights on the `@heronlabs` scope) and the `PAT` secret used by the tag workflow.

## License

MIT © HeronLabs
