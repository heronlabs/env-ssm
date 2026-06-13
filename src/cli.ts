#!/usr/bin/env node
import {SsmInitFactory} from './main';

void (async () => {
  process.stdout.write(`${await SsmInitFactory.bash('AWS_ENV_PATH').eval()}\n`);
})();
