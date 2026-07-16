import {ParameterService} from '../../../infrastructure/aws/services/parameter-service';
import {LineEnvService} from './line-env-service';

export class DotEnvService extends LineEnvService {
  protected evalLine(identifier: string, value: string): string {
    const escapedValue = value.replace(/'/g, "'\\''");

    return `${identifier}='${escapedValue}'`;
  }

  constructor(parameterService: ParameterService) {
    super(parameterService);
  }
}
