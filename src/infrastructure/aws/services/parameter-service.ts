import {GetParametersByPathCommandOutput, SSM} from '@aws-sdk/client-ssm';

export class ParameterService {
  async fetchAllParameters(pathEnvVar: string) {
    try {
      const path = process.env[pathEnvVar];

      if (!path) {
        return {
          ok: false as const,
          error: new Error(`Value Undefined | ${pathEnvVar}`),
        };
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

      return {ok: true as const, data: resolved};
    } catch (error) {
      return {
        ok: false as const,
        error,
      };
    }
  }

  constructor(private readonly ssm: SSM) {}
}
