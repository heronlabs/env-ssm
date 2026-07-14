export const PORTS = {
  lambdaServer: 4011,
  npxEvalServer: 4012,
  configParamStoreServer: 4013,
} as const;

export const AWS_ENV_PATH = '/env-ssm-it/';

export const SEEDS_DATABASE_URL = {
  name: `${AWS_ENV_PATH}DATABASE_URL`,
  value: 'postgres://it-user:it-pass@db.internal:5432/env_ssm_it',
  type: 'SecureString',
} as const;

export const SEEDS_API_KEY = {
  name: `${AWS_ENV_PATH}API_KEY`,
  value: 'sk-env-ssm-it-0123456789',
  type: 'String',
} as const;

export const SEEDS_SINGLE_SECRET = {
  name: `${AWS_ENV_PATH}single-secret`,
  value: 'single-secret-value-env-ssm-it',
  type: 'SecureString',
} as const;

export const SINGLE_SECRET_ARN = `arn:aws:ssm:us-east-1:000000000000:parameter${SEEDS_SINGLE_SECRET.name}`;
