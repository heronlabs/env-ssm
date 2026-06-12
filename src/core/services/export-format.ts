export const escapeExportsValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

export const sanitizeName = (name: string): string =>
  name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, '_$1');

export const formatExports = (parameters: Record<string, string>): string =>
  Object.entries(parameters)
    .map(
      ([name, value]) =>
        `export ${sanitizeName(name)}=$'${escapeExportsValue(value)}'`,
    )
    .join('\n');
