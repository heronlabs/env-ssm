import {faker} from '@faker-js/faker';

import {DotenvService} from '../../../../../src/core/services/init/dotenv-service';
import {createMockParameterService} from '../../../../__mocks__/test-helpers';

describe('Given a dotenv service', () => {
  describe('Given a request to evaluate parameters as dotenv lines', () => {
    it('Should return a single dotenv assignment', async () => {
      const name = `API_${faker.string.alpha(10)}`;
      const value = faker.string.alpha();

      const service = new DotenvService(
        createMockParameterService({[name]: value}),
      );

      const result = await service.eval();

      expect(result).toBe(`${name}='${value}'`);
    });

    it('Should join multiple assignments with newlines', async () => {
      const service = new DotenvService(
        createMockParameterService({A: '1', B: '2'}),
      );

      const result = await service.eval();

      expect(result).toBe("A='1'\nB='2'");
    });

    it('Should escape a single quote in the value', async () => {
      const service = new DotenvService(
        createMockParameterService({NAME: "it's"}),
      );

      const result = await service.eval();

      expect(result).toBe("NAME='it'\\''s'");
    });

    it('Should escape every single quote in a value with two of them', async () => {
      const service = new DotenvService(
        createMockParameterService({NAME: "a'b'c"}),
      );

      const result = await service.eval();

      expect(result).toBe("NAME='a'\\''b'\\''c'");
    });

    it('Should leave a backslash in the value literal', async () => {
      const service = new DotenvService(
        createMockParameterService({NAME: 'a\\b'}),
      );

      const result = await service.eval();

      expect(result).toBe("NAME='a\\b'");
    });

    it('Should leave a newline in the value literal', async () => {
      const service = new DotenvService(
        createMockParameterService({NAME: 'a\nb'}),
      );

      const result = await service.eval();

      expect(result).toBe("NAME='a\nb'");
    });

    it('Should sanitize characters outside the identifier set in the name', async () => {
      const value = faker.string.alpha();

      const service = new DotenvService(
        createMockParameterService({'foo.bar': value}),
      );

      const result = await service.eval();

      expect(result).toBe(`foo_bar='${value}'`);
    });

    it('Should prefix a leading digit in the name with an underscore', async () => {
      const value = faker.string.alpha();

      const service = new DotenvService(
        createMockParameterService({'9lives': value}),
      );

      const result = await service.eval();

      expect(result).toBe(`_9lives='${value}'`);
    });

    it('Should leave a non-leading digit in the name untouched', async () => {
      const value = faker.string.alpha();

      const service = new DotenvService(
        createMockParameterService({foo9bar: value}),
      );

      const result = await service.eval();

      expect(result).toBe(`foo9bar='${value}'`);
    });

    it('Should leave an already-valid name unchanged', async () => {
      const value = faker.string.alpha();

      const service = new DotenvService(
        createMockParameterService({FOO_BAR: value}),
      );

      const result = await service.eval();

      expect(result).toBe(`FOO_BAR='${value}'`);
    });

    it('Should throw naming both parameters when names collide after sanitizing', async () => {
      const service = new DotenvService(
        createMockParameterService({
          'foo.bar': faker.string.alpha(),
          'foo-bar': faker.string.alpha(),
        }),
      );

      await expect(() => service.eval()).rejects.toThrow(
        Error('Name Collision | foo.bar, foo-bar -> foo_bar'),
      );
    });
  });
});
