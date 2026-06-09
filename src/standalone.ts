import {
  GetParametersByPathCommandOutput,
  Parameter,
  SSM,
} from '@aws-sdk/client-ssm';

import {PathUndefined} from './core/errors/value-undefined';

/**
 * Load every SSM parameter under the path named by `pathEnvVar` into process.env.
 * NestJS-free counterpart of SsmInitService.evalParameters(). Each parameter's
 * leaf name (after the last '/') becomes the env var; decrypted values are used.
 */
export async function loadSsmParameters(
  pathEnvVar = 'AWS_ENV_PATH',
): Promise<void> {
  const path = process.env[pathEnvVar];

  if (!path) {
    throw PathUndefined.make(pathEnvVar);
  }

  const ssm = new SSM({apiVersion: '2014-11-06'});

  const parameters: Parameter[] = [];

  let nextToken: string | undefined = undefined;

  do {
    const result: GetParametersByPathCommandOutput =
      await ssm.getParametersByPath({
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

    const parameterName = Name?.split('/').pop();

    if (parameterName && Value) {
      process.env[parameterName] = Value;
    }
  });
}
