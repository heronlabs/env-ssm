import {SSM} from '@aws-sdk/client-ssm';

import {ConfigService} from './services/config-service';
import {ParameterService} from './services/parameter-service';

export class AwsFactory {
  public getParameterService(): ParameterService {
    return new ParameterService(this.ssm);
  }

  public getConfigService(): ConfigService {
    return new ConfigService(this.ssm);
  }

  constructor(private readonly ssm: SSM) {}

  static make(): AwsFactory {
    const ssm = new SSM({apiVersion: '2014-11-06'});
    return new AwsFactory(ssm);
  }
}
