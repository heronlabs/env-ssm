import {SSM} from '@aws-sdk/client-ssm';

import {SsmConfigService} from './core/services/ssm-config-service';
import {SsmInitService} from './core/services/ssm-init-service';

export {SsmConfigService, SsmInitService};
export {PathUndefined} from './core/errors/path-undefined';
export {ValueUndefined} from './core/errors/value-undefined';

export class ParameterFactory {
  static async make(paramRoot: string): Promise<SsmInitService> {
    return new SsmInitService(new SSM({apiVersion: '2014-11-06'}), paramRoot);
  }
}

export class SsmConfigFactory {
  static make(): SsmConfigService {
    return new SsmConfigService(new SSM({apiVersion: '2014-11-06'}));
  }
}
