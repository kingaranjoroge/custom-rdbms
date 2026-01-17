import { Database } from './Database';
import { InvalidQueryError } from './Errors';
import { Join } from './Join';
import { parseSQL, AST, SelectAST, InsertAST, UpdateAST, DeleteAST, CreateTableAST } from './Parser';
import { Table } from './Table';

export class Executor {
  constructor(private readonly db: Database) {}

  execute(sql: string): any {
    const ast = parseSQL(sql);
    switch (ast.type) {
      case 'create':
        return this.handleCreate(ast);
      case 'insert':
        return this.handleInsert(ast);
      case 'select':
        return this.handleSelect(ast);
      case 'update':
        return this.handleUpdate(ast);
      case 'delete':
        return this.handleDelete(ast);
      default:
        throw new InvalidQueryError('Unsupported operation');
    }
  }

  private handleCreate(ast: CreateTableAST): any {
    this.db.createTable(ast.table, ast.columns);
    return { message: `Table ${ast.table} created` };
  }

  private handleInsert(ast: InsertAST): any {
    const table = this.db.getTable(ast.table);
    if (ast.values.length !== table.columns.length) {
      throw new InvalidQueryError('Values count does not match table schema');
    }
    const payload: Record<string, any> = {};
    table.columns.forEach((col, idx) => {
      payload[col.name] = ast.values[idx];
    });
    const inserted = table.insert(payload);
    this.db.persistTable(ast.table);
    return inserted;
  }

  private handleSelect(ast: SelectAST): any {
    if (ast.join) {
      return this.executeJoinSelect(ast);
    }
    const table = this.db.getTable(ast.table);
    const where = ast.where ? this.normalizeWhere(ast.where, table) : undefined;
    const rows = table.select(where);
    return this.pickColumns(rows, ast.columns);
  }

  private executeJoinSelect(ast: SelectAST): any {
    const left = this.db.getTable(ast.table);
    const right = this.db.getTable(ast.join!.table);
    const joined = Join.innerJoin(left, right, ast.join!.left, ast.join!.right);
    const filtered = ast.where
      ? joined.filter((row) => this.matchesWhere(row, ast.where!, left.name, right.name))
      : joined;
    return this.pickColumns(filtered, ast.columns);
  }

  private handleUpdate(ast: UpdateAST): any {
    const table = this.db.getTable(ast.table);
    const where = this.normalizeWhere(ast.where, table);
    const updated = table.update(where, ast.updates);
    this.db.persistTable(ast.table);
    return { updated };
  }

  private handleDelete(ast: DeleteAST): any {
    const table = this.db.getTable(ast.table);
    const where = ast.where ? this.normalizeWhere(ast.where, table) : undefined;
    const deleted = table.delete(where);
    this.db.persistTable(ast.table);
    return { deleted };
  }

  private normalizeWhere(
    where: { column: string; value: any },
    table: Table
  ): { column: string; value: any } {
    const column = where.column.includes('.') ? where.column.split('.').pop() ?? where.column : where.column;
    const exists = table.columns.some((c) => c.name === column);
    if (!exists) {
      throw new InvalidQueryError(`Unknown column '${column}' in table '${table.name}'`);
    }
    return { column, value: where.value };
  }

  private matchesWhere(
    row: Record<string, any>,
    where: { column: string; value: any },
    leftName: string,
    rightName: string
  ): boolean {
    const { column, value } = where;
    const candidates = [column, `${leftName}.${column}`, `${rightName}.${column}`];
    return candidates.some((key) => row[key] === value);
  }

  private pickColumns(rows: Record<string, any>[], columns: '*' | string[]): any[] {
    if (columns === '*') return rows;
    return rows.map((row) => {
      const shaped: Record<string, any> = {};
      columns.forEach((col) => {
        shaped[col] = row[col];
      });
      return shaped;
    });
  }
}
