import fs from 'fs';
import path from 'path';
import { Column } from './Column';
import { InvalidQueryError, TableNotFoundError } from './Errors';
import { Table } from './Table';

export class Database {
  private readonly tables: Map<string, Table> = new Map();
  private readonly storageDir: string;

  constructor(storageDir = path.join(process.cwd(), 'storage')) {
    this.storageDir = storageDir;
    this.ensureStorage();
    this.loadFromDisk();
  }

  createTable(name: string, columns: Column[]): Table {
    if (this.tables.has(name)) {
      throw new InvalidQueryError(`Table already exists: ${name}`);
    }
    const table = new Table(name, columns);
    this.tables.set(name, table);
    this.persistTable(name);
    return table;
  }

  dropTable(name: string): void {
    if (!this.tables.has(name)) {
      throw new TableNotFoundError(name);
    }
    this.tables.delete(name);
    const filePath = this.tableFilePath(name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getTable(name: string): Table {
    const table = this.tables.get(name);
    if (!table) {
      throw new TableNotFoundError(name);
    }
    return table;
  }

  listTables(): string[] {
    return Array.from(this.tables.keys());
  }

  persistTable(name: string): void {
    const table = this.tables.get(name);
    if (!table) return;
    const filePath = this.tableFilePath(name);
    const payload = { name, columns: table.columns, rows: table.serialize() };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  private ensureStorage(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    if (!fs.existsSync(this.storageDir)) return;
    const entries = fs.readdirSync(this.storageDir).filter((file) => file.endsWith('.json'));
    entries.forEach((file) => {
      const fullPath = path.join(this.storageDir, file);
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const payload = JSON.parse(raw);
      const { name, columns, rows } = payload;
      if (!name || !columns || !rows) return;
      const table = new Table(name, columns as Column[], rows as Record<string, any>[]);
      this.tables.set(name, table);
    });
  }

  private tableFilePath(name: string): string {
    return path.join(this.storageDir, `${name}.json`);
  }
}
