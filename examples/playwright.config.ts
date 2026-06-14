import {defineConfig} from '@playwright/test';

import {AWS_ENV_PATH, PORTS, SINGLE_SECRET_ARN} from './fixtures.js';

const aws = {
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL ?? 'http://127.0.0.1:4566',
  AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
  AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? 'test',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
};

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  reporter: 'list',
  webServer: [
    {
      command: 'npx tsx apps/lambda-sim/server.ts',
      url: `http://127.0.0.1:${PORTS.lambdaSim}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {...aws, PORT: String(PORTS.lambdaSim), AWS_ENV_PATH},
    },
    {
      command:
        'bash -c \'eval "$(node ../bin/src/cli.js)" && exec npx tsx apps/npx-eval/server.ts\'',
      url: `http://127.0.0.1:${PORTS.npxEval}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {...aws, PORT: String(PORTS.npxEval), AWS_ENV_PATH},
    },
    {
      command: 'npx tsx apps/param-store/server.ts',
      url: `http://127.0.0.1:${PORTS.paramStore}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...aws,
        PORT: String(PORTS.paramStore),
        SINGLE_SECRET: SINGLE_SECRET_ARN,
      },
    },
  ],
});
