import {faker} from '@faker-js/faker';

import {
  escapeDotenvValue,
  escapeExportsValue,
  formatDotenv,
  formatExports,
  formatParameters,
  parseFormat,
  runCli,
} from '../../../../src/core/services/cli-service';

describe('Given the CLI service', () => {
  describe('Given a request to escape an exports value', () => {
    it('Should return plain values untouched', () => {
      const value = faker.string.alphanumeric(12);

      expect(escapeExportsValue(value)).toBe(value);
    });

    it('Should escape every backslash', () => {
      expect(escapeExportsValue('a\\b\\c')).toBe('a\\\\b\\\\c');
    });

    it('Should escape every single quote', () => {
      expect(escapeExportsValue("a'b'c")).toBe("a\\'b\\'c");
    });

    it('Should escape backslashes before single quotes', () => {
      expect(escapeExportsValue("\\'")).toBe("\\\\\\'");
    });
  });

  describe('Given a request to escape a dotenv value', () => {
    it('Should return plain values untouched', () => {
      const value = faker.string.alphanumeric(12);

      expect(escapeDotenvValue(value)).toBe(value);
    });

    it('Should escape every backslash', () => {
      expect(escapeDotenvValue('a\\b\\c')).toBe('a\\\\b\\\\c');
    });

    it('Should escape every double quote', () => {
      expect(escapeDotenvValue('a"b"c')).toBe('a\\"b\\"c');
    });

    it('Should escape every newline', () => {
      expect(escapeDotenvValue('a\nb\nc')).toBe('a\\nb\\nc');
    });

    it('Should escape backslashes before newlines', () => {
      expect(escapeDotenvValue('a\\b\nc')).toBe('a\\\\b\\nc');
    });
  });

  describe('Given a request to format parameters as exports', () => {
    it('Should emit one export line per parameter', () => {
      expect(formatExports({FIRST: 'one', SECOND: 'two'})).toBe(
        "export FIRST=$'one'\nexport SECOND=$'two'",
      );
    });

    it('Should escape values for shell eval', () => {
      expect(formatExports({KEY: "it's \\ here"})).toBe(
        "export KEY=$'it\\'s \\\\ here'",
      );
    });
  });

  describe('Given a request to format parameters as dotenv', () => {
    it('Should emit one assignment line per parameter', () => {
      expect(formatDotenv({FIRST: 'one', SECOND: 'two'})).toBe(
        'FIRST="one"\nSECOND="two"',
      );
    });

    it('Should escape values for dotenv parsing', () => {
      expect(formatDotenv({KEY: 'say "hi"\nnow \\'})).toBe(
        'KEY="say \\"hi\\"\\nnow \\\\"',
      );
    });
  });

  describe('Given a request to select the output format', () => {
    it('Should format as exports when the format is exports', () => {
      expect(formatParameters({KEY: 'value'}, 'exports')).toBe(
        "export KEY=$'value'",
      );
    });

    it('Should format as dotenv when the format is dotenv', () => {
      expect(formatParameters({KEY: 'value'}, 'dotenv')).toBe('KEY="value"');
    });
  });

  describe('Given a request to parse the CLI arguments', () => {
    it('Should default to exports when no arguments are given', () => {
      expect(parseFormat([])).toBe('exports');
    });

    it('Should return exports for --format=exports', () => {
      expect(parseFormat(['--format=exports'])).toBe('exports');
    });

    it('Should return dotenv for --format=dotenv', () => {
      expect(parseFormat(['--format=dotenv'])).toBe('dotenv');
    });

    it('Should honour the last format flag given', () => {
      expect(parseFormat(['--format=dotenv', '--format=exports'])).toBe(
        'exports',
      );
    });

    it('Should return undefined for an unknown flag', () => {
      expect(parseFormat([`--${faker.string.alpha(8)}`])).toBeUndefined();
    });

    it('Should return undefined when an unknown flag follows a valid one', () => {
      expect(parseFormat(['--format=dotenv', '--nope'])).toBeUndefined();
    });
  });

  describe('Given a request to run the CLI', () => {
    let exitCodeSnapshot: typeof process.exitCode;
    let fetchParameters: ReturnType<typeof vi.fn>;
    let stdout: ReturnType<typeof vi.fn>;
    let stderr: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      exitCodeSnapshot = process.exitCode;
      process.exitCode = undefined;

      fetchParameters = vi.fn();
      stdout = vi.fn();
      stderr = vi.fn();
    });

    afterEach(() => {
      process.exitCode = exitCodeSnapshot;
    });

    it('Should print exports output to stdout by default', async () => {
      const paramValue = faker.string.alpha();

      fetchParameters.mockResolvedValueOnce({KEY: paramValue});

      await runCli([], fetchParameters, stdout, stderr);

      expect(stdout).toHaveBeenCalledExactlyOnceWith(
        `export KEY=$'${paramValue}'`,
      );
    });

    it('Should not touch stderr nor the exit code on success', async () => {
      fetchParameters.mockResolvedValueOnce({KEY: faker.string.alpha()});

      await runCli([], fetchParameters, stdout, stderr);

      expect(stderr).not.toHaveBeenCalled();
      expect(process.exitCode).toBeUndefined();
    });

    it('Should print dotenv output when --format=dotenv is given', async () => {
      const paramValue = faker.string.alpha();

      fetchParameters.mockResolvedValueOnce({KEY: paramValue});

      await runCli(['--format=dotenv'], fetchParameters, stdout, stderr);

      expect(stdout).toHaveBeenCalledExactlyOnceWith(`KEY="${paramValue}"`);
    });

    it('Should print the usage message to stderr for an unknown flag', async () => {
      await runCli(['--nope'], fetchParameters, stdout, stderr);

      expect(stderr).toHaveBeenCalledExactlyOnceWith(
        'Usage: env-ssm [--format=exports|--format=dotenv]',
      );
      expect(process.exitCode).toBe(1);
    });

    it('Should not fetch nor print to stdout for an unknown flag', async () => {
      await runCli(['--nope'], fetchParameters, stdout, stderr);

      expect(fetchParameters).not.toHaveBeenCalled();
      expect(stdout).not.toHaveBeenCalled();
    });

    it('Should print the error message to stderr when fetching fails', async () => {
      const message = faker.string.alpha(16);

      fetchParameters.mockRejectedValueOnce(new Error(message));

      await runCli([], fetchParameters, stdout, stderr);

      expect(stderr).toHaveBeenCalledExactlyOnceWith(message);
      expect(stdout).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it('Should stringify non-Error failures to stderr', async () => {
      const reason = faker.string.alpha(16);

      fetchParameters.mockRejectedValueOnce(reason);

      await runCli([], fetchParameters, stdout, stderr);

      expect(stderr).toHaveBeenCalledExactlyOnceWith(reason);
      expect(process.exitCode).toBe(1);
    });
  });
});
