import {GetParametersByPathCommandOutput, SSM} from '@aws-sdk/client-ssm';

export class ParameterService {
  async fetchParameters(): Promise<Record<string, string>> {
    const path = process.env[this.paramRoot];

    if (!path) {
      throw new Error(`Value Undefined | ${this.paramRoot}`);
    }

    const resolved: Record<string, string> = {};

    let nextToken: string | undefined = undefined;

    do {
      const result: GetParametersByPathCommandOutput =
        await this.ssm.getParametersByPath({
          Path: path,
          WithDecryption: true,
          NextToken: nextToken,
        });

      result.Parameters?.forEach(parameter => {
        const {Name, Value} = parameter;

        const names = Name ? Name.split('/') : [];

        const parameterName = names.pop();

        if (parameterName && Value) {
          resolved[parameterName] = Value;
        }
      });

      nextToken = result.NextToken;
    } while (nextToken);

    return resolved;
  }

  constructor(
    private readonly ssm: SSM,
    private readonly paramRoot: string,
  ) {}
}
