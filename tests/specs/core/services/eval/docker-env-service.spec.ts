import {faker} from '@faker-js/faker';

import {DockerEnvService} from '../../../../../src/core/services/eval/docker-env-service';
import {
  ParameterServiceMock,
  ParameterServiceMoq,
} from '../../../../__mocks__/infrastructure/aws/parameter-service-mock';

describe('Given a docker env service', () => {
  let service: DockerEnvService;

  beforeEach(() => {
    service = new DockerEnvService(ParameterServiceMoq);
  });

  it('Should return a single raw assignment', async () => {
    const name = `API_${faker.string.alpha(10)}`;
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {[name]: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `${name}=${value}`});
  });

  it('Should join multiple assignments with newlines', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {A: '1', B: '2'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: 'A=1\nB=2'});
  });

  it('Should leave single quotes in the value verbatim', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: "it's"},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: "NAME=it's"});
  });

  it('Should leave double quotes in the value verbatim', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: '"quoted"'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: 'NAME="quoted"'});
  });

  it('Should leave spaces, dollar signs and hashes in the value verbatim', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: 'a b $c #d'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: 'NAME=a b $c #d'});
  });

  it('Should leave a backslash in the value literal', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: 'a\\b'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: 'NAME=a\\b'});
  });

  it('Should throw naming the parameter when the value contains a newline', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {NAME: 'a\nb'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: false,
      error: Error('Value Multiline | NAME'),
    });
  });

  it('Should throw naming the original parameter when a multiline value has a sanitized name', async () => {
    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {'foo.bar': 'a\nb'},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({
      ok: false,
      error: Error('Value Multiline | foo.bar'),
    });
  });

  it('Should sanitize characters outside the identifier set in the name', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {'foo.bar': value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `foo_bar=${value}`});
  });

  it('Should prefix a leading digit in the name with an underscore', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {'9lives': value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `_9lives=${value}`});
  });

  it('Should leave an already-valid name unchanged', async () => {
    const value = faker.string.alpha();

    ParameterServiceMock.fetchAllParameters.mockReturnValueOnce({
      ok: true as const,
      data: {FOO_BAR: value},
    });

    const pathEnvVar = 'AWS_ENV_PATH';
    const result = await service.evalAll(pathEnvVar);

    expect(result).toStrictEqual({ok: true, data: `FOO_BAR=${value}`});
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
