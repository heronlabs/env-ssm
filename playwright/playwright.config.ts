import {defineConfig} from '@playwright/test';

import {
  AWS,
  AWS_ENV_PATH,
  CONFIG_SINGLE_SECRET_ARN,
  PORTS,
} from './__mocks__/fixtures';

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
      command:
        "bash -c 'rm -rf __mocks__/.env && node ../bin/src/cli.js --format=dotenv > __mocks__/.env && exec npx tsx __mocks__/server-dot-env.ts'",
      url: `http://127.0.0.1:${PORTS.dotEnvServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...AWS(),
        PORT: String(PORTS.dotEnvServer),
        AWS_ENV_PATH,
      },
    },
    {
      command: `bash -c 'rm -rf __mocks__/.env.docker && node ../bin/src/cli.js --format=docker > __mocks__/.env.docker && docker build -t env-ssm-it-server-docker-env __mocks__ && exec docker run --rm --init -p ${PORTS.dockerEnvServer}:${PORTS.dockerEnvServer} --env-file __mocks__/.env.docker -e PORT=${PORTS.dockerEnvServer} env-ssm-it-server-docker-env'`,
      url: `http://127.0.0.1:${PORTS.dockerEnvServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...AWS(),
        AWS_ENV_PATH,
      },
    },
    {
      command: 'npx tsx __mocks__/server-process-env.ts',
      url: `http://127.0.0.1:${PORTS.processEnvServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...AWS(),
        PORT: String(PORTS.processEnvServer),
        AWS_ENV_PATH,
      },
    },
    {
      command:
        'bash -c \'eval "$(node ../bin/src/cli.js)" && exec npx tsx __mocks__/server-bash-env.ts\'',
      url: `http://127.0.0.1:${PORTS.bashServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...AWS(),
        PORT: String(PORTS.bashServer),
        AWS_ENV_PATH,
      },
    },
    {
      command: 'npx tsx __mocks__/server-config-service.ts',
      url: `http://127.0.0.1:${PORTS.configServer}/config`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        ...AWS(),
        PORT: String(PORTS.configServer),
        SINGLE_SECRET: CONFIG_SINGLE_SECRET_ARN,
      },
    },
  ],
});
