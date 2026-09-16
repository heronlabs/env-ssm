import {Eval} from '../../../core/interfaces/eval';

export class DockerEnvCommand {
  async executeOrThrow(pathEnvVar: string): Promise<string> {
    const result = await this.dockerEnvService.evalAll(pathEnvVar);

    if (!result.ok) throw result.error;

    return result.data;
  }

  constructor(private readonly dockerEnvService: Eval) {}
}
