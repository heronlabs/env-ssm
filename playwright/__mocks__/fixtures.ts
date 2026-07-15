export const PORTS = {
  processEnvServer: 4011,
  bashServer: 4012,
  configServer: 4013,
  dotEnvServer: 4014,
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

export const SEEDS_CONFIG_SINGLE_SECRET = {
  name: `${AWS_ENV_PATH}single-secret`,
  value: 'single-secret-value-env-ssm-it',
  type: 'SecureString',
} as const;
export const CONFIG_SINGLE_SECRET_ARN = `arn:aws:ssm:us-east-1:000000000000:parameter${SEEDS_CONFIG_SINGLE_SECRET.name}`;

export const AWS = () => ({
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL ?? 'http://127.0.0.1:4566',
  AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
  AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? 'test',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
});
