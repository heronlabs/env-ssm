import {GetParameterCommandOutput} from '@aws-sdk/client-ssm';
import {faker} from '@faker-js/faker';
import {Mock} from 'moq.ts';

import {ValueUndefined} from '../../../../src/core/errors/value-undefined';
import {SsmConfigService} from '../../../../src/core/services/ssm-config-service';
import {SsmConfigModule} from '../../../../src/core/ssm-config-module';
import {
  configService,
  createTestingModule,
  ssmService,
} from '../../../__mocks__/create-testing-module';

describe('Given a config service', () => {
  let service: SsmConfigService;

  beforeEach(async () => {
    const moduleRef = await createTestingModule({
      imports: [SsmConfigModule],
    }).compile();

    service = moduleRef.get(SsmConfigService);
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
