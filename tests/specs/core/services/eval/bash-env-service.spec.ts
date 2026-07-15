import {faker} from '@faker-js/faker';

import {BashEnvService} from '../../../../../src/core/services/eval/bash-env-service';
import {
  ParameterServiceMock,
  ParameterServiceMoq,
} from '../../../../__mocks__/infrastructure/aws/parameter-service-mock';

describe('Given a bash service', () => {
  let service: BashEnvService;

  beforeEach(() => {
    service = new BashEnvService(ParameterServiceMoq);
  });

  it('Should return a single export statement', async () => {
    const name = `API_${faker.string.alpha(10)}`;
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {[name]: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: true,
      data: `export ${name}=$'${value}'`,
    });
  });

  it('Should join multiple exports with newlines', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {A: '1', B: '2'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: true,
      data: "export A=$'1'\nexport B=$'2'",
    });
  });

  it('Should escape backslashes in the value', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: 'a\\b'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "export NAME=$'a\\\\b'"});
  });

  it('Should escape single quotes in the value', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: "it's"},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "export NAME=$'it\\'s'"});
  });

  it('Should escape newlines in the value', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: 'a\nb'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "export NAME=$'a\\nb'"});
  });

  it('Should escape a backslash before a single quote in order', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: "\\'"},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "export NAME=$'\\\\\\''"});
  });

  it('Should sanitize characters outside the identifier set in the name', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {'foo.bar': value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: true,
      data: `export foo_bar=$'${value}'`,
    });
  });

  it('Should prefix a leading digit in the name with an underscore', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {'9lives': value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: true,
      data: `export _9lives=$'${value}'`,
    });
  });

  it('Should leave a non-leading digit in the name untouched', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {foo9bar: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: true,
      data: `export foo9bar=$'${value}'`,
    });
  });

  it('Should leave an already-valid name unchanged', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {FOO_BAR: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: true,
      data: `export FOO_BAR=$'${value}'`,
    });
  });

  it('Should throw naming both parameters when names collide after sanitizing', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {
        'foo.bar': faker.string.alpha(),
        'foo-bar': faker.string.alpha(),
      },
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: false,
      error: Error('Name Collision | foo.bar, foo-bar -> foo_bar'),
    });
  });

  it('Should return error from fetchAllParameters', async () => {
    const error = new Error(faker.lorem.sentence());
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: false as const,
      error,
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: false,
      error,
    });
  });

  it('Should return error from fetchAllParameters throws', async () => {
    const error = new Error(faker.lorem.sentence());
    ParameterServiceMock.fetchAllParameters.mockImplementationOnce(() => {
      throw error;
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: false,
      error,
    });
  });
});
