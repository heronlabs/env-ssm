import {faker} from '@faker-js/faker';

import {
  escapeExportsValue,
  formatExports,
} from '../../../../src/core/services/export-format';

describe('Given the exports formatter', () => {
  describe('Given a request to escape an exports value', () => {
    it('Should return a plain value unchanged', () => {
      const value = faker.string.alpha();

      expect(escapeExportsValue(value)).toBe(value);
    });

    it('Should escape a backslash by doubling it', () => {
      expect(escapeExportsValue('a\\b')).toBe('a\\\\b');
    });

    it('Should escape a single quote with a backslash', () => {
      expect(escapeExportsValue("a'b")).toBe("a\\'b");
    });

    it('Should escape a newline as a literal backslash-n', () => {
      expect(escapeExportsValue('a\nb')).toBe('a\\nb');
    });

    it('Should escape backslashes before quotes and newlines', () => {
      expect(escapeExportsValue("\\'\n")).toBe("\\\\\\'\\n");
    });

    it('Should escape every occurrence in the value', () => {
      expect(escapeExportsValue("\\\\''\n\n")).toBe("\\\\\\\\\\'\\'\\n\\n");
    });
  });

  describe('Given a request to format parameters as exports', () => {
    it('Should return an empty string for an empty object', () => {
      expect(formatExports({})).toBe('');
    });

    it('Should format a single entry as an ANSI-C quoted export', () => {
      const name = faker.string.alpha();
      const value = faker.string.alpha();

      expect(formatExports({[name]: value})).toBe(`export ${name}=$'${value}'`);
    });

    it('Should escape the value when formatting an entry', () => {
      const name = faker.string.alpha();

      expect(formatExports({[name]: "a'b"})).toBe(`export ${name}=$'a\\'b'`);
    });

    it('Should join multiple entries with a newline', () => {
      const firstName = faker.string.alpha();
      const firstValue = faker.string.alpha();
      const secondName = faker.string.alpha();
      const secondValue = faker.string.alpha();

      expect(
        formatExports({
          [firstName]: firstValue,
          [secondName]: secondValue,
        }),
      ).toBe(
        `export ${firstName}=$'${firstValue}'\nexport ${secondName}=$'${secondValue}'`,
      );
    });
  });
});
