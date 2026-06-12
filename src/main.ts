import {SSM} from '@aws-sdk/client-ssm';

import {ConfigService} from './core/services/config-service';
import {BashService} from './core/services/init/bash-service';
import {EnvService} from './core/services/init/env-service';
import {ParameterService} from './core/services/init/parameter-service';

export {BashService, ConfigService, EnvService, ParameterService};

export class SsmInitFactory {
  static env(paramRoot: string): EnvService {
    return new EnvService(
      new ParameterService(new SSM({apiVersion: '2014-11-06'}), paramRoot),
    );
  }

  static bash(paramRoot: string): BashService {
    return new BashService(
      new ParameterService(new SSM({apiVersion: '2014-11-06'}), paramRoot),
    );
  }
}

export class SsmConfigFactory {
  static make(): ConfigService {
    return new ConfigService(new SSM({apiVersion: '2014-11-06'}));
  }
}
