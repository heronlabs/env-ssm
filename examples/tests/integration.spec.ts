import {expect, test} from '@playwright/test';

import {
  EXPECTED_PATH_CONFIG,
  EXPECTED_SINGLE_SECRET,
  PORTS,
} from '../fixtures.js';

test('lambda-sim hydrates process.env from an SSM path at boot', async ({
  request,
}) => {
  const res = await request.get(`http://127.0.0.1:${PORTS.lambdaSim}/config`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(EXPECTED_PATH_CONFIG);
});

test('npx-eval exposes shell vars exported by the CLI eval', async ({
  request,
}) => {
  const res = await request.get(`http://127.0.0.1:${PORTS.npxEval}/config`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(EXPECTED_PATH_CONFIG);
});

test('param-store resolves a single secret by ARN per request', async ({
  request,
}) => {
  const res = await request.get(`http://127.0.0.1:${PORTS.paramStore}/config`);
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual(EXPECTED_SINGLE_SECRET);
});
