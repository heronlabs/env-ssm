const EXPECTED = {
  DATABASE_URL: 'postgres://it-user:it-pass@db.internal:5432/env_ssm_it',
  API_KEY: 'sk-env-ssm-it-0123456789',
};

const mismatches = [];
for (const [name, expected] of Object.entries(EXPECTED)) {
  const actual = process.env[name];
  if (actual !== expected) {
    mismatches.push({name, expected, actual});
  }
}

if (mismatches.length > 0) {
  for (const {name, expected, actual} of mismatches) {
    console.error(`[npx-eval] FAIL ${name}`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  actual:   ${JSON.stringify(actual)}`);
  }
  process.exit(1);
}

console.log(
  `[npx-eval] PASS exported shell vars from eval: ${Object.keys(EXPECTED).join(
    ', ',
  )}`,
);
