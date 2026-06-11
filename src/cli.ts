#!/usr/bin/env node
import {runCli} from './core/services/cli-service';
import {ParameterFactory} from './main';

void runCli(
  process.argv.slice(2),
  async () => (await ParameterFactory.make('AWS_ENV_PATH')).fetchParameters(),
  text => process.stdout.write(`${text}\n`),
  text => process.stderr.write(`${text}\n`),
);
