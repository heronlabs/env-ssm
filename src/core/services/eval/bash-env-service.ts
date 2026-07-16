import {ParameterService} from '../../../infrastructure/aws/services/parameter-service';
import {LineEnvService} from './line-env-service';

export class BashEnvService extends LineEnvService {
  protected evalLine(identifier: string, value: string): string {
    const escapedValue = value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');

    return `export ${identifier}=$'${escapedValue}'`;
  }

  constructor(parameterService: ParameterService) {
    super(parameterService);
  }
}
