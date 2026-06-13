import {ParameterService} from './parameter-service';

export class EnvService {
  async eval(): Promise<void> {
    const parameters = await this.parameterService.fetchParameters();

    Object.entries(parameters).forEach(([name, value]) => {
      process.env[name] = value;
    });
  }

  constructor(private readonly parameterService: ParameterService) {}
}
