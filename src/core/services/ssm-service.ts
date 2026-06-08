import {
  GetParametersByPathCommandOutput,
  Parameter,
  SSM,
} from '@aws-sdk/client-ssm';
import {Inject} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

import {PathUndefined, ValueUndefined} from '../errors/value-undefined';

export class SsmService {
  async getOrThrow(key: string): Promise<string> {
    const SSM_PARAMETER_ARN =
      /^arn:aws:ssm:[a-z0-9-]+:[0-9]{12}:parameter\/\S+$/;

    const value = this.configService.getOrThrow<string>(key);

    if (!SSM_PARAMETER_ARN.test(value)) {
      return value;
    }

    const result = await this.parameter.getParameter({
      Name: value,
      WithDecryption: true,
    });

    if (!result.Parameter || !result.Parameter.Value) {
      throw ValueUndefined.make(key);
    }

    return result.Parameter.Value;
  }

  async evalParameters(): Promise<void> {
    const path = this.configService.getOrThrow<string>(this.paramRoot);

    const parameters: Parameter[] = [];

    let nextToken: string | undefined = undefined;

    do {
      const result: GetParametersByPathCommandOutput =
        await this.parameter.getParametersByPath({
          Path: path,
          WithDecryption: true,
          NextToken: nextToken,
        });

      if (result.Parameters) {
        parameters.push(...result.Parameters);
      }

      nextToken = result.NextToken;
    } while (nextToken);

    if (parameters.length === 0) {
      throw PathUndefined.make(path);
    }

    parameters.forEach(parameter => {
      const {Name, Value} = parameter;

      const names = Name ? Name.split('/') : [];

      const parameterName = names.pop();

      if (parameterName && Value) {
        process.env[parameterName] = Value;
      }
    });
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly parameter: SSM,
    @Inject('ParamRoot') private readonly paramRoot: string,
  ) {}
}
