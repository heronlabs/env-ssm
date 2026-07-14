import {SSM} from '@aws-sdk/client-ssm';

export class ConfigService {
  async get(key: string) {
    try {
      const value = process.env[key];

      if (value === undefined) {
        return {
          ok: false as const,
          error: new Error(`Value Undefined | ${key}`),
        };
      }

      const SSM_PARAMETER_ARN =
        /^arn:aws:ssm:[a-z0-9-]+:[0-9]{12}:parameter\/\S+$/;
      if (!SSM_PARAMETER_ARN.test(value)) {
        return {ok: true as const, data: value};
      }

      const result = await this.ssm.getParameter({
        Name: value,
        WithDecryption: true,
      });

      return {ok: true as const, data: result?.Parameter?.Value};
    } catch (error) {
      return {
        ok: false as const,
        error,
      };
    }
  }

  async getOrThrow(key: string): Promise<string> {
    const result = await this.get(key);

    if (!result.ok) throw result.error;

    if (result.data === undefined) {
      throw new Error(`Value Undefined | ${key}`);
    }

    return result.data;
  }

  constructor(private readonly ssm: SSM) {}
}
