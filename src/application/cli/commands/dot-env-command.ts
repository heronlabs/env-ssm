import {Eval} from '../../../core/interfaces/eval';

export class DotEnvCommand {
  async executeOrThrow(pathEnvVar: string): Promise<string> {
    const result = await this.dotEnvService.evalAll(pathEnvVar);

    if (!result.ok) throw result.error;

    return result.data;
  }

  constructor(private readonly dotEnvService: Eval) {}
}
