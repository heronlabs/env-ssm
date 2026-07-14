import {SSM} from '@aws-sdk/client-ssm';
import {Mock} from 'moq.ts';
import {Mock as ViMock, vi} from 'vitest';

import {ParameterService} from '../../src/core/services/init/parameter-service';

export const ssmService: {
  getParameter: ViMock;
  getParametersByPath: ViMock;
} = {
  getParameter: vi.fn(),
  getParametersByPath: vi.fn(),
};

export const createMockSsm = (): SSM =>
  new Mock<SSM>()
    .setup(mock => mock.getParameter)
    .returns(ssmService.getParameter)
    .setup(mock => mock.getParametersByPath)
    .returns(ssmService.getParametersByPath)
    .object();

export const createMockParameterService = (
  parameters: Record<string, string>,
): ParameterService =>
  new Mock<ParameterService>()
    .setup(mock => mock.fetchParameters())
    .returns(Promise.resolve(parameters))
    .object();

let envSnapshot: NodeJS.ProcessEnv = {};

export const snapshotEnv = (): void => {
  envSnapshot = {...process.env};
};

export const setEnv = (key: string, value: string): void => {
  process.env[key] = value;
};

export const cleanEnv = (): void => {
  const baseline = new Set(Object.keys(envSnapshot));

  for (const key of Object.keys(process.env)) {
    if (!baseline.has(key)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
};
