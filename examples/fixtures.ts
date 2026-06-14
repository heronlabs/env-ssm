export const AWS_ENV_PATH = '/env-ssm-it/';

export const SINGLE_SECRET_ARN =
  'arn:aws:ssm:us-east-1:000000000000:parameter/env-ssm-it/single-secret';

export const PORTS = {
  lambdaSim: 4011,
  npxEval: 4012,
  paramStore: 4013,
} as const;

type SeedType = 'String' | 'SecureString';

interface Seed {
  name: string;
  value: string;
  type: SeedType;
}

export const SEEDS: Seed[] = [
  {
    name: '/env-ssm-it/DATABASE_URL',
    value: 'postgres://it-user:it-pass@db.internal:5432/env_ssm_it',
    type: 'SecureString',
  },
  {
    name: '/env-ssm-it/API_KEY',
    value: 'sk-env-ssm-it-0123456789',
    type: 'String',
  },
  {
    name: '/env-ssm-it/single-secret',
    value: 'single-secret-value-env-ssm-it',
    type: 'SecureString',
  },
];

export const EXPECTED_PATH_CONFIG = {
  DATABASE_URL: 'postgres://it-user:it-pass@db.internal:5432/env_ssm_it',
  API_KEY: 'sk-env-ssm-it-0123456789',
};

export const EXPECTED_SINGLE_SECRET = {
  value: 'single-secret-value-env-ssm-it',
};
