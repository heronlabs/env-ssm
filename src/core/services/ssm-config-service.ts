import {SSM} from '@aws-sdk/client-ssm';
import {Injectable} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

import {ValueUndefined} from '../errors/value-undefined';

@Injectable()
export class SsmConfigService {
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

  constructor(
    private readonly configService: ConfigService,
    private readonly parameter: SSM,
  ) {}
}
