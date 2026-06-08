import {NestFactory} from '@nestjs/core';

import {CoreBootstrap} from './core/core-bootstrap';
import {CoreModule} from './core/core-module';
import {SsmConfigService} from './core/services/ssm-config-service';
import {SsmInitService} from './core/services/ssm-init-service';

export {CoreModule, SsmConfigService, SsmInitService};

export class ParameterFactory {
  static async make(paramRoot: string): Promise<SsmInitService> {
    const app = await NestFactory.createApplicationContext(
      CoreBootstrap.register(paramRoot),
      {logger: false},
    );

    return app.get(SsmInitService);
  }
}
