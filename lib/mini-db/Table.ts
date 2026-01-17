import { Column } from './Column';
import { DuplicateKeyError, InvalidQueryError } from './Errors';
import { Index } from './Index';

export interface WhereClause {
  column: string;
  value: any;
}

type Row = { _id: number; [key: string]: any };

export class Table {
  readonly name: string;
  readonly columns: Column[];
  private readonly indexes: Map<string, Index> = new Map();
  private readonly rows: Map<number, Row> = new Map();
  private nextRowId = 1;

  constructor(name: string, columns: Column[], seedRows: Record<string, any>[] = []) {
    this.name = name;
    this.columns = columns;
    this.buildIndexes();
    seedRows.forEach((row) => this.loadRow(row));
  }

  insert(rowData: Record<string, any>): Record<string, any> {
    const rowId = this.nextRowId++;
    const row = this.prepareRow(rowData, rowId);
    this.applyIndexesForInsert(row);
    this.rows.set(row._id, row);
    return this.stripInternal(row);
  }

  select(where?: WhereClause): Record<string, any>[] {
    const rowIds = this.findRowIds(where);
    return this.rowsFromIds(rowIds).map((row) => this.stripInternal(row));
  }

  update(where: WhereClause | undefined, updates: Record<string, any>): number {
    const rowIds = this.findRowIds(where);
    let count = 0;
    for (const rowId of rowIds) {
      const row = this.rows.get(rowId);
      if (!row) continue;
      this.applyUpdates(row, updates);
      count += 1;
    }
    return count;
  }

  delete(where?: WhereClause): number {
    const rowIds = this.findRowIds(where);
    let count = 0;
    for (const rowId of rowIds) {
      const row = this.rows.get(rowId);
      if (!row) continue;
      this.removeFromIndexes(row);
      this.rows.delete(rowId);
      count += 1;
    }
    return count;
  }

  lookupRows(column: string, value: any): Record<string, any>[] {
    const rowIds = this.getIndex(column)?.lookup(value) ?? this.findRowIds({ column, value });
    return this.rowsFromIds(rowIds).map((row) => this.stripInternal(row));
  }

  getAllRows(): Record<string, any>[] {
    return Array.from(this.rows.values()).map((row) => this.stripInternal(row));
  }

  getIndex(column: string): Index | undefined {
    return this.indexes.get(column);
  }

  serialize(): Row[] {
    return Array.from(this.rows.values());
  }

  private buildIndexes(): void {
    this.columns.forEach((col) => {
      if (col.primaryKey || col.unique) {
        this.indexes.set(col.name, new Index(col.name, true));
      }
    });
  }

  private loadRow(stored: Record<string, any>): void {
    const rowId = typeof stored._id === 'number' ? stored._id : this.nextRowId++;
    this.nextRowId = Math.max(this.nextRowId, rowId + 1);
    const { _id, ...rest } = stored;
    const row = this.prepareRow(rest, rowId);
    this.applyIndexesForInsert(row);
    this.rows.set(row._id, row);
  }

  private prepareRow(rowData: Record<string, any>, rowId: number): Row {
    const row: Row = { _id: rowId };
    this.columns.forEach((col) => {
      const value = rowData[col.name];
      row[col.name] = this.validateType(col, value);
    });
    return row;
  }

  private validateType(column: Column, value: any): any {
    if (value === undefined || value === null) return value;
    if (column.type === 'INT') {
      if (typeof value !== 'number') {
        throw new InvalidQueryError(`Column '${column.name}' expects INT`);
      }
      return value;
    }
    if (column.type === 'TEXT') {
      if (typeof value !== 'string') {
        throw new InvalidQueryError(`Column '${column.name}' expects TEXT`);
      }
      return value;
    }
    throw new InvalidQueryError(`Unsupported column type for '${column.name}'`);
  }

  private applyIndexesForInsert(row: Row): void {
    for (const [column, index] of this.indexes.entries()) {
      const value = row[column];
      index.insert(value, row._id);
    }
  }

  private removeFromIndexes(row: Row): void {
    for (const [column, index] of this.indexes.entries()) {
      index.remove(row[column], row._id);
    }
  }

  private applyUpdates(row: Row, updates: Record<string, any>): void {
    const updatedValues: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      const column = this.columns.find((c) => c.name === key);
      if (!column) return;
      updatedValues[key] = this.validateType(column, value);
    });

    for (const [key, newValue] of Object.entries(updatedValues)) {
      const oldValue = row[key];
      const index = this.indexes.get(key);
      if (index) {
        index.update(oldValue, newValue, row._id);
      }
      row[key] = newValue;
    }
  }

  private findRowIds(where?: WhereClause): Set<number> {
    if (!where) return new Set(this.rows.keys());
    const index = this.indexes.get(where.column);
    if (index) return index.lookup(where.value);

    const result = new Set<number>();
    for (const [rowId, row] of this.rows.entries()) {
      if (this.matches(row, where)) {
        result.add(rowId);
      }
    }
    return result;
  }

  private matches(row: Row, where: WhereClause): boolean {
    return row[where.column] === where.value;
  }

  private rowsFromIds(rowIds: Set<number>): Row[] {
    const output: Row[] = [];
    rowIds.forEach((id) => {
      const row = this.rows.get(id);
      if (row) output.push(row);
    });
    return output;
  }

  private stripInternal(row: Row): Record<string, any> {
    const { _id, ...rest } = row;
    return { ...rest };
  }
}
