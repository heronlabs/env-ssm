# @heronlabs/env-ssm

[![npm version](https://img.shields.io/npm/v/@heronlabs/env-ssm.svg)](https://www.npmjs.com/package/@heronlabs/env-ssm)
[![license](https://img.shields.io/npm/l/@heronlabs/env-ssm.svg)](./LICENSE)

Loads AWS SSM Parameter Store values into `process.env`. Standalone — no framework required.

## Install

```bash
npm i @heronlabs/env-ssm
# or: pnpm add @heronlabs/env-ssm
```

The only runtime dependency is `@aws-sdk/client-ssm`.

## Usage

Call early in your entry point (e.g. a Lambda handler), before anything reads
`process.env`. The argument is the name of the env var holding the SSM path prefix.

```ts
import {ParameterFactory} from '@heronlabs/env-ssm';

const factory = await ParameterFactory.make('AWS_ENV_PATH');
await factory.evalParameters();
```

- `ParameterFactory.make(paramRoot)` — returns an `SsmInitService` bound to `paramRoot`.
- `SsmInitService.evalParameters()` — reads `process.env[paramRoot]` as the SSM path, fetches every parameter under it (`WithDecryption: true`) and writes each leaf name to `process.env`. Throws `ValueUndefined` if `process.env[paramRoot]` is unset, and `PathUndefined` if the path returns zero parameters.

### Resolving a single value

`getOrThrow` is handy when a config entry may be either a literal value or a
reference to an SSM parameter ARN — the same call works for both. It lives on
`SsmConfigService`; construct one with `SsmConfigFactory.make()`.

```ts
import {SsmConfigFactory} from '@heronlabs/env-ssm';

const config = SsmConfigFactory.make();

// DB_PASSWORD may hold a literal, or an SSM ARN like
// arn:aws:ssm:us-east-1:123456789012:parameter/app/db-password
const password = await config.getOrThrow('DB_PASSWORD');
```

- `SsmConfigService.getOrThrow(key)` — reads `process.env[key]`. If the value is
  an SSM parameter ARN (`arn:aws:ssm:<region>:<account>:parameter/<name>`) it
  fetches that parameter (`WithDecryption: true`) and returns the resolved value;
  otherwise it returns the raw value unchanged. Throws `ValueUndefined` if the env
  var is unset or the ARN resolves to no value. Returns a `Promise<string>`.

### Errors

- `PathUndefined` — thrown by `evalParameters()` when the SSM path returns zero parameters.
- `ValueUndefined` — thrown by `evalParameters()` when the param-root env var is unset, and by `getOrThrow(key)` when the key is unset or the resolved ARN points to a parameter with no value.

## How it works

```
src/
├── core/
│   ├── errors/value-undefined.ts
│   └── services/
│       ├── ssm-init-service.ts        # evalParameters(): fetches path, writes to process.env
│       └── ssm-config-service.ts      # getOrThrow(): resolves a single value, optionally from an ARN
└── main.ts                            # exports ParameterFactory + SsmConfigFactory
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
