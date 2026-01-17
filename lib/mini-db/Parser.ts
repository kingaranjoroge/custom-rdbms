import { Column } from './Column';
import { InvalidQueryError } from './Errors';

export type AST = CreateTableAST | InsertAST | SelectAST | UpdateAST | DeleteAST;

export interface CreateTableAST {
  type: 'create';
  table: string;
  columns: Column[];
}

export interface InsertAST {
  type: 'insert';
  table: string;
  values: any[];
}

export interface JoinClause {
  table: string;
  left: string;
  right: string;
}

export interface SelectAST {
  type: 'select';
  table: string;
  columns: '*' | string[];
  where?: { column: string; value: any };
  join?: JoinClause;
}

export interface UpdateAST {
  type: 'update';
  table: string;
  updates: Record<string, any>;
  where: { column: string; value: any };
}

export interface DeleteAST {
  type: 'delete';
  table: string;
  where?: { column: string; value: any };
}

export function parseSQL(input: string): AST {
  const sql = input.trim().replace(/;$/, '');
  if (/^CREATE\s+TABLE/i.test(sql)) return parseCreate(sql);
  if (/^INSERT\s+INTO/i.test(sql)) return parseInsert(sql);
  if (/^SELECT/i.test(sql)) return parseSelect(sql);
  if (/^UPDATE/i.test(sql)) return parseUpdate(sql);
  if (/^DELETE/i.test(sql)) return parseDelete(sql);
  throw new InvalidQueryError('Unsupported SQL command');
}

function parseCreate(sql: string): CreateTableAST {
  const match = /^CREATE\s+TABLE\s+(\w+)\s*\((.+)\)$/i.exec(sql);
  if (!match) throw new InvalidQueryError('Invalid CREATE TABLE syntax');
  const [, table, columnsRaw] = match;
  const columns = splitCSV(columnsRaw).map(parseColumnDefinition);
  return { type: 'create', table, columns };
}

function parseColumnDefinition(def: string): Column {
  const tokens = def.trim().split(/\s+/);
  if (tokens.length < 2) throw new InvalidQueryError('Invalid column definition');
  const [name, typeToken, ...rest] = tokens;
  const type = typeToken.toUpperCase();
  const flags = rest.map((t) => t.toUpperCase());
  const primaryKey = flags.includes('PRIMARY') || (flags.includes('PRIMARY') && flags.includes('KEY'));
  const unique = primaryKey || flags.includes('UNIQUE');
  if (type !== 'INT' && type !== 'TEXT') {
    throw new InvalidQueryError(`Unsupported column type: ${type}`);
  }
  return { name, type, primaryKey, unique };
}

function parseInsert(sql: string): InsertAST {
  const match = /^INSERT\s+INTO\s+(\w+)\s+VALUES\s*\((.+)\)$/i.exec(sql);
  if (!match) throw new InvalidQueryError('Invalid INSERT syntax');
  const [, table, valuesRaw] = match;
  const values = splitCSV(valuesRaw).map(parseLiteral);
  return { type: 'insert', table, values };
}

function parseSelect(sql: string): SelectAST {
  const match = /^SELECT\s+(.+)\s+FROM\s+(\w+)(?:\s+JOIN\s+(\w+)\s+ON\s+([^\s]+)\s*=\s*([^\s]+))?(?:\s+WHERE\s+(.+))?$/i.exec(sql);
  if (!match) throw new InvalidQueryError('Invalid SELECT syntax');
  const [, columnsRaw, table, joinTable, leftKey, rightKey, whereRaw] = match;
  const columns = columnsRaw.trim() === '*' ? '*' : splitCSV(columnsRaw).map((c) => c.trim());
  const where = whereRaw ? parseCondition(whereRaw) : undefined;
  const join = joinTable ? { table: joinTable, left: leftKey, right: rightKey } : undefined;
  return { type: 'select', table, columns, where, join };
}

function parseUpdate(sql: string): UpdateAST {
  const match = /^UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/i.exec(sql);
  if (!match) throw new InvalidQueryError('Invalid UPDATE syntax');
  const [, table, setRaw, whereRaw] = match;
  const updates: Record<string, any> = {};
  splitCSV(setRaw).forEach((assignment) => {
    const parts = assignment.split('=');
    if (parts.length !== 2) throw new InvalidQueryError('Invalid SET clause');
    const key = parts[0].trim();
    const value = parseLiteral(parts[1]);
    updates[key] = value;
  });
  const where = parseCondition(whereRaw);
  return { type: 'update', table, updates, where };
}

function parseDelete(sql: string): DeleteAST {
  const match = /^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?$/i.exec(sql);
  if (!match) throw new InvalidQueryError('Invalid DELETE syntax');
  const [, table, whereRaw] = match;
  const where = whereRaw ? parseCondition(whereRaw) : undefined;
  return { type: 'delete', table, where };
}

function parseCondition(raw: string): { column: string; value: any } {
  const match = /([\w\.]+)\s*=\s*(.+)/.exec(raw.trim());
  if (!match) throw new InvalidQueryError('Invalid WHERE condition');
  return { column: match[1].trim(), value: parseLiteral(match[2]) };
}

function parseLiteral(raw: string): any {
  const trimmed = raw.trim();
  if (/^'.*'$/.test(trimmed)) {
    return trimmed.slice(1, -1);
  }
  if (!isNaN(Number(trimmed))) {
    return Number(trimmed);
  }
  if (/^NULL$/i.test(trimmed)) return null;
  return trimmed;
}

function splitCSV(raw: string): string[] {
  const result: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char === "'" && raw[i - 1] !== '\\') {
      inString = !inString;
      current += char;
    } else if (char === ',' && !inString) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim() !== '') result.push(current.trim());
  return result;
}
