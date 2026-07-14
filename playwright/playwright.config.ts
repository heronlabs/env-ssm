import {defineConfig} from '@playwright/test';

import {AWS_ENV_PATH, PORTS, SINGLE_SECRET_ARN} from './__mocks__/fixtures';

const aws = {
  AWS_ENDPOINT_URL: process.env.AWS_ENDPOINT_URL ?? 'http://127.0.0.1:4566',
  AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
  AWS_DEFAULT_REGION: process.env.AWS_DEFAULT_REGION ?? 'us-east-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? 'test',
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
};

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  outputDir: './test-results',
  reporter: [
    ['list'],
    ['html', {open: 'never', outputFolder: '../reports/playwright'}],
  ],
  webServer: [
    {
      command: 'npx tsx __mocks__/server-process-env.ts',
      url: `http://127.0.0.1:${PORTS.lambdaServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...aws,
        PORT: String(PORTS.lambdaServer),
        AWS_ENV_PATH,
      },
    },
    {
      command:
        'bash -c \'eval "$(node ../bin/src/cli.js)" && exec npx tsx __mocks__/server-bash-env.ts\'',
      url: `http://127.0.0.1:${PORTS.npxEvalServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...aws,
        PORT: String(PORTS.npxEvalServer),
        AWS_ENV_PATH,
      },
    },
    {
      command: 'npx tsx __mocks__/server-config-service.ts',
      url: `http://127.0.0.1:${PORTS.configParamStoreServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...aws,
        PORT: String(PORTS.configParamStoreServer),
        SINGLE_SECRET: SINGLE_SECRET_ARN,
      },
    },
  ],
});
