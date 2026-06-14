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
| A Node process (Lambda, NestJS app) | `SsmInitFactory.env(paramRoot)` → `eval()` | Loads every parameter under a path into `process.env` |
| A single value to resolve (literal or ARN) | `SsmConfigFactory.make()` → `getOrThrow(key)` | Returns one resolved value on demand |
| A shell entry point with Node available | `eval "$(npx @heronlabs/env-ssm)"` | Exports every parameter into the current shell |

These are **independent entry points — pick the one that matches where your
variables need to land, not a sequence.** Each does its own SSM fetch; the CLI
is not a prerequisite for `SsmInitFactory.env(...)`.

The two differ only in transport, never in the value you end up with:

- `SsmInitFactory.env(...)` writes straight into the running process's
  `process.env` — **names and values raw**. An in-memory map has no syntax to
  satisfy, so nothing is rewritten or escaped.
- The CLI emits bash `export` lines for a shell to `eval`. That path **must**
  sanitize names to valid shell identifiers and escape values for bash's
  `$'…'` quoting — but bash **decodes** that escaping as it evaluates, so the
  value that lands in the environment is the original, byte for byte.

Net: both paths deliver identical **values**; they differ only in that the CLI
path may rewrite **names** (and rejects a collision, see below). `process.env`
never holds an *escaped* value in either case.

### 1. Load all parameters into `process.env`

`SsmInitFactory.env(paramRoot)` returns a service bound to `paramRoot`; its
`eval()` reads `process.env[paramRoot]` as the SSM path prefix, fetches every
parameter directly under it (`WithDecryption: true`), and writes each leaf name into
`process.env` — raw, exactly as stored. Call it once, before anything reads config.

> The fetch is **not** recursive — it lists one level under the path. With path
> `/my-service/prod`, `/my-service/prod/DB_URL` is loaded; `/my-service/prod/db/URL`
> is not. Keep your parameters flat under the path, or split them across paths.

A Lambda handler bootstrapping a NestJS context:

```ts
import 'reflect-metadata';

import {SsmInitFactory} from '@heronlabs/env-ssm';
import {NestFactory} from '@nestjs/core';
import {SQSEvent, SQSHandler} from 'aws-lambda';

import {FunctionModule} from './application/function/function-module';

export const handler: SQSHandler = async (event: SQSEvent) => {
  // AWS_ENV_PATH = /my-service/prod → loads /my-service/prod/* into process.env
  await SsmInitFactory.env('AWS_ENV_PATH').eval();

  const app = await NestFactory.createApplicationContext(FunctionModule);
  // ...the app and its providers now read the loaded process.env
  await app.close();
};
```

Throws `Value Undefined | <paramRoot>` if `process.env[paramRoot]` is unset. A
path that returns zero parameters is **not** an error — nothing is loaded.

### 2. Resolve a single value on demand

`SsmConfigFactory.make()` returns a `ConfigService`; its `getOrThrow(key)` reads
`process.env[key]`. If the value is an SSM parameter ARN it fetches and decrypts that
parameter; otherwise it returns the raw value unchanged. One call handles both literal
config and ARN references — useful on a long-running server that reads config lazily.

In a framework-free script:

```ts
import {SsmConfigFactory} from '@heronlabs/env-ssm';

const config = SsmConfigFactory.make();
// DB_URL may be a literal, or arn:aws:ssm:us-east-1:123…:parameter/app/db-url
const dbUrl = await config.getOrThrow('DB_URL');
```

In NestJS, register it as a provider so it injects anywhere. The exported class is
`ConfigService`, so alias it on import to avoid colliding with `@nestjs/config`:

