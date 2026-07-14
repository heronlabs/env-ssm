import {faker} from '@faker-js/faker';

import {BashService} from '../../../../../src/core/services/init/bash-service';
import {createMockParameterService} from '../../../../__mocks__/test-helpers';

describe('Given a bash service', () => {
  describe('Given a request to evaluate parameters as bash exports', () => {
    it('Should return a single export statement', async () => {
      const name = `API_${faker.string.alpha(10)}`;
      const value = faker.string.alpha();

      const service = new BashService(
        createMockParameterService({[name]: value}),
      );

      const result = await service.eval();

      expect(result).toBe(`export ${name}=$'${value}'`);
    });

    it('Should join multiple exports with newlines', async () => {
      const service = new BashService(
        createMockParameterService({A: '1', B: '2'}),
      );

      const result = await service.eval();

      expect(result).toBe("export A=$'1'\nexport B=$'2'");
    });

    it('Should escape backslashes in the value', async () => {
      const service = new BashService(
        createMockParameterService({NAME: 'a\\b'}),
      );

      const result = await service.eval();

      expect(result).toBe("export NAME=$'a\\\\b'");
    });

    it('Should escape single quotes in the value', async () => {
      const service = new BashService(
        createMockParameterService({NAME: "it's"}),
      );

      const result = await service.eval();

      expect(result).toBe("export NAME=$'it\\'s'");
    });

    it('Should escape newlines in the value', async () => {
      const service = new BashService(
        createMockParameterService({NAME: 'a\nb'}),
      );

      const result = await service.eval();

      expect(result).toBe("export NAME=$'a\\nb'");
    });

    it('Should escape a backslash before a single quote in order', async () => {
      const service = new BashService(
        createMockParameterService({NAME: "\\'"}),
      );

      const result = await service.eval();

      expect(result).toBe("export NAME=$'\\\\\\''");
    });

    it('Should sanitize characters outside the identifier set in the name', async () => {
      const value = faker.string.alpha();

      const service = new BashService(
        createMockParameterService({'foo.bar': value}),
      );

      const result = await service.eval();

      expect(result).toBe(`export foo_bar=$'${value}'`);
    });

    it('Should prefix a leading digit in the name with an underscore', async () => {
      const value = faker.string.alpha();

      const service = new BashService(
        createMockParameterService({'9lives': value}),
      );

      const result = await service.eval();

      expect(result).toBe(`export _9lives=$'${value}'`);
    });

    it('Should leave a non-leading digit in the name untouched', async () => {
      const value = faker.string.alpha();

      const service = new BashService(
        createMockParameterService({foo9bar: value}),
      );

      const result = await service.eval();

      expect(result).toBe(`export foo9bar=$'${value}'`);
    });

    it('Should leave an already-valid name unchanged', async () => {
      const value = faker.string.alpha();

      const service = new BashService(
        createMockParameterService({FOO_BAR: value}),
      );

      const result = await service.eval();

      expect(result).toBe(`export FOO_BAR=$'${value}'`);
    });

    it('Should throw naming both parameters when names collide after sanitizing', async () => {
      const service = new BashService(
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
