import {ParameterService} from '../../../infrastructure/aws/services/parameter-service';
import {LineEnvService} from './line-env-service';

export class DockerEnvService extends LineEnvService {
  protected evalLine(identifier: string, value: string): string {
    return `${identifier}=${value}`;
  }

  protected validateValue(name: string, value: string): Error | undefined {
    if (value.includes('\n')) {
      return new Error(`Value Multiline | ${name}`);
    }

    return undefined;
  }

  constructor(parameterService: ParameterService) {
    super(parameterService);
  }
}
