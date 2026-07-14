import {ProcessEnvService} from '../../../core/services/process-env-service';

export class ProcessEnvCommand {
  async executeOrThrow(pathEnvVar: string): Promise<void> {
    const result = await this.processEnvService.load(pathEnvVar);

    if (!result.ok) throw result.error;
  }

  constructor(private readonly processEnvService: ProcessEnvService) {}
}
