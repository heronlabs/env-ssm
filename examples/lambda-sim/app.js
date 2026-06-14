const {SsmInitFactory} = require('../../bin/src/main.js');

const EXPECTED = {
  DATABASE_URL: 'postgres://it-user:it-pass@db.internal:5432/env_ssm_it',
  API_KEY: 'sk-env-ssm-it-0123456789',
};

async function main() {
  await SsmInitFactory.env('AWS_ENV_PATH').eval();

  const mismatches = [];
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const actual = process.env[name];
    if (actual !== expected) {
      mismatches.push({name, expected, actual});
    }
  }

  if (mismatches.length > 0) {
    for (const {name, expected, actual} of mismatches) {
      console.error(`[lambda-sim] FAIL ${name}`);
      console.error(`  expected: ${JSON.stringify(expected)}`);
      console.error(`  actual:   ${JSON.stringify(actual)}`);
    }
    process.exit(1);
  }

  console.log(
    `[lambda-sim] PASS hydrated process.env from ${process.env.AWS_ENV_PATH}: ${Object.keys(
      EXPECTED,
    ).join(', ')}`,
  );
}

main().catch(error => {
  console.error(`[lambda-sim] FAIL ${error.message}`);
  process.exit(1);
});
