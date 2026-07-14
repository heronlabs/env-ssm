import {faker} from '@faker-js/faker';

import {DotEnvService} from '../../../../../src/main';
import {
  ParameterServiceMock,
  ParameterServiceMoq,
} from '../../../../__mocks__/infrastructure/aws/parameter-service-mock';

describe('Given a dotenv service', () => {
  let service: DotEnvService;

  beforeEach(() => {
    service = new DotEnvService(ParameterServiceMoq);
  });

  it('Should return a single dotenv assignment', async () => {
    const name = `API_${faker.string.alpha(10)}`;
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {[name]: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `${name}='${value}'`});
  });

  it('Should join multiple assignments with newlines', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {A: '1', B: '2'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "A='1'\nB='2'"});
  });

  it('Should escape a single quote in the value', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: "it's"},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "NAME='it'\\''s'"});
  });

  it('Should escape every single quote in a value with two of them', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: "a'b'c"},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "NAME='a'\\''b'\\''c'"});
  });

  it('Should leave a backslash in the value literal', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: 'a\\b'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "NAME='a\\b'"});
  });

  it('Should leave a newline in the value literal', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: 'a\nb'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "NAME='a\nb'"});
  });

  it('Should sanitize characters outside the identifier set in the name', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {'foo.bar': value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `foo_bar='${value}'`});
  });

  it('Should prefix a leading digit in the name with an underscore', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {'9lives': value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `_9lives='${value}'`});
  });

  it('Should leave a non-leading digit in the name untouched', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {foo9bar: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `foo9bar='${value}'`});
  });

  it('Should leave an already-valid name unchanged', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {FOO_BAR: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `FOO_BAR='${value}'`});
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
});
