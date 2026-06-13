import {faker} from '@faker-js/faker';

import {EnvService} from '../../../../../src/core/services/init/env-service';
import {
  cleanEnv,
  createMockParameterService,
  snapshotEnv,
} from '../../../../__mocks__/test-helpers';

describe('Given an env service', () => {
  beforeEach(() => {
    snapshotEnv();
  });

  afterEach(() => {
    cleanEnv();
  });

  describe('Given a request to evaluate parameters into the environment', () => {
    it('Should write each fetched parameter to process.env', async () => {
      const name = `ENV_${faker.string.alpha(10)}`;
      const value = faker.string.alpha();

      const service = new EnvService(
        createMockParameterService({[name]: value}),
      );

      await service.eval();

      expect(process.env[name]).toBe(value);
    });

    it('Should write the value raw, without escaping', async () => {
      const name = `RAW_${faker.string.alpha(10)}`;
      const value = "line1\nwith'quote\\and-backslash";

      const service = new EnvService(
        createMockParameterService({[name]: value}),
      );

      await service.eval();

      expect(process.env[name]).toBe(value);
    });

    it('Should write every parameter when several are fetched', async () => {
      const first = `ENV_${faker.string.alpha(10)}`;
      const second = `ENV_${faker.string.alpha(10)}`;
      const firstValue = faker.string.alpha();
      const secondValue = faker.string.alpha();

      const service = new EnvService(
        createMockParameterService({
          [first]: firstValue,
          [second]: secondValue,
        }),
      );

      await service.eval();

      expect(process.env).toMatchObject({
        [first]: firstValue,
        [second]: secondValue,
      });
    });

    it('Should resolve to undefined', async () => {
      const service = new EnvService(
        createMockParameterService({
          [`ENV_${faker.string.alpha(10)}`]: faker.string.alpha(),
        }),
      );

      const result = await service.eval();

      expect(result).toBeUndefined();
    });
  });
});
