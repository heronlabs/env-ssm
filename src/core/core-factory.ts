import {AwsFactory} from '../infrastructure/aws/aws-factory';
import {BashEnvService} from './services/eval/bash-env-service';
import {DotEnvService} from './services/eval/dot-env-service';
import {ProcessEnvService} from './services/process-env-service';

export class CoreFactory {
  public getProcessEnvService(): ProcessEnvService {
    return new ProcessEnvService(this.awsFactory.getParameterService());
  }
  public getBashEnvService(): BashEnvService {
    return new BashEnvService(this.awsFactory.getParameterService());
  }
  public getDotEnvService(): DotEnvService {
    return new DotEnvService(this.awsFactory.getParameterService());
  }

  constructor(private readonly awsFactory: AwsFactory) {}

  static make(): CoreFactory {
    const awsFactory = AwsFactory.make();
    return new CoreFactory(awsFactory);
  }
}
