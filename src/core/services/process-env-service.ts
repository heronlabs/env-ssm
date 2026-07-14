import {ParameterService} from '../../infrastructure/aws/services/parameter-service';

export class ProcessEnvService {
  async load(pathEnvVar: string) {
    try {
      const {ok, data, error} =
        await this.parameterService.fetchAllParameters(pathEnvVar);

      if (!ok) return {ok: false as const, error};

      Object.entries(data).forEach(([name, value]) => {
        process.env[name] = value;
      });

      return {ok: true as const};
    } catch (error) {
      return {ok: false as const, error};
    }
  }

  constructor(private readonly parameterService: ParameterService) {}
}
