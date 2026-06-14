#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cli="$here/../../bin/src/cli.js"

eval "$(node "$cli")"

exec node "$here/app.js"
