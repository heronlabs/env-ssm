export interface Eval {
  evalAll(pathEnvVar: string): Promise<
    | {
        ok: true;
        data: string;
        error?: undefined;
      }
    | {
        ok: false;
        error: unknown;
        data?: undefined;
      }
  >;
}
