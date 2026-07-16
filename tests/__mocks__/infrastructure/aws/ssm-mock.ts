import {SSM} from '@aws-sdk/client-ssm';
import {Mock} from 'moq.ts';

export const SsmMock = {
  getParameter: vi.fn(),
  getParametersByPath: vi.fn(),
};

export const SsmMoq = new Mock<SSM>()
  .setup(mock => mock.getParameter)
  .returns(SsmMock.getParameter)
  .setup(mock => mock.getParametersByPath)
  .returns(SsmMock.getParametersByPath)
  .object();
