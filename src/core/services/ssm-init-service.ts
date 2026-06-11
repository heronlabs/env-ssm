import {
  GetParametersByPathCommandOutput,
  Parameter,
  SSM,
} from '@aws-sdk/client-ssm';

import {PathUndefined} from '../errors/path-undefined';
import {ValueUndefined} from '../errors/value-undefined';

export class SsmInitService {
  async evalParameters(): Promise<void> {
    const parameters = await this.fetchParameters();

    Object.entries(parameters).forEach(([name, value]) => {
      process.env[name] = value;
    });
  }

  async fetchParameters(): Promise<Record<string, string>> {
    const path = process.env[this.paramRoot];

    if (!path) {
      throw ValueUndefined.make(this.paramRoot);
    }

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

    const values: Record<string, string> = {};

    parameters.forEach(parameter => {
      const {Name, Value} = parameter;

      const names = Name ? Name.split('/') : [];

      const parameterName = names.pop();

      if (parameterName && Value) {
        values[parameterName] = Value;
      }
    });

    return values;
  }

  constructor(
    private readonly parameter: SSM,
    private readonly paramRoot: string,
  ) {}
}
