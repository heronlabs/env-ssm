import {faker} from '@faker-js/faker';

import {BashEnvCommand} from '../../../src/application/cli/commands/bash-env-command';
import {EvalMock, EvalMoq} from '../../__mocks__/core/interfaces/eval-mock';

describe('Given bash env command', () => {
  let command: BashEnvCommand;

  beforeEach(() => {
    command = new BashEnvCommand(EvalMoq);
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
