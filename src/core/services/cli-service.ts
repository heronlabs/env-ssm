export type CliFormat = 'dotenv' | 'exports';

const USAGE = 'Usage: env-ssm [--format=exports|--format=dotenv]';

export const escapeExportsValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

export const escapeDotenvValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

export const formatExports = (parameters: Record<string, string>): string =>
  Object.entries(parameters)
    .map(([name, value]) => `export ${name}=$'${escapeExportsValue(value)}'`)
    .join('\n');

export const formatDotenv = (parameters: Record<string, string>): string =>
  Object.entries(parameters)
    .map(([name, value]) => `${name}="${escapeDotenvValue(value)}"`)
    .join('\n');

export const formatParameters = (
  parameters: Record<string, string>,
  format: CliFormat,
): string =>
  format === 'dotenv' ? formatDotenv(parameters) : formatExports(parameters);

export const parseFormat = (args: string[]): CliFormat | undefined => {
  let format: CliFormat = 'exports';

  for (const arg of args) {
    if (arg === '--format=exports') {
      format = 'exports';
    } else if (arg === '--format=dotenv') {
      format = 'dotenv';
    } else {
      return undefined;
    }
  }

  return format;
};

export const runCli = async (
  args: string[],
  fetchParameters: () => Promise<Record<string, string>>,
  stdout: (text: string) => void,
  stderr: (text: string) => void,
): Promise<void> => {
  const format = parseFormat(args);

  if (!format) {
    stderr(USAGE);
    process.exitCode = 1;

    return;
  }

  try {
    stdout(formatParameters(await fetchParameters(), format));
  } catch (error) {
    stderr(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
};
