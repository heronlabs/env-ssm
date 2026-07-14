import {Mock} from 'moq.ts';
import {Mock as ViMock, vi} from 'vitest';

import {ParameterService} from '../../../../src/infrastructure/aws/services/parameter-service';

export const ParameterServiceMock: {
  fetchAllParameters: ViMock;
} = {
  fetchAllParameters: vi.fn(),
};

export const ParameterServiceMoq = new Mock<ParameterService>()
  .setup(mock => mock.fetchAllParameters)
  .returns(ParameterServiceMock.fetchAllParameters)
  .object();
