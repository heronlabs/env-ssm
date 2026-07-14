import {Eval} from '../../../core/interfaces/eval';

export class BashEnvCommand {
  async executeOrThrow(pathEnvVar: string): Promise<string> {
    const result = await this.bashEnvService.evalAll(pathEnvVar);

    if (!result.ok) throw result.error;

    return result.data;
  }

  constructor(private readonly bashEnvService: Eval) {}
}
