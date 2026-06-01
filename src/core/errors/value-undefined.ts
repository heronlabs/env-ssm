export class PathUndefined extends Error {
  private constructor(path: string) {
    super(`'Path Undefined' | ${path}`);
  }

  public static make(path: string): Error {
    return new PathUndefined(path);
  }
}

export class ValueUndefined extends Error {
  private constructor(key: string) {
    super(`'Value Undefined' | ${key}`);
  }

  public static make(key: string): Error {
    return new ValueUndefined(key);
  }
}
