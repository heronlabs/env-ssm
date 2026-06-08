import {SSM} from '@aws-sdk/client-ssm';
import {DynamicModule, Module} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';

import {SsmInitService} from './services/ssm-init-service';

@Module({})
export class CoreBootstrap {
  static register(paramRoot: string): DynamicModule {
    return {
      module: CoreBootstrap,
      providers: [
        {
          provide: SSM,
          useValue: new SSM({apiVersion: '2014-11-06'}),
        },
        {
          provide: 'ParamRoot',
          useValue: paramRoot,
        },
        SsmInitService,
      ],
      exports: [SsmInitService],
      imports: [ConfigModule],
    };
  }
}
