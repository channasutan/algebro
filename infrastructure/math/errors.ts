export type MathAdapterErrorOptions = {
  cause?: unknown;
};

export class MathParseError extends Error {
  declare readonly cause: unknown;

  constructor(message: string, options?: MathAdapterErrorOptions) {
    super(message, options);
    this.name = "MathParseError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MathEquivalenceError extends Error {
  declare readonly cause: unknown;

  constructor(message: string, options?: MathAdapterErrorOptions) {
    super(message, options);
    this.name = "MathEquivalenceError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
