import {ParameterService} from '../../../infrastructure/aws/services/parameter-service';
import {Eval} from '../../interfaces/eval';

export abstract class LineEnvService implements Eval {
  protected abstract evalLine(identifier: string, value: string): string;

  async evalAll(pathEnvVar: string) {
    try {
      const {ok, data, error} =
        await this.parameterService.fetchAllParameters(pathEnvVar);

      if (!ok) return {ok: false as const, error};

      const seen = new Map<string, string>();

      const lines: string[] = [];

      for (const [name, value] of Object.entries(data)) {
        const identifier = name
          .replace(/[^A-Za-z0-9_]/g, '_')
          .replace(/^([0-9])/, '_$1');

        const collision = seen.get(identifier);

        if (collision) {
          return {
            ok: false as const,
            error: new Error(
              `Name Collision | ${collision}, ${name} -> ${identifier}`,
            ),
          };
        }

        seen.set(identifier, name);

        lines.push(this.evalLine(identifier, value));
      }

      return {ok: true as const, data: lines.join('\n')};
    } catch (error) {
      return {ok: false as const, error};
    }
  }

  constructor(private readonly parameterService: ParameterService) {}
}
