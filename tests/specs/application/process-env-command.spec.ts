import {faker} from '@faker-js/faker';

import {ProcessEnvCommand} from '../../../src/application/cli/commands/process-env-command';
import {
  ProcessEnvServiceMock,
  ProcessEnvServiceMoq,
} from '../../__mocks__/core/services/process-env-service-mock';

describe('Given process env command', () => {
  let command: ProcessEnvCommand;

  beforeEach(() => {
    command = new ProcessEnvCommand(ProcessEnvServiceMoq);
  });
  it('Should return result data', async () => {
    ProcessEnvServiceMock.load.mockResolvedValueOnce({
      ok: true,
    });

    const pathEnvVar = faker.string.alpha();
    const result = await command.executeOrThrow(pathEnvVar);

    expect(result).toBeUndefined();
  });

  it('Should throw error', async () => {
    const error = new Error(faker.lorem.sentence());
    ProcessEnvServiceMock.load.mockResolvedValueOnce({
      ok: false,
      error,
    });

    const pathEnvVar = faker.string.alpha();
    await expect(() => command.executeOrThrow(pathEnvVar)).rejects.toThrow(
      error,
    );
  });
});
