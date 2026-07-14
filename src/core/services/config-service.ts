import {SSM} from '@aws-sdk/client-ssm';

export class ConfigService {
  async getOrThrow(key: string): Promise<string> {
    const value = process.env[key];
    if (value === undefined) {
      throw new Error(`Value Undefined | ${key}`);
    }

    const SSM_PARAMETER_ARN =
      /^arn:aws:ssm:[a-z0-9-]+:[0-9]{12}:parameter\/\S+$/;
    if (!SSM_PARAMETER_ARN.test(value)) {
      return value;
    }

    const result = await this.ssm.getParameter({
      Name: value,
      WithDecryption: true,
    });
    if (!result.Parameter || !result.Parameter.Value) {
      throw new Error(`Value Undefined | ${key}`);
    }

    return result.Parameter.Value;
  }

  constructor(private readonly ssm: SSM) {}
}
