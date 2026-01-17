export type ColumnType = 'INT' | 'TEXT';

export interface Column {
  name: string;
  type: ColumnType;
  primaryKey?: boolean;
  unique?: boolean;
}
