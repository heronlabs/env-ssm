import {SSM} from '@aws-sdk/client-ssm';
import {ModuleMetadata} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {Test, TestingModuleBuilder} from '@nestjs/testing';
import {Mock} from 'moq.ts';
import {Mock as ViMock, vi} from 'vitest';

export const ssmService: {
  getParameter: ViMock;
  getParametersByPath: ViMock;
} = {
  getParameter: vi.fn(),
  getParametersByPath: vi.fn(),
};

export const configService: {
  get: ViMock;
  getOrThrow: ViMock;
} = {
  get: vi.fn(),
  getOrThrow: vi.fn(),
};

export const createTestingModule = (
  metadata: ModuleMetadata,
): TestingModuleBuilder => {
  configService.get.mockImplementation((key: string) => key);
  configService.getOrThrow.mockImplementation((key: string) => key);

  const moduleRef = Test.createTestingModule(metadata);

  moduleRef
    .overrideProvider(SSM)
    .useValue(
      new Mock<SSM>()
        .setup(mock => mock.getParameter)
        .returns(ssmService.getParameter)
        .setup(mock => mock.getParametersByPath)
        .returns(ssmService.getParametersByPath)
        .object(),
    )
    .overrideProvider(ConfigService)
    .useValue(configService);

  return moduleRef;
};