```ts
import {
  ConfigService as SsmConfigService,
  SsmConfigFactory,
} from '@heronlabs/env-ssm';
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
import {ConfigService as SsmConfigService} from '@heronlabs/env-ssm';
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

Throws `Value Undefined | <key>` if the key is unset or the ARN resolves to no value.

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

- Reads the SSM path from `$AWS_ENV_PATH` — the same variable `SsmInitFactory.env(...)`
  uses, and equally non-recursive (one level under the path).
- Emits one line per parameter: `export NAME=$'value'`, using bash ANSI-C quoting
  (`$'…'`) so newlines, single quotes, and backslashes in secrets survive intact.
  The escaping neutralises the only two bytes that can break out of `$'…'`
  (backslash and single quote), so a value can't inject shell.
- **Requires bash.** `$'…'` is a bash feature — run the `eval` under bash (the `#!/bin/bash`
  shebang above), not `sh`/dash, or the values won't decode.
- Parameter names are sanitized to valid shell identifiers — characters outside
  `[A-Za-z0-9_]` become `_`, and a leading digit is prefixed with `_`
  (`foo.bar` → `foo_bar`). Names already written as `FOO_BAR_BAZ` pass through unchanged.
- If two different names sanitize to the **same** identifier (`foo.bar` and
  `foo-bar` both → `foo_bar`), the CLI **throws** rather than silently letting one
  overwrite the other — a rename is recoverable, an ambiguous overwrite is not.
- Requires Node on the host (that's what runs `npx`). Skip the `eval` and the
  exports print but never reach your process.

> **Trust the path.** Anyone who can write to your SSM path controls the env var
> names and values you `eval` (or load) — a parameter named `PATH` or `LD_PRELOAD`
> would be exported ahead of your app. This is inherent to loading an environment
> from remote config, not specific to the CLI; restrict write access with IAM.

### Errors

Every failure throws a plain `Error` — there are no custom error classes:

- `Value Undefined | <name>` — the param-root env var is unset (the `env` / `bash`
  init path), or the key is unset / the resolved ARN points to a parameter with no
  value (`getOrThrow`).
- `Name Collision | <a>, <b> -> <identifier>` — only the CLI (`bash`) path: two
  parameter names sanitize to the same shell identifier, so exporting both would
  silently drop one. Rename one of the parameters.

A path that returns zero parameters is **not** an error — the `env` path loads
nothing and the `bash` path prints nothing.

## How it works

```
src/
├── cli.ts                              # npx entry: BashService.eval() → stdout for `eval`
├── core/
│   └── services/
│       ├── config-service.ts           # getOrThrow(): resolve one value (literal or ARN)
│       └── init/
│           ├── parameter-service.ts    # fetchParameters(): SSM path → { leaf: value }
│           ├── env-service.ts          # eval(): writes fetched params raw → process.env
│           └── bash-service.ts         # eval(): fetched params → escaped `export` lines
└── main.ts                             # SsmInitFactory + SsmConfigFactory + service classes
```

`ParameterService` is the shared SSM fetch; `EnvService` and `BashService` each
consume one — same parameters, two sinks (raw into `process.env`, escaped to stdout).

## Develop

```bash
pnpm install
pnpm build            # tsc -> bin/
pnpm lint:check
pnpm test:unit        # 100% coverage enforced
pnpm test:mutation    # 100% mutation score enforced
pnpm test:integration # Playwright + LocalStack — see qa-automator/README.md
pnpm dep:cruise       # architecture rules
```

The CI pipeline (`[ CI ] | Env SSM`) mirrors these: a sequential
build → audit → lint → unit chain, then mutation and integration as parallel
leaves. Each posts a trimmed report to the run's step summary (mutation score;
Playwright pass/fail) and uploads `mutation-reports` / `playwright-report`
artifacts. See [`qa-automator/README.md`](./qa-automator/README.md) for the
integration harness.

## Release

Publishing is automated by a single manual workflow:

1. Run the **`[ CD ] | Tags`** workflow (`workflow_dispatch`) with a semver `spec` (`major` / `minor` / `patch`). The `setup-tags` job bumps `package.json`, tags, and creates a GitHub release; the `publish-npm` job then checks out the new tag, builds, and publishes `@heronlabs/env-ssm` to npmjs with `npm publish --access public --provenance`.

Requires the `NPM_TOKEN` repository secret (an npmjs automation token with publish rights on the `@heronlabs` scope) and the `PAT` secret used by the tag workflow.

## License

MIT © HeronLabs
