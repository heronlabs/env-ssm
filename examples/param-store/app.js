const {SsmConfigFactory} = require('../../bin/src/main.js');

const EXPECTED = 'single-secret-value-env-ssm-it';

async function main() {
  const actual = await SsmConfigFactory.make().getOrThrow('SINGLE_SECRET');

  if (actual !== EXPECTED) {
    console.error('[param-store] FAIL SINGLE_SECRET');
    console.error(`  expected: ${JSON.stringify(EXPECTED)}`);
    console.error(`  actual:   ${JSON.stringify(actual)}`);
    process.exit(1);
  }

  console.log(
    `[param-store] PASS resolved SINGLE_SECRET by ARN: ${process.env.SINGLE_SECRET}`,
  );
}

main().catch(error => {
  console.error(`[param-store] FAIL ${error.message}`);
  process.exit(1);
});
