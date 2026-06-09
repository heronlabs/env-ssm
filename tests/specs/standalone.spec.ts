import {GetParametersByPathCommandOutput, SSM} from '@aws-sdk/client-ssm';
import {faker} from '@faker-js/faker';
import {Mock} from 'moq.ts';
import {Mock as ViMock, vi} from 'vitest';

import {PathUndefined} from '../../src/core/errors/value-undefined';
import {loadSsmParameters} from '../../src/standalone';

const getParametersByPath: ViMock = vi.fn();

vi.mock('@aws-sdk/client-ssm', () => ({
  SSM: vi.fn(),
}));

describe('Given the standalone SSM loader', () => {
  const pathEnvVar = 'AWS_ENV_PATH';
  const path = `/${faker.string.alpha(8)}`;

  beforeEach(() => {
    // restoreMocks/mockReset wipe implementations between tests, so re-wire
    // the SSM constructor (called with `new`) to hand back our stubbed client.
    vi.mocked(SSM).mockImplementation(
      class {
        getParametersByPath = getParametersByPath;
      } as unknown as typeof SSM,
    );

    process.env[pathEnvVar] = path;
  });

  afterEach(() => {
    delete process.env[pathEnvVar];
  });

  describe('Given the path env var is undefined', () => {
    it('Should throw PathUndefined named after the env var', async () => {
      delete process.env[pathEnvVar];

      await expect(() => loadSsmParameters(pathEnvVar)).rejects.toThrow(
        PathUndefined.make(pathEnvVar),
      );
    });

    it('Should not call getParametersByPath', async () => {
      delete process.env[pathEnvVar];

      await expect(() => loadSsmParameters(pathEnvVar)).rejects.toThrow(
        PathUndefined,
      );

      expect(getParametersByPath).not.toHaveBeenCalled();
    });

    it('Should default pathEnvVar to AWS_ENV_PATH', async () => {
      delete process.env[pathEnvVar];

      await expect(() => loadSsmParameters()).rejects.toThrow(
        PathUndefined.make('AWS_ENV_PATH'),
      );
    });
  });

  describe('Given a request to load SSM parameters', () => {
    it('Should construct the SSM client with the 2014-11-06 api version', async () => {
      getParametersByPath.mockResolvedValueOnce(
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

      await loadSsmParameters(pathEnvVar);

      expect(SSM).toHaveBeenCalledWith({apiVersion: '2014-11-06'});
    });

    it('Should resolve when parameters are returned by path', async () => {
      getParametersByPath.mockResolvedValueOnce(
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

      const result = await loadSsmParameters(pathEnvVar);

      expect(result).toBeUndefined();
    });

    it('Should resolve when Name and Value are both undefined', async () => {
      getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: undefined, Value: undefined}])
          .object(),
      );

      const result = await loadSsmParameters(pathEnvVar);

      expect(result).toBeUndefined();
    });

    it('Should throw PathUndefined when Parameters is undefined', async () => {
      getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns(undefined)
          .object(),
      );

      await expect(() => loadSsmParameters(pathEnvVar)).rejects.toThrow(
        PathUndefined.make(path),
      );
    });

    it('Should throw PathUndefined when Parameters is an empty array', async () => {
      getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([])
          .object(),
      );

      await expect(() => loadSsmParameters(pathEnvVar)).rejects.toThrow(
        PathUndefined.make(path),
      );
    });

    it('Should pass the resolved path to getParametersByPath', async () => {
      getParametersByPath.mockResolvedValueOnce(
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

      await loadSsmParameters(pathEnvVar);

      expect(getParametersByPath).toHaveBeenCalledWith(
        expect.objectContaining({Path: path}),
      );
    });

    it('Should pass WithDecryption true to getParametersByPath', async () => {
      getParametersByPath.mockResolvedValueOnce(
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

      await loadSsmParameters(pathEnvVar);

      expect(getParametersByPath).toHaveBeenCalledWith(
        expect.objectContaining({WithDecryption: true}),
      );
    });

    it('Should set process.env with the last path segment as key', async () => {
      const paramName = `multi_${faker.string.alpha(10)}`;
      const paramValue = faker.string.alpha();

      getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: `/foo/bar/${paramName}`, Value: paramValue}])
          .object(),
      );

      await loadSsmParameters(pathEnvVar);

      expect(process.env[paramName]).toBe(paramValue);
    });

    it('Should not set process.env when Name is present but Value is undefined', async () => {
      const paramName = faker.string.alpha();

      delete process.env[paramName];

      getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: `/foo/bar/${paramName}`, Value: undefined}])
          .object(),
      );

      await loadSsmParameters(pathEnvVar);

      expect(process.env[paramName]).toBeUndefined();
    });

    it('Should not set process.env when Value is present but Name is undefined', async () => {
      const probeKey = 'standalone probe';

      delete process.env[probeKey];

      getParametersByPath.mockResolvedValueOnce(
        new Mock<GetParametersByPathCommandOutput>()
          .setup(mock => mock.Parameters)
          .returns([{Name: undefined, Value: faker.string.alpha()}])
          .object(),
      );

      await loadSsmParameters(pathEnvVar);

      expect(process.env[probeKey]).toBeUndefined();
    });

    it('Should set process.env for parameters from every page when paginating', async () => {
      const firstName = `page1_${faker.string.alpha(10)}`;
      const firstValue = faker.string.alpha();
      const secondName = `page2_${faker.string.alpha(10)}`;
      const secondValue = faker.string.alpha();
      const nextToken = faker.string.alpha(16);

      getParametersByPath
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

      await loadSsmParameters(pathEnvVar);

      expect(process.env).toMatchObject({
        [firstName]: firstValue,
        [secondName]: secondValue,
      });
    });

    it('Should stop paginating once NextToken is exhausted', async () => {
      getParametersByPath
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

      await loadSsmParameters(pathEnvVar);

      expect(getParametersByPath).toHaveBeenCalledTimes(2);
    });

    it('Should forward NextToken to the subsequent getParametersByPath request', async () => {
      const nextToken = faker.string.alpha(16);

      getParametersByPath
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

      await loadSsmParameters(pathEnvVar);

      expect(getParametersByPath).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({NextToken: nextToken}),
      );
    });

    it('Should not pass a NextToken on the first getParametersByPath request', async () => {
      getParametersByPath.mockResolvedValueOnce(
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

      await loadSsmParameters(pathEnvVar);

      expect(getParametersByPath).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({NextToken: undefined}),
      );
    });

    it('Should throw PathUndefined when every page yields no parameters', async () => {
      getParametersByPath
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

      await expect(() => loadSsmParameters(pathEnvVar)).rejects.toThrow(
        PathUndefined.make(path),
      );
    });
  });
});
