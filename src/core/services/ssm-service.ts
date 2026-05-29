import {SSM} from '@aws-sdk/client-ssm';
import {Inject} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

import {PathUndefined} from '../errors/value-undefined';

export class SsmService {
  async evalParameters(): Promise<void> {
    const path = this.configService.getOrThrow<string>(this.paramRoot);

    const result = await this.parameter.getParametersByPath({
      Path: path,
      WithDecryption: true,
    });

    if (!result.Parameters || result.Parameters.length === 0) {
      throw PathUndefined.make(path);
    }

    result.Parameters.forEach(parameter => {
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
