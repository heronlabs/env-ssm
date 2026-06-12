#!/usr/bin/env node
import {formatExports} from './core/services/export-format';
import {ParameterFactory} from './main';

void (async () => {
  const factory = await ParameterFactory.make('AWS_ENV_PATH');
  const parameters = await factory.fetchParameters();
  process.stdout.write(`${formatExports(parameters)}\n`);
})();
