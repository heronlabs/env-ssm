import {
  GetParametersByPathCommandOutput,
  Parameter,
  SSM,
} from '@aws-sdk/client-ssm';
import {Inject} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

import {PathUndefined} from '../errors/value-undefined';

export class SsmInitService {
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
