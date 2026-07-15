import {Mock} from 'moq.ts';
import {vi} from 'vitest';

import {ParameterService} from '../../../../src/infrastructure/aws/services/parameter-service';

export const ParameterServiceMock = {
  fetchAllParameters: vi.fn(),
};

export const ParameterServiceMoq = new Mock<ParameterService>()
  .setup(mock => mock.fetchAllParameters)
  .returns(ParameterServiceMock.fetchAllParameters)
  .object();
