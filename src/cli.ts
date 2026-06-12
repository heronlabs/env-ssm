#!/usr/bin/env node
import {ParameterFactory} from './main';

void (async () => {
  const factory = await ParameterFactory.make('AWS_ENV_PATH');
  await factory.evalParameters();
})();
