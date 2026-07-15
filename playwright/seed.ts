import {SSM} from '@aws-sdk/client-ssm';

import {
  SEEDS_API_KEY,
  SEEDS_CONFIG_SINGLE_SECRET,
  SEEDS_DATABASE_URL,
} from './__mocks__/fixtures';

async function seedParameters() {
  const ssm = new SSM({
    endpoint: process.env.AWS_ENDPOINT_URL ?? 'http://127.0.0.1:4566',
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
    },
  });

  for (const seed of [
    SEEDS_DATABASE_URL,
    SEEDS_API_KEY,
    SEEDS_CONFIG_SINGLE_SECRET,
  ]) {
    await ssm.putParameter({
      Name: seed.name,
      Value: seed.value,
      Type: seed.type,
      Overwrite: true,
    });
  }
}

void (async () => {
  await seedParameters();
})();
