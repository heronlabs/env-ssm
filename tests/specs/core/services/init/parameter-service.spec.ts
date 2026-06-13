import {GetParametersByPathCommandOutput} from '@aws-sdk/client-ssm';
import {faker} from '@faker-js/faker';
import {Mock} from 'moq.ts';

import {ParameterService} from '../../../../../src/core/services/init/parameter-service';
import {
  cleanEnv,
  createMockSsm,
  setEnv,
  snapshotEnv,
  ssmService,
} from '../../../../__mocks__/test-helpers';

describe('Given a parameter service', () => {
  let service: ParameterService;

  beforeEach(() => {
    snapshotEnv();
    setEnv('ENV_PARAM_ROOT', 'ENV_PARAM_ROOT_VALUE');

    service = new ParameterService(createMockSsm(), 'ENV_PARAM_ROOT');
  });

  afterEach(() => {
    cleanEnv();
  });

  describe('Given a request to fetch parameters', () => {
    it('Should throw when the param root env var is undefined', async () => {
      delete process.env.ENV_PARAM_ROOT;

      await expect(() => service.fetchParameters()).rejects.toThrow(
        Error('Value Undefined | ENV_PARAM_ROOT'),
      );
    });

    it('Should map the last path segment to its value', async () => {
      const name = faker.string.alpha(10);
      const value = faker.string.alpha();

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: `/foo/bar/${name}`, Value: value}])
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result).toEqual({[name]: value});
    });

    it('Should return an empty record when Name and Value are both undefined', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: undefined, Value: undefined}])
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result).toEqual({});
    });

    it('Should return an empty record when Parameters is undefined', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns(undefined)
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result).toEqual({});
    });

    it('Should return an empty record when Parameters is an empty array', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([])
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result).toEqual({});
    });

    it('Should pass the resolved path to getParametersByPath', async () => {
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

      await service.fetchParameters();

      expect(ssmService.getParametersByPath).toHaveBeenCalledWith(
        expect.objectContaining({Path: 'ENV_PARAM_ROOT_VALUE'}),
      );
    });

    it('Should pass WithDecryption true to getParametersByPath', async () => {
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

      await service.fetchParameters();

      expect(ssmService.getParametersByPath).toHaveBeenCalledWith(
        expect.objectContaining({WithDecryption: true}),
      );
    });

    it('Should keep the leaf name raw, without sanitizing', async () => {
      const value = faker.string.alpha();

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: '/foo/bar/dotted.leaf.name', Value: value}])
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result['dotted.leaf.name']).toBe(value);
    });

    it('Should keep the value raw, without escaping', async () => {
      const name = faker.string.alpha(10);
      const value = "line1\nwith'quote\\and-backslash";

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: `/foo/bar/${name}`, Value: value}])
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result[name]).toBe(value);
    });

    it('Should not map a parameter whose Value is undefined', async () => {
      const name = faker.string.alpha(10);

      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: `/foo/bar/${name}`, Value: undefined}])
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result).toEqual({});
    });

    it('Should not map a parameter whose Name is undefined', async () => {
      ssmService.getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: undefined, Value: faker.string.alpha()}])
          .object(),
      );

      const result = await service.fetchParameters();

      expect(result).toEqual({});
    });

    it('Should map parameters from every page when paginating', async () => {
      const firstName = `page1_${faker.string.alpha(10)}`;
      const firstValue = faker.string.alpha();
      const secondName = `page2_${faker.string.alpha(10)}`;
      const secondValue = faker.string.alpha();

      ssmService.getParametersByPath
        .mockResolvedValueOnce(
          new Mock<GetParametersByPathCommandOutput>()
            .setup(mock => mock.Parameters)
            .returns([{Name: `/foo/bar/${firstName}`, Value: firstValue}])
            .setup(mock => mock.NextToken)
            .returns(faker.string.alpha(16))
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

      const result = await service.fetchParameters();

      expect(result).toEqual({
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

      await service.fetchParameters();

      expect(ssmService.getParametersByPath).toHaveBeenCalledTimes(2);
    });

    it('Should forward NextToken to the subsequent request', async () => {
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

      await service.fetchParameters();

      expect(ssmService.getParametersByPath).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({NextToken: nextToken}),
      );
    });

    it('Should not pass a NextToken on the first request', async () => {
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

      await service.fetchParameters();

      expect(ssmService.getParametersByPath).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({NextToken: undefined}),
      );
    });

    it('Should return an empty record when every page yields no parameters', async () => {
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

      const result = await service.fetchParameters();

      expect(result).toEqual({});
    });
  });
});
