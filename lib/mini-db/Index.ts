import { DuplicateKeyError } from './Errors';

export class Index {
  private map: Map<any, Set<number>> = new Map();

  constructor(private readonly column: string, private readonly unique: boolean) {}

  insert(value: any, rowId: number): void {
    const bucket = this.map.get(value) ?? new Set<number>();
    if (this.unique && bucket.size > 0) {
      throw new DuplicateKeyError(`Duplicate value for unique column '${this.column}': ${value}`);
    }
    bucket.add(rowId);
    this.map.set(value, bucket);
  }

  remove(value: any, rowId: number): void {
    const bucket = this.map.get(value);
    if (!bucket) return;
    bucket.delete(rowId);
    if (bucket.size === 0) {
      this.map.delete(value);
    }
  }

  update(oldValue: any, newValue: any, rowId: number): void {
    if (oldValue === newValue) return;
    this.remove(oldValue, rowId);
    this.insert(newValue, rowId);
  }

  lookup(value: any): Set<number> {
    return new Set(this.map.get(value) ?? []);
  }
}
