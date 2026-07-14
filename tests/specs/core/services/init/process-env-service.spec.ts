import {faker} from '@faker-js/faker';

import {ProcessEnvService} from '../../../../../src/core/services/process-env-service';
import {
  ParameterServiceMock,
  ParameterServiceMoq,
} from '../../../../__mocks__/infrastructure/aws/parameter-service-mock';
import {
  cleanEnv,
  snapshotEnv,
} from '../../../../__mocks__/node-process-env-helper';

describe('Given an env service', () => {
  let service: ProcessEnvService;

  beforeEach(() => {
    snapshotEnv();
    service = new ProcessEnvService(ParameterServiceMoq);
  });

  afterEach(() => {
    cleanEnv();
  });

  it('Should write each fetched parameter to process.env', async () => {
    const name = `ENV_${faker.string.alpha(10)}`;
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {[name]: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    await service.load(pathEnvVar);

    expect(process.env[name]).toBe(value);
  });

  it('Should write the value raw, without escaping', async () => {
    const name = `RAW_${faker.string.alpha(10)}`;
    const value = "line1\nwith'quote\\and-backslash";

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {[name]: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    await service.load(pathEnvVar);

    expect(process.env[name]).toBe(value);
  });

  it('Should write every parameter when several are fetched', async () => {
    const first = `ENV_${faker.string.alpha(10)}`;
    const second = `ENV_${faker.string.alpha(10)}`;
    const firstValue = faker.string.alpha();
    const secondValue = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {
        [first]: firstValue,
        [second]: secondValue,
      },
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    await service.load(pathEnvVar);

    expect(process.env).toMatchObject({
      [first]: firstValue,
      [second]: secondValue,
    });
  });

  it('Should resolve to undefined', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {
        [`ENV_${faker.string.alpha(10)}`]: faker.string.alpha(),
      },
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.load(pathEnvVar);

    expect(result).toStrictEqual({ok: true});
  });
});
