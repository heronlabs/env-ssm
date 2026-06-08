import {NestFactory} from '@nestjs/core';

import {SsmConfigService} from './core/services/ssm-config-service';
import {SsmInitService} from './core/services/ssm-init-service';
import {SsmConfigModule} from './core/ssm-config-module';
import {SsmInitModule} from './core/ssm-init-module';

export {SsmConfigModule, SsmConfigService, SsmInitService};

export class ParameterFactory {
  static async make(paramRoot: string): Promise<SsmInitService> {
    const app = await NestFactory.createApplicationContext(
      SsmInitModule.register(paramRoot),
      {logger: false},
    );

    return app.get(SsmInitService);
  }
}
