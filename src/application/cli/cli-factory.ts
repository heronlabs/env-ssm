import {CoreFactory} from '../../core/core-factory';
import {BashEnvCommand} from './commands/bash-env-command';
import {DotEnvCommand} from './commands/dot-env-command';
import {ProcessEnvCommand} from './commands/process-env-command';

export class CliFactory {
  public getProcessEnvCommand(): ProcessEnvCommand {
    return new ProcessEnvCommand(this.coreFactory.getProcessEnvService());
  }

  public getBashEnvCommand(): BashEnvCommand {
    return new BashEnvCommand(this.coreFactory.getBashEnvService());
  }

  public getDotEnvCommand(): DotEnvCommand {
    return new DotEnvCommand(this.coreFactory.getDotEnvService());
  }

  constructor(private readonly coreFactory: CoreFactory) {}

  static make(): CliFactory {
    const coreBootstrap = CoreFactory.make();
    return new CliFactory(coreBootstrap);
  }
}
