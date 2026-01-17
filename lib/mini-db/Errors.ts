export class TableNotFoundError extends Error {
  constructor(table: string) {
    super(`Table not found: ${table}`);
    this.name = 'TableNotFoundError';
  }
}

export class DuplicateKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateKeyError';
  }
}

export class InvalidQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidQueryError';
  }
}
