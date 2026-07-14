#!/usr/bin/env node

import {CliFactory} from './main';

void (async () => {
  const formatFlag = process.argv.find(arg => arg.startsWith('--format='));
  const format = formatFlag ? formatFlag.slice('--format='.length) : 'bash';

  if (format === 'dotenv') {
    process.stdout.write(
      `${await CliFactory.make().getDotEnvCommand().executeOrThrow('AWS_ENV_PATH')}\n`,
    );
    return;
  }

  if (format === 'bash') {
    process.stdout.write(
      `${await CliFactory.make().getBashEnvCommand().executeOrThrow('AWS_ENV_PATH')}\n`,
    );
    return;
  }

  throw new Error(`Unknown Format | ${format}`);
})();
