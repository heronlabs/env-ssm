import {Mock} from 'moq.ts';

import {ProcessEnvService} from '../../../../src/core/services/process-env-service';

export const ProcessEnvServiceMock = {
  load: vi.fn(),
};

export const ProcessEnvServiceMoq = new Mock<ProcessEnvService>()
  .setup(mock => mock.load)
  .returns(ProcessEnvServiceMock.load)
  .object();
