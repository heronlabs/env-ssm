import {ParameterService} from './parameter-service';

export class BashService {
  private escapeValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n');
  }

  private sanitizeName(name: string): string {
    return name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, '_$1');
  }

  async eval(): Promise<string> {
    const parameters = await this.parameterService.fetchParameters();

    const seen = new Map<string, string>();

    return Object.entries(parameters)
      .map(([name, value]) => {
        const identifier = this.sanitizeName(name);

        const collision = seen.get(identifier);

        if (collision) {
          throw new Error(
            `Name Collision | ${collision}, ${name} -> ${identifier}`,
          );
        }

        seen.set(identifier, name);

        return `export ${identifier}=$'${this.escapeValue(value)}'`;
      })
      .join('\n');
  }

  constructor(private readonly parameterService: ParameterService) {}
}
