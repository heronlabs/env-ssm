import {SSM} from '@aws-sdk/client-ssm';
import {Injectable, Module} from '@nestjs/common';
import {Test} from '@nestjs/testing';

import {CoreModule} from '../../../src/core/core-module';
import {SsmConfigService} from '../../../src/core/services/ssm-config-service';

@Injectable()
class Consumer {
  constructor(readonly config: SsmConfigService) {}
}

@Module({imports: [CoreModule], providers: [Consumer]})
class ConsumerModule {}

describe('Given the CoreModule', () => {
  it('Should provide a resolvable SsmConfigService', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();

    expect(moduleRef.get(SsmConfigService)).toBeInstanceOf(SsmConfigService);
  });

  it('Should construct the SSM client with the 2014-11-06 api version', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();

    const ssm = moduleRef.get(SSM);

    expect(ssm.config.apiVersion).toBe('2014-11-06');
  });

  it('Should export SsmConfigService to importing modules', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConsumerModule],
    }).compile();

    expect(moduleRef.get(Consumer).config).toBeInstanceOf(SsmConfigService);
  });
});
