import {expect, test} from '@playwright/test';

import {PORTS, SEEDS_API_KEY, SEEDS_DATABASE_URL} from '../__mocks__/fixtures';

test('Should hydrate process.env from the SSM path When the lambda-sim app boots', async ({
  request,
}) => {
  const res = await request.get(`http://127.0.0.1:${PORTS.lambdaSim}/config`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({
    DATABASE_URL: SEEDS_DATABASE_URL.value,
    API_KEY: SEEDS_API_KEY.value,
  });
});
