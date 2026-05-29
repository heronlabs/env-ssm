import {NestFactory} from '@nestjs/core';

import {CoreBootstrap} from './core/core-bootstrap';
import {SsmService} from './core/services/ssm-service';

export class ParameterFactory {
  static async make(paramRoot: string): Promise<SsmService> {
    const app = await NestFactory.createApplicationContext(
      CoreBootstrap.register(paramRoot),
      {logger: false},
    );

    return app.get(SsmService);
  }
}
