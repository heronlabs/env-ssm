#!/usr/bin/env bash
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

: "${AWS_ENDPOINT_URL:=http://localhost:4566}"
: "${AWS_REGION:=us-east-1}"
: "${AWS_DEFAULT_REGION:=$AWS_REGION}"
: "${AWS_ACCESS_KEY_ID:=test}"
: "${AWS_SECRET_ACCESS_KEY:=test}"
: "${AWS_ENV_PATH:=/env-ssm-it/}"
: "${SINGLE_SECRET:=arn:aws:ssm:us-east-1:000000000000:parameter/env-ssm-it/single-secret}"

export AWS_ENDPOINT_URL AWS_REGION AWS_DEFAULT_REGION
export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_ENV_PATH SINGLE_SECRET

put() {
  aws ssm put-parameter \
    --overwrite \
    --endpoint-url "$AWS_ENDPOINT_URL" \
    --name "$1" \
    --type "$2" \
    --value "$3" \
    >/dev/null
}

echo "[run] seeding LocalStack at $AWS_ENDPOINT_URL"
put /env-ssm-it/DATABASE_URL SecureString 'postgres://it-user:it-pass@db.internal:5432/env_ssm_it'
put /env-ssm-it/API_KEY String 'sk-env-ssm-it-0123456789'
put /env-ssm-it/single-secret SecureString 'single-secret-value-env-ssm-it'

echo "[run] lambda-sim"
node "$here/lambda-sim/app.js"

echo "[run] npx-eval"
bash "$here/npx-eval/run.sh"

echo "[run] param-store"
node "$here/param-store/app.js"

echo "[run] PASS all integration examples"
