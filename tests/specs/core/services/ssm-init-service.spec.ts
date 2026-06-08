import {GetParametersByPathCommandOutput} from '@aws-sdk/client-ssm';
import {faker} from '@faker-js/faker';
import {Mock} from 'moq.ts';

import {CoreBootstrap} from '../../../../src/core/core-bootstrap';
import {PathUndefined} from '../../../../src/core/errors/value-undefined';
import {SsmInitService} from '../../../../src/core/services/ssm-init-service';
import {
  createTestingModule,
  ssmService,
} from '../../../__mocks__/create-testing-module';

describe('Given an init service', () => {
  let service: SsmInitService;

  beforeEach(async () => {
    const moduleRef = await createTestingModule({
      imports: [CoreBootstrap.register('ENV_PARAM_ROOT')],
    }).compile();

    service = moduleRef.get(SsmInitService);
  });

  describe('Given the PathUndefined error factory', () => {
    it('Should return a PathUndefined instance', () => {
      const path = `/${faker.string.alpha(8)}`;

      const error = PathUndefined.make(path);

      expect(error).toBeInstanceOf(PathUndefined);
    });

    it('Should produce a "Path Undefined" prefixed message', () => {
      const path = `/${faker.string.alpha(8)}`;

      const error = PathUndefined.make(path);

      expect(error.message).toBe(`'Path Undefined' | ${path}`);
    });
  });

  describe('Given a request to eval SSM parameters', () => {
    it('Should resolve when parameters are returned by path', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([
            {
              Name: `/foo/bar/${faker.string.alpha()}`,
              Value: faker.string.alpha(),
            },
          ])
          .object(),
      );

      const result = await service.evalParameters();

      expect(result).toBeUndefined();
    });

    it('Should resolve when Name and Value are both undefined', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([
            {
              Name: undefined,
              Value: undefined,
            },
          ])
          .object(),
      );

      const result = await service.evalParameters();

      expect(result).toBeUndefined();
    });

    it('Should throw PathUndefined when Parameters is undefined', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns(undefined)
          .object(),
      );

      await expect(() => service.evalParameters()).rejects.toThrow(
        PathUndefined.make('ENV_PARAM_ROOT'),
      );
    });

    it('Should throw PathUndefined when Parameters is an empty array', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([])
          .object(),
      );

      await expect(() => service.evalParameters()).rejects.toThrow(
        PathUndefined.make('ENV_PARAM_ROOT'),
      );
    });

    it('Should pass the correct path to getParametersByPath', async () => {
      const paramName = faker.string.alpha();

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([
            {Name: `/foo/bar/${paramName}`, Value: faker.string.alpha()},
          ])
          .object(),
      );

      await service.evalParameters();

      expect(ssmService.getParametersByPath).toHaveBeenCalledWith(
        expect.objectContaining({Path: 'ENV_PARAM_ROOT'}),
      );
    });

    it('Should pass WithDecryption true to getParametersByPath', async () => {
      const paramName = faker.string.alpha();

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([
            {Name: `/foo/bar/${paramName}`, Value: faker.string.alpha()},
          ])
          .object(),
      );

      await service.evalParameters();

      expect(ssmService.getParametersByPath).toHaveBeenCalledWith(
        expect.objectContaining({WithDecryption: true}),
      );
    });

    it('Should set process.env with the last path segment as key', async () => {
      const paramName = `multi_${faker.string.alpha(10)}`;
      const paramValue = faker.string.alpha();

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: `/foo/bar/${paramName}`, Value: paramValue}])
          .object(),
      );

      await service.evalParameters();

      expect(process.env[paramName]).toBe(paramValue);
    });

    it('Should not set process.env when Name is present but Value is undefined', async () => {
      const paramName = faker.string.alpha();

      delete process.env[paramName];

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: `/foo/bar/${paramName}`, Value: undefined}])
          .object(),
      );

      await service.evalParameters();

      expect(process.env[paramName]).toBeUndefined();
    });

    it('Should resolve to undefined when Value is present but Name is undefined', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: undefined, Value: faker.string.alpha()}])
          .object(),
      );

      const result = await service.evalParameters();

      expect(result).toBeUndefined();
    });

    it('Should not set process.env when Value is present but Name is undefined', async () => {
      const probeKey = 'Stryker was here';

      delete process.env[probeKey];

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: undefined, Value: faker.string.alpha()}])
          .object(),
      );

      await service.evalParameters();

      expect(process.env[probeKey]).toBeUndefined();
    });

    it('Should set process.env for parameters from every page when paginating', async () => {
      const firstName = `page1_${faker.string.alpha(10)}`;
      const firstValue = faker.string.alpha();
      const secondName = `page2_${faker.string.alpha(10)}`;
      const secondValue = faker.string.alpha();
      const nextToken = faker.string.alpha(16);

      ssmService.getParametersByPath
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([{Name: `/foo/bar/${firstName}`, Value: firstValue}])
            .setup(mock => mock.NextToken)
            .returns(nextToken)
            .object(),
        )
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([{Name: `/foo/bar/${secondName}`, Value: secondValue}])
            .setup(mock => mock.NextToken)
            .returns(undefined)
            .object(),
        );

      await service.evalParameters();

      expect(process.env).toMatchObject({
        [firstName]: firstValue,
        [secondName]: secondValue,
      });
    });

    it('Should stop paginating once NextToken is exhausted', async () => {
      ssmService.getParametersByPath
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([
              {
                Name: `/foo/bar/${faker.string.alpha()}`,
                Value: faker.string.alpha(),
              },
            ])
            .setup(mock => mock.NextToken)
            .returns(faker.string.alpha(16))
            .object(),
        )
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([
              {
                Name: `/foo/bar/${faker.string.alpha()}`,
                Value: faker.string.alpha(),
              },
            ])
            .setup(mock => mock.NextToken)
            .returns(undefined)
            .object(),
        );

      await service.evalParameters();

      expect(ssmService.getParametersByPath).toHaveBeenCalledTimes(2);
    });

    it('Should forward NextToken to the subsequent getParametersByPath request', async () => {
      const nextToken = faker.string.alpha(16);

      ssmService.getParametersByPath
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([
              {
                Name: `/foo/bar/${faker.string.alpha()}`,
                Value: faker.string.alpha(),
              },
            ])
            .setup(mock => mock.NextToken)
            .returns(nextToken)
            .object(),
        )
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([
              {
                Name: `/foo/bar/${faker.string.alpha()}`,
                Value: faker.string.alpha(),
              },
            ])
            .setup(mock => mock.NextToken)
            .returns(undefined)
            .object(),
        );

      await service.evalParameters();

      expect(ssmService.getParametersByPath).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({NextToken: nextToken}),
      );
    });

    it('Should not pass a NextToken on the first getParametersByPath request', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([
            {
              Name: `/foo/bar/${faker.string.alpha()}`,
              Value: faker.string.alpha(),
            },
          ])
          .setup(mock => mock.NextToken)
          .returns(undefined)
          .object(),
      );

      await service.evalParameters();

      expect(ssmService.getParametersByPath).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({NextToken: undefined}),
      );
    });

    it('Should throw PathUndefined when every page yields no parameters', async () => {
      ssmService.getParametersByPath
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([])
            .setup(mock => mock.NextToken)
            .returns(faker.string.alpha(16))
            .object(),
        )
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([])
            .setup(mock => mock.NextToken)
            .returns(undefined)
            .object(),
        );

      await expect(() => service.evalParameters()).rejects.toThrow(
        PathUndefined.make('ENV_PARAM_ROOT'),
      );
    });
  });
});
