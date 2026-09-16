import {faker} from '@faker-js/faker';

import {DockerEnvCommand} from '../../../src/application/cli/commands/docker-env-command';
import {EvalMock, EvalMoq} from '../../__mocks__/core/interfaces/eval-mock';

describe('Given docker env command', () => {
  let command: DockerEnvCommand;

  beforeEach(() => {
    command = new DockerEnvCommand(EvalMoq);
  });
  it('Should return result data', async () => {
    EvalMock.evalAll.mockResolvedValueOnce({
      ok: true,
      data: 'OK',
    });

    const pathEnvVar = faker.string.alpha();
    const result = await command.executeOrThrow(pathEnvVar);

    expect(result).toBe('OK');
  });

  it('Should throw error', async () => {
    const error = new Error(faker.lorem.sentence());
    EvalMock.evalAll.mockResolvedValueOnce({
      ok: false,
      error,
    });

    const pathEnvVar = faker.string.alpha();
    await expect(() => command.executeOrThrow(pathEnvVar)).rejects.toThrow(
      error,
    );
  });
});
