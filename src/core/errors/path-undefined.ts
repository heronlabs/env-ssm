export class PathUndefined extends Error {
  private constructor(path: string) {
    super(`'Path Undefined' | ${path}`);
  }

  public static make(path: string): Error {
    return new PathUndefined(path);
  }
}
