import {SSM} from '@aws-sdk/client-ssm';
import {Module, ModuleMetadata} from '@nestjs/common';
import {ConfigModule} from '@nestjs/config';

import {SsmConfigService} from './services/ssm-config-service';

export const ssmConfigModule: ModuleMetadata = {
  imports: [ConfigModule],
  providers: [
    {provide: SSM, useValue: new SSM({apiVersion: '2014-11-06'})},
    SsmConfigService,
  ],
  exports: [SsmConfigService],
};

@Module(ssmConfigModule)
export class SsmConfigModule {}
