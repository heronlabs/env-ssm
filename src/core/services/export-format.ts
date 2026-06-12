export const escapeExportsValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

export const formatExports = (parameters: Record<string, string>): string =>
  Object.entries(parameters)
    .map(([name, value]) => `export ${name}=$'${escapeExportsValue(value)}'`)
    .join('\n');
