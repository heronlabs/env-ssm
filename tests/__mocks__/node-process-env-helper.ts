// Shared across test files — safe only because vitest runs with pool: 'threads'.
// A switch to singleThread or forks would cause cross-file state corruption.
let envSnapshot: NodeJS.ProcessEnv = {};

export const snapshotEnv = (): void => {
  envSnapshot = {...process.env};
};

export const setEnv = (key: string, value: string): void => {
  process.env[key] = value;
};

export const cleanEnv = (): void => {
  const baseline = new Set(Object.keys(envSnapshot));

  for (const key of Object.keys(process.env)) {
    if (!baseline.has(key)) {
      delete process.env[key];
    }
  }

  for (const [key, value] of Object.entries(envSnapshot)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
};
