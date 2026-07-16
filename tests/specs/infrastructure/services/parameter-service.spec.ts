import {GetParametersByPathCommandOutput} from '@aws-sdk/client-ssm';
import {faker} from '@faker-js/faker';
import {Mock} from 'moq.ts';

import {ParameterService} from '../../../../src/infrastructure/aws/services/parameter-service';
import {SsmMock, SsmMoq} from '../../../__mocks__/infrastructure/aws/ssm-mock';
import {
  cleanEnv,
  setEnv,
  snapshotEnv,
} from '../../../__mocks__/node-process-env-helper';

describe('Given a parameter service', () => {
  let service: ParameterService;

  beforeEach(() => {
    snapshotEnv();
    setEnv('ENV_PARAM_ROOT', 'ENV_PARAM_ROOT_VALUE');
    service = new ParameterService(SsmMoq);
  });

  afterEach(() => {
    cleanEnv();
  });

  it('Should return error when the param root env var is undefined', async () => {
    delete process.env.ENV_PARAM_ROOT;

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({
      ok: false,
      error: new Error('Value Undefined | ENV_PARAM_ROOT'),
    });
  });

  it('Should map the last path segment to its value', async () => {
    const name = faker.string.alpha(10);
    const value = faker.string.alpha();

    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([{Name: `/foo/bar/${name}`, Value: value}])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {[name]: value}});
  });

  it('Should return an empty record when Name and Value are both undefined', async () => {
    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([{Name: undefined, Value: undefined}])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {}});
  });

  it('Should return an empty record when Parameters is undefined', async () => {
    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns(undefined)
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {}});
  });

  it('Should return an empty record when Parameters is an empty array', async () => {
    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {}});
  });

  it('Should pass the resolved path to getParametersByPath', async () => {
    SsmMock.getParametersByPath.mockResolvedValueOnce(
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

    await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(SsmMock.getParametersByPath).toHaveBeenCalledWith(
      expect.objectContaining({Path: 'ENV_PARAM_ROOT_VALUE'}),
    );
  });

  it('Should pass WithDecryption true to getParametersByPath', async () => {
    SsmMock.getParametersByPath.mockResolvedValueOnce(
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

    await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(SsmMock.getParametersByPath).toHaveBeenCalledWith(
      expect.objectContaining({WithDecryption: true}),
    );
  });

  it('Should keep the leaf name raw, without sanitizing', async () => {
    const value = faker.string.alpha();

    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([{Name: '/foo/bar/dotted.leaf.name', Value: value}])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({
      ok: true,
      data: {['dotted.leaf.name']: value},
    });
  });

  it('Should keep the value raw, without escaping', async () => {
    const name = faker.string.alpha(10);
    const value = "line1\nwith'quote\\and-backslash";

    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([{Name: `/foo/bar/${name}`, Value: value}])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {[name]: value}});
  });

  it('Should not map a parameter whose Value is undefined', async () => {
    const name = faker.string.alpha(10);

    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([{Name: `/foo/bar/${name}`, Value: undefined}])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {}});
  });

  it('Should map a parameter whose Value is an empty string', async () => {
    const name = faker.string.alpha(10);

    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([{Name: `/foo/bar/${name}`, Value: ''}])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {[name]: ''}});
  });

  it('Should not map a parameter whose Name is undefined', async () => {
    SsmMock.getParametersByPath.mockResolvedValueOnce(
      new Mock<GetParametersByPathCommandOutput>()
        .setup(mock => mock.Parameters)
        .returns([{Name: undefined, Value: faker.string.alpha()}])
        .object(),
    );

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {}});
  });

  it('Should map parameters from every page when paginating', async () => {
    const firstName = `page1_${faker.string.alpha(10)}`;
    const firstValue = faker.string.alpha();
    const secondName = `page2_${faker.string.alpha(10)}`;
    const secondValue = faker.string.alpha();

    SsmMock.getParametersByPath
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

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({
      ok: true,
      data: {
        [firstName]: firstValue,
        [secondName]: secondValue,
      },
    });
  });

  it('Should stop paginating once NextToken is exhausted', async () => {
    SsmMock.getParametersByPath
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

    await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(SsmMock.getParametersByPath).toHaveBeenCalledTimes(2);
  });

  it('Should forward NextToken to the subsequent request', async () => {
    const nextToken = faker.string.alpha(16);

    SsmMock.getParametersByPath
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

    await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(SsmMock.getParametersByPath).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({NextToken: nextToken}),
    );
  });

  it('Should not pass a NextToken on the first request', async () => {
    SsmMock.getParametersByPath.mockResolvedValueOnce(
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

    await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(SsmMock.getParametersByPath).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({NextToken: undefined}),
    );
  });

  it('Should return an empty record when every page yields no parameters', async () => {
    SsmMock.getParametersByPath
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

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({ok: true, data: {}});
  });

  it('Should throw error from getParametersByPath', async () => {
    const error = new Error(faker.lorem.sentence());
    SsmMock.getParametersByPath.mockImplementationOnce(() => {
      throw error;
    });

    const result = await service.fetchAllParameters('ENV_PARAM_ROOT');

    expect(result).toStrictEqual({
      ok: false,
      error,
    });
  });
});
