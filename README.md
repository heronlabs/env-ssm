# 🔐 env-ssm — SSM Parameter Store → environment

[![npm version][npm-badge]][npm-url]
[![CI][ci-badge]][ci-url]
[![License: MIT][license-badge]][license-url]

> **Library + CLI** to load AWS SSM Parameter Store values into `process.env`
> (in-process), into a shell via `eval`, or into a byte-exact `.env` file — plus
> a single-value resolver that handles both literals and SSM parameter ARNs.

Standalone — no framework required. The only runtime dependency is
`@aws-sdk/client-ssm`.

## Contents

- [Install](#install)
- [Usage](#usage)
  - [Load a path into `process.env`](#1-load-a-path-into-processenv)
  - [Resolve a single value on demand](#2-resolve-a-single-value-on-demand)
  - [Run as a CLI in a shell](#3-run-as-a-cli-in-a-shell)
  - [`--format=dotenv` — emit a byte-exact `.env`](#--formatdotenv--emit-a-byte-exact-env)
- [Errors](#errors)
- [Architecture](#architecture)
- [How it works](#how-it-works)
- [Develop](#develop)
- [Release](#release)
- [License](#license)

## Install

```bash
npm i @heronlabs/env-ssm
# or: pnpm add @heronlabs/env-ssm
```

## Usage

Three entry points, one job — get SSM Parameter Store values where your code
needs them.

| You have | Use | Effect |
|---|---|---|
| A Node process (Lambda, server) | `CliFactory.make().getProcessEnvCommand()` → `executeOrThrow(pathEnvVar)` | Loads every parameter under a path into `process.env` |
| A single value to resolve (literal or ARN) | `AwsFactory.make().getConfigService()` → `getOrThrow(key)` | Returns one resolved value on demand |
| A shell entry point with Node available | `eval "$(npx @heronlabs/env-ssm)"` | Exports every parameter into the current shell |
| A `.env` file to source or hand to a runtime | `npx @heronlabs/env-ssm --format=dotenv` | Prints byte-exact `NAME='value'` lines to source or write to `.env` |

These are **independent entry points — pick the one that matches where your
variables need to land, not a sequence.** Each does its own SSM fetch; the CLI
is not a prerequisite for the in-process path.

The in-process and CLI paths differ only in transport, never in the value you
end up with:

- The in-process path writes straight into the running process's
  `process.env` — **names and values raw**. An in-memory map has no syntax to
  satisfy, so nothing is rewritten or escaped.
- The CLI emits bash `export` lines for a shell to `eval`. That path **must**
  sanitize names to valid shell identifiers and escape values for bash's
  `$'…'` quoting — but bash **decodes** that escaping as it evaluates, so the
  value that lands in the environment is the original, byte for byte.

Net: both paths deliver identical **values**; they differ only in that the CLI
path may rewrite **names** (and rejects a collision, see below). `process.env`
never holds an *escaped* value in either case.

### 1. Load a path into `process.env`

`CliFactory.make().getProcessEnvCommand()` returns a `ProcessEnvCommand`; its
`executeOrThrow(pathEnvVar)` reads `process.env[pathEnvVar]` as the SSM path
prefix, fetches every parameter directly under it (`WithDecryption: true`,
paginated), and writes each leaf name into `process.env` — raw, exactly as
stored. Call it once, before anything reads config.

> The fetch is **not** recursive — it lists one level under the path. With path
> `/my-service/prod`, `/my-service/prod/DB_URL` is loaded; `/my-service/prod/db/URL`
> is not. Keep your parameters flat under the path, or split them across paths.

A Lambda handler bootstrapping a NestJS context:

```ts
import 'reflect-metadata';

import {CliFactory} from '@heronlabs/env-ssm';
import {NestFactory} from '@nestjs/core';
import {SQSEvent, SQSHandler} from 'aws-lambda';

import {FunctionModule} from './application/function/function-module';

export const handler: SQSHandler = async (event: SQSEvent) => {
  // AWS_ENV_PATH = /my-service/prod → loads /my-service/prod/* into process.env
  await CliFactory.make().getProcessEnvCommand().executeOrThrow('AWS_ENV_PATH');

  const app = await NestFactory.createApplicationContext(FunctionModule);
  // ...the app and its providers now read the loaded process.env
  await app.close();
};
```

Throws `Value Undefined | <pathEnvVar>` if `process.env[pathEnvVar]` is unset.
A path that returns zero parameters is **not** an error — nothing is loaded.

Prefer a result over an exception? The underlying service is exported too:
`CoreFactory.make().getProcessEnvService().load(pathEnvVar)` does the same work
but resolves to `{ok: true}` or `{ok: false, error}` instead of throwing.

### 2. Resolve a single value on demand

`AwsFactory.make().getConfigService()` returns a `ConfigService`; its
`getOrThrow(key)` reads `process.env[key]`. If the value is an SSM parameter
ARN (`arn:aws:ssm:<region>:<account>:parameter/<name>`) it fetches and decrypts
that parameter; otherwise it returns the raw value unchanged. One call handles
both literal config and ARN references — useful on a long-running server that
reads config lazily.

In a framework-free script:

```ts
import {AwsFactory} from '@heronlabs/env-ssm';

const config = AwsFactory.make().getConfigService();
// DB_URL may be a literal, or arn:aws:ssm:us-east-1:123…:parameter/app/db-url
const dbUrl = await config.getOrThrow('DB_URL');
```

In NestJS, register it as a provider so it injects anywhere. The exported class
is `ConfigService`, so alias it on import to avoid colliding with
`@nestjs/config`:

```ts
import {
  AwsFactory,
  ConfigService as SsmConfigService,
} from '@heronlabs/env-ssm';
import {Module} from '@nestjs/common';

@Module({
  providers: [
    {
      provide: SsmConfigService,
      useFactory: () => AwsFactory.make().getConfigService(),
    },
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

Throws `Value Undefined | <key>` if the key is unset or the ARN resolves to no
value.

### 3. Run as a CLI in a shell

For shell entry points — a Docker `ENTRYPOINT`, a CI step — where the process
that needs the variables is *not* Node, run the package with `npx`. It prints
`export` lines to stdout; wrap it in `eval` so the **current** shell applies
them.

A child process cannot mutate its parent's environment — that's an OS rule, not
a library limit. So bare `npx @heronlabs/env-ssm` would print the exports and
exit without changing your shell. `eval` runs those exports in-place, in the
shell that launches your app.

```bash
#!/bin/bash
set -e

# AWS_ENV_PATH must be set; loads every parameter under it as exports
eval "$(npx @heronlabs/env-ssm)"

node index.js
```

- Reads the SSM path from `$AWS_ENV_PATH` — the same variable shown in the
  in-process example, and equally non-recursive (one level under the path).
- Emits one line per parameter: `export NAME=$'value'`, using bash ANSI-C
  quoting (`$'…'`) so newlines, single quotes, and backslashes in secrets
  survive intact. The escaping neutralises the only two bytes that can break
  out of `$'…'` (backslash and single quote), so a value can't inject shell.
- **Requires bash.** `$'…'` is a bash feature — run the `eval` under bash (the
  `#!/bin/bash` shebang above), not `sh`/dash, or the values won't decode.
- Parameter names are sanitized to valid shell identifiers — characters outside
  `[A-Za-z0-9_]` become `_`, and a leading digit is prefixed with `_`
  (`foo.bar` → `foo_bar`). Names already written as `FOO_BAR_BAZ` pass through
  unchanged.
- If two different names sanitize to the **same** identifier (`foo.bar` and
  `foo-bar` both → `foo_bar`), the CLI **throws** rather than silently letting
  one overwrite the other — a rename is recoverable, an ambiguous overwrite is
  not.
- Requires Node on the host (that's what runs `npx`). Skip the `eval` and the
  exports print but never reach your process.

#### `--format=dotenv` — emit a byte-exact `.env`

Pass `--format=dotenv` to print dotenv-style `NAME='value'` lines instead of
bash `export` statements. Each value is wrapped in **single quotes**, with the
one byte that can break out of a single-quoted string — the single quote
itself — escaped as `'\''`. Backslashes and newlines are left **literal**:
inside bash single quotes both are taken verbatim, so `source`-ing the file
reproduces the original bytes exactly.

```bash
# Source the lines directly into the current shell
source <(npx @heronlabs/env-ssm --format=dotenv)

# …or write a .env file for a runtime that reads one
npx @heronlabs/env-ssm --format=dotenv > .env
```

It differs from the default `bash` format (`--format=bash`, the implicit
default) only in **escaping**, never in the value delivered:

- `bash` emits `export NAME=$'value'` with ANSI-C (`$'…'`) quoting — backslash,
  single quote, and newline are escaped (`\\`, `\'`, `\n`) and bash **decodes**
  them back on `eval`.
- `dotenv` emits `NAME='value'` with single-quote quoting — only the single
  quote is escaped (`'\''`), backslash and newline stay literal. The file is
  byte-exact: the text between the quotes *is* the value, so it's safe to
  `source` or commit as `.env`.

Both formats sanitize names to valid shell identifiers and reject a name
collision identically (see [Errors](#errors)). `--format=dotenv` still requires
bash to `source` (the `'\''` idiom is POSIX single-quote escaping).

An unrecognised value throws `Unknown Format | <value>`.

> **Trust the path.** Anyone who can write to your SSM path controls the env
> var names and values you `eval` (or load) — a parameter named `PATH` or
> `LD_PRELOAD` would be exported ahead of your app. This is inherent to loading
> an environment from remote config, not specific to the CLI; restrict write
> access with IAM.

## Errors

Every failure throws a plain `Error` — there are no custom error classes:

- `Value Undefined | <name>` — the path env var is unset (the `process.env` /
  CLI paths), or the key is unset / the resolved ARN points to a parameter with
  no value (`getOrThrow`).
- `Name Collision | <a>, <b> -> <identifier>` — the CLI path (`bash` and
  `dotenv` formats alike): two parameter names sanitize to the same shell
  identifier, so emitting both would silently drop one. Rename one of the
  parameters.
- `Unknown Format | <value>` — the CLI was passed a `--format=` value other
  than `bash` or `dotenv`.

A path that returns zero parameters is **not** an error — the `process.env`
path loads nothing and the `bash` / `dotenv` paths print nothing.

Internally nothing throws mid-pipeline: core and infrastructure services return
a result object — `{ok: true, data}` or `{ok: false, error}`. Exceptions
surface only at the public boundary: the commands' `executeOrThrow(...)` and
`ConfigService.getOrThrow(...)` unwrap the result and throw its error.

## Architecture

Three layers, one dependency direction — `application → core → infrastructure` —
enforced by dependency-cruiser (`pnpm dep:cruise`):

```
src/
├── cli.ts                                 # npx entry: --format=bash|dotenv → stdout for `eval`/`source`
├── main.ts                                # public exports: factories, commands, services
├── application/
│   └── cli/
│       ├── cli-factory.ts                 # CliFactory — builds commands wired to core services
│       └── commands/
│           ├── process-env-command.ts     # executeOrThrow(): load path → process.env
│           ├── bash-env-command.ts        # executeOrThrow(): path → `export NAME=$'value'` lines
│           └── dot-env-command.ts         # executeOrThrow(): path → `NAME='value'` lines
├── core/
│   ├── core-factory.ts                    # CoreFactory — builds services wired to infrastructure
│   ├── interfaces/
│   │   └── eval.ts                        # Eval — evalAll(pathEnvVar) → result with joined lines
│   └── services/
│       ├── process-env-service.ts         # load(): fetched params raw → process.env
│       └── eval/
│           ├── line-env-service.ts        # abstract base: sanitize names, detect collisions, join lines
│           ├── bash-env-service.ts        # evalLine(): ANSI-C escaping, `export` prefix
│           └── dot-env-service.ts         # evalLine(): single-quote escaping, byte-exact
└── infrastructure/
    └── aws/
        ├── aws-factory.ts                 # AwsFactory — owns the SSM client
        └── services/
            ├── parameter-service.ts       # fetchAllParameters(): SSM path → { leaf: value }, paginated
            └── config-service.ts          # getOrThrow(): one value, literal or SSM ARN
```

The dependency rules (see `.dependency-cruiser.json`) reject the reverse edges —
infrastructure importing core or application, application reaching past core
into infrastructure, core importing application — plus circular dependencies,
dead code unreachable from `main.ts`/`cli.ts`, and production imports of
devDependencies.

## How it works

**`cli.ts`** — the `npx` entry. Reads `--format=<value>` from `process.argv`
(default `bash`), asks `CliFactory` for the matching command, and writes the
command's output to stdout. Any other explicit format throws
`Unknown Format | <value>`.

**Factories** — one per layer, each a composition root for what's below it:
`AwsFactory.make()` constructs the single `SSM` client and hands out
`ParameterService` / `ConfigService`; `CoreFactory.make()` wires core services
to a `ParameterService`; `CliFactory.make()` wires commands to core services.
Consumers call `make()` on the factory of the layer they need — no DI
container.

**Commands** (`ProcessEnvCommand`, `BashEnvCommand`, `DotEnvCommand`) — thin
boundary objects: run the service, return its data, or unwrap and throw its
error.

**Fetch** — `ParameterService.fetchAllParameters(pathEnvVar)` reads
`process.env[pathEnvVar]` as the SSM path, pages through
`getParametersByPath` (`WithDecryption: true`), and returns `{ leaf: value }`
keyed by the last path segment.

**Sinks** — same parameters, three destinations. `ProcessEnvService.load()`
writes raw into `process.env`. `BashEnvService` and `DotEnvService` extend the
abstract `LineEnvService`, which sanitizes names, rejects collisions, and joins
one line per parameter — each subclass only defines `evalLine()`: ANSI-C
`export NAME=$'value'` versus byte-exact `NAME='value'`.

## Develop

Requires Node `>=22` and pnpm (see `engines` in `package.json`).

```bash
pnpm install
pnpm build            # tsc -p tsconfig.bin.json -> bin/
pnpm lint:check       # gts + JSON/YAML lint
pnpm test:unit        # vitest — 100% coverage enforced
pnpm test:mutation    # Stryker — 100% mutation score enforced
pnpm test:integration # Playwright vs LocalStack — needs `docker compose up -d`
pnpm dep:cruise       # architecture rules
```

Integration tests live in `playwright/`: `seed.ts` populates a LocalStack SSM,
then Playwright boots four tiny HTTP servers — one per delivery path
(`process.env`, `eval`'d bash exports, a generated `.env`, single-value
`ConfigService`) — against the built `bin/` output and asserts each serves the
seeded values.

The CI pipeline (`Continuous Integration`) mirrors these: a sequential
Install & Build → Audit & Supply Chain → Lint → Unit Tests chain, then Mutation
Tests and Integration tests (LocalStack) as parallel leaves. Each posts a trimmed
report to the run's step summary (mutation score; Playwright pass/fail) and
uploads `unit-test-coverage` / `mutation-reports` / `playwright-report`
artifacts.

## Release

Publishing is automated by the **`Continuous Deployment`** workflow:

- **Every push to `main`** releases a `patch` automatically.
- **Manual `workflow_dispatch`** takes a semver `spec` (`major` / `minor` /
  `patch`) for anything bigger.

The `setup-tags` job bumps the version, tags, and creates the GitHub release
(via `action-tag-release-build`); `publish-npm` then checks out the new tag,
builds, and runs `npm publish --access public --provenance` (the job holds
`id-token: write` for sigstore provenance).

Requires the `NPM_TOKEN` repository secret (an npmjs automation token with
publish rights on the `@heronlabs` scope) and the `PAT` secret used by the tag
workflow.

## License

MIT © Heron Labs

[npm-badge]: https://img.shields.io/npm/v/@heronlabs/env-ssm.svg
[npm-url]: https://www.npmjs.com/package/@heronlabs/env-ssm
[ci-badge]: https://github.com/heronlabs/env-ssm/actions/workflows/continuous-integration.yml/badge.svg
[ci-url]: https://github.com/heronlabs/env-ssm/actions/workflows/continuous-integration.yml
[license-badge]: https://img.shields.io/npm/l/@heronlabs/env-ssm.svg
[license-url]: ./LICENSE
