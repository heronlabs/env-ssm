#!/usr/bin/env node
import {SsmInitFactory} from './main';

void (async () => {
  const formatFlag = process.argv.find(arg => arg.startsWith('--format='));
  const format = formatFlag ? formatFlag.slice('--format='.length) : 'bash';

  if (format === 'dotenv') {
    process.stdout.write(
      `${await SsmInitFactory.dotenv('AWS_ENV_PATH').eval()}\n`,
    );
    return;
  }

  if (format === 'bash') {
    process.stdout.write(
      `${await SsmInitFactory.bash('AWS_ENV_PATH').eval()}\n`,
    );
    return;
  }

  throw new Error(`Unknown Format | ${format}`);
})();
