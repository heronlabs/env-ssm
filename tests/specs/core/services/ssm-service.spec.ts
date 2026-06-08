import {
  GetParameterCommandOutput,
  GetParametersByPathCommandOutput,
} from '@aws-sdk/client-ssm';
import {faker} from '@faker-js/faker';
import {Mock} from 'moq.ts';

import {CoreBootstrap} from '../../../../src/core/core-bootstrap';
import {
  PathUndefined,
  ValueUndefined,
} from '../../../../src/core/errors/value-undefined';
import {SsmService} from '../../../../src/core/services/ssm-service';
import {
  configService,
  createTestingModule,
  ssmService,
} from '../../../__mocks__/create-testing-module';

describe('Given a service', () => {
  let service: SsmService;

  beforeEach(async () => {
    const moduleRef = await createTestingModule({
      imports: [CoreBootstrap.register('ENV_PARAM_ROOT')],
    }).compile();

    service = moduleRef.get(SsmService);
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

  describe('Given the ValueUndefined error factory', () => {
    it('Should return a ValueUndefined instance', () => {
      const key = faker.string.alpha(8);

      const error = ValueUndefined.make(key);

      expect(error).toBeInstanceOf(ValueUndefined);
    });

    it('Should produce a "Value Undefined" prefixed message', () => {
      const key = faker.string.alpha(8);

      const error = ValueUndefined.make(key);

      expect(error.message).toBe(`'Value Undefined' | ${key}`);
    });
  });

  describe('Given a request to get or throw a value', () => {
    it('Should return the raw value when it is not an ARN', async () => {
      const key = faker.string.alpha(8);
      const rawValue = faker.string.alpha();

      configService.getOrThrow.mockReturnValueOnce(rawValue);

      const result = await service.getOrThrow(key);

      expect(result).toBe(rawValue);
    });

    it('Should not call getParameter when the value is not an ARN', async () => {
      const key = faker.string.alpha(8);

      configService.getOrThrow.mockReturnValueOnce(faker.string.alpha());

      await service.getOrThrow(key);

      expect(ssmService.getParameter).not.toHaveBeenCalled();
    });

    it('Should propagate when getOrThrow throws', async () => {
      const key = faker.string.alpha(8);
      const failure = new Error(faker.string.alpha());

      configService.getOrThrow.mockImplementationOnce(() => {
        throw failure;
      });

      await expect(() => service.getOrThrow(key)).rejects.toThrow(failure);
    });

    it('Should return the SSM value when the value is an ARN', async () => {
      const key = faker.string.alpha(8);
      const resolvedValue = faker.string.alpha();

      configService.getOrThrow.mockReturnValueOnce(
        'arn:aws:ssm:us-east-1:123456789012:parameter/database-password',
      );
      ssmService.getParameter.mockResolvedValueOnce(
        new Mock<GetParameterCommandOutput>()
          .setup(mock => mock.Parameter)
          .returns({Value: resolvedValue})
          .object(),
      );

      const result = await service.getOrThrow(key);

      expect(result).toBe(resolvedValue);
    });

    it('Should pass the ARN as Name to getParameter', async () => {
      const key = faker.string.alpha(8);
      const value = 'arn:aws:ssm:us-east-1:123456789012:parameter/redis-url';

      configService.getOrThrow.mockReturnValueOnce(value);
      ssmService.getParameter.mockResolvedValueOnce(
        new Mock<GetParameterCommandOutput>()
          .setup(mock => mock.Parameter)
          .returns({Value: faker.string.alpha()})
          .object(),
      );

      await service.getOrThrow(key);

      expect(ssmService.getParameter).toHaveBeenCalledWith(
        expect.objectContaining({Name: value}),
      );
    });

    it('Should pass WithDecryption true to getParameter', async () => {
      const key = faker.string.alpha(8);

      configService.getOrThrow.mockReturnValueOnce(
        'arn:aws:ssm:us-east-1:123456789012:parameter/api-key',
      );
      ssmService.getParameter.mockResolvedValueOnce(
        new Mock<GetParameterCommandOutput>()
          .setup(mock => mock.Parameter)
          .returns({Value: faker.string.alpha()})
          .object(),
      );

      await service.getOrThrow(key);

      expect(ssmService.getParameter).toHaveBeenCalledWith(
        expect.objectContaining({WithDecryption: true}),
      );
    });

    it('Should throw ValueUndefined when Parameter is undefined', async () => {
      const key = faker.string.alpha(8);

      configService.getOrThrow.mockReturnValueOnce(
        'arn:aws:ssm:us-east-1:123456789012:parameter/db-host',
      );
      ssmService.getParameter.mockResolvedValueOnce(
        new Mock<GetParameterCommandOutput>()
          .setup(mock => mock.Parameter)
          .returns(undefined)
          .object(),
      );

      await expect(() => service.getOrThrow(key)).rejects.toThrow(
        ValueUndefined.make(key),
      );
    });

    it('Should throw ValueUndefined when Parameter has no Value', async () => {
      const key = faker.string.alpha(8);

      configService.getOrThrow.mockReturnValueOnce(
        'arn:aws:ssm:us-east-1:123456789012:parameter/mail-token',
      );
      ssmService.getParameter.mockResolvedValueOnce(
        new Mock<GetParameterCommandOutput>()
          .setup(mock => mock.Parameter)
          .returns({Value: undefined})
          .object(),
      );

      await expect(() => service.getOrThrow(key)).rejects.toThrow(
        ValueUndefined.make(key),
      );
    });

    it('Should treat a partial ARN missing the parameter segment as raw', async () => {
      const key = faker.string.alpha(8);
      const rawValue = 'arn:aws:ssm:us-east-1:123456789012:other/foo';

      configService.getOrThrow.mockReturnValueOnce(rawValue);

      const result = await service.getOrThrow(key);

      expect(result).toBe(rawValue);
    });

    it('Should treat an ARN with a non-SSM service as raw', async () => {
      const key = faker.string.alpha(8);
      const rawValue = 'arn:aws:s3:us-east-1:123456789012:parameter/foo';

      configService.getOrThrow.mockReturnValueOnce(rawValue);

      const result = await service.getOrThrow(key);

      expect(result).toBe(rawValue);
    });

    it('Should treat an ARN with a non-12-digit account id as raw', async () => {
      const key = faker.string.alpha(8);
      const rawValue = 'arn:aws:ssm:us-east-1:12345:parameter/foo';

      configService.getOrThrow.mockReturnValueOnce(rawValue);

      const result = await service.getOrThrow(key);

      expect(result).toBe(rawValue);
    });

    it('Should treat an ARN with an empty parameter name as raw', async () => {
      const key = faker.string.alpha(8);
      const rawValue = 'arn:aws:ssm:us-east-1:123456789012:parameter/';

      configService.getOrThrow.mockReturnValueOnce(rawValue);

      const result = await service.getOrThrow(key);

      expect(result).toBe(rawValue);
    });

    it('Should treat a value with leading text before the ARN as raw', async () => {
      const key = faker.string.alpha(8);
      const rawValue =
        'prefix-arn:aws:ssm:us-east-1:123456789012:parameter/foo';

      configService.getOrThrow.mockReturnValueOnce(rawValue);

      const result = await service.getOrThrow(key);

      expect(result).toBe(rawValue);
    });

    it('Should treat a value with trailing text after the ARN as raw', async () => {
      const key = faker.string.alpha(8);
      const rawValue = 'arn:aws:ssm:us-east-1:123456789012:parameter/foo bar';

      configService.getOrThrow.mockReturnValueOnce(rawValue);

      const result = await service.getOrThrow(key);

      expect(result).toBe(rawValue);
    });
  });
});
