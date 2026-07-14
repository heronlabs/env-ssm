import {expect, test} from '@playwright/test';

import {PORTS, SEEDS_SINGLE_SECRET} from '../../__mocks__/fixtures';

test('Should resolve a single secret by ARN When param-store handles a request', async ({
  request,
}) => {
  const res = await request.get(
    `http://127.0.0.1:${PORTS.configParamStoreServer}/config`,
  );
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({value: SEEDS_SINGLE_SECRET.value});
});
