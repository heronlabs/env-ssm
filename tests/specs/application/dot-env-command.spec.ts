import {faker} from '@faker-js/faker';

import {DotEnvCommand} from '../../../src/application/cli/commands/dot-env-command';
import {EvalMock, EvalMoq} from '../../__mocks__/core/interfaces/eval-mock';

describe('Given dot env command', () => {
  let command: DotEnvCommand;

  beforeEach(() => {
    command = new DotEnvCommand(EvalMoq);
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
