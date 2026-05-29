// Architecture rules for env-ssm (dependency-cruiser).
//
// Layout (NestJS library):
//   src/core/        — domain: SsmService, errors, the DynamicModule bootstrap
//   src/main.ts      — public entry: ParameterFactory (composition root)
//
// Invariants:
//   1. No circular dependencies anywhere under src/.
//   2. No orphan modules (dead-code candidates), except the public entry.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Circular dependencies make code unpredictable and hard to test.',
      from: {},
      to: {circular: true},
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'Orphan modules are dead-code candidates.',
      from: {
        orphan: true,
        pathNot: ['\\.d\\.ts$', '(^|/)main\\.ts$'],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: {path: 'node_modules'},
    tsPreCompilationDeps: true,
    tsConfig: {fileName: 'tsconfig.json'},
    reporterOptions: {
      dot: {collapsePattern: 'node_modules/[^/]+'},
    },
  },
};
