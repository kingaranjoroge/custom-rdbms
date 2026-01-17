# Mini RDBMS + Next.js Demo

A tiny relational database engine implemented in TypeScript and embedded inside a Next.js App Router app. No external database or ORM is used—data is stored as JSON files under `/storage`.

## Features
- Custom table/column definitions with INT and TEXT types
- Primary key and unique constraints enforced via in-memory indexes
- CRUD operations: CREATE, INSERT, SELECT, UPDATE, DELETE
- Simple SQL-like parser to AST
- Query executor with INNER JOIN support
- File-backed persistence per table (JSON)
- Next.js API route for executing SQL payloads
- Web dashboard UI for interactive SQL queries
- Terminal-based interactive REPL with table-formatted output

## Architecture
```
/app
  /api/db/route.ts       -> Thin HTTP layer calling the executor
  /dashboard/page.tsx    -> Web UI playground for SQL input/output
/lib/mini-db
  Column.ts              -> Column type definition
  Index.ts               -> Map-backed index with uniqueness enforcement
  Table.ts               -> Table storage, constraints, CRUD, index maintenance
  Database.ts            -> Table registry + JSON persistence
  Parser.ts              -> SQL-like to AST
  Executor.ts            -> AST execution against Database
  Join.ts                -> INNER JOIN helper using indexes when present
  Errors.ts              -> Custom error types
  repl.ts                -> Terminal-based interactive REPL interface
/storage                 -> Persisted table JSON files
```

## ASCII Diagram
```
+-----------+       +-----------+       +-------------+
|  Parser   | --->  | Executor  | --->  |  Database   |
+-----------+       +-----------+       +-------------+
                                        |  Table(s)   |
                                        |  Index(es)  |
                                        +-------------+
                                               |
                                               v
                                           /storage
```

## Supported SQL Syntax
- `CREATE TABLE table (col TYPE [PRIMARY KEY|UNIQUE], ...)`
- `INSERT INTO table VALUES (v1, v2, ...)`
- `SELECT cols FROM table [JOIN other ON a=b] [WHERE col=value]`
- `UPDATE table SET col=value [, ...] WHERE col=value`
- `DELETE FROM table [WHERE col=value]`

### Notes
- Keywords are case-insensitive
- Only `INT` and `TEXT` column types are supported
- WHERE conditions are equality-only and single-clause
- INNER JOIN only; no nested or outer joins

## Design Trade-offs
- Prioritized clarity over performance; indexes only on primary/unique columns
- JSON persistence keeps implementation simple but is not concurrent-safe
- Type checking is minimal (number for INT, string for TEXT); no implicit casts
- Join output prefixes columns with `tableName.` to avoid collisions

## How to Run

### Web Dashboard
1. Install dependencies and start dev server (Next.js 13+ required):
   ```bash
   npm install
   npm run dev
   ```
2. Open the dashboard at http://localhost:3000/dashboard and issue SQL statements.
3. Example sequence:
   ```sql
   CREATE TABLE users (id INT PRIMARY KEY, name TEXT);
   INSERT INTO users VALUES (1, 'Ada');
   SELECT * FROM users;
   ```

### Terminal REPL
Alternatively, use the interactive command-line REPL:
```bash
npm install
npm run repl
```

Then execute SQL statements with table-formatted output:
```
db > CREATE TABLE users (id INT PRIMARY KEY, name TEXT);
db > INSERT INTO users VALUES (1, 'Ada');
db > SELECT * FROM users;
+----+-----+
| id | name|
+----+-----+
| 1  | Ada |
+----+-----+
db > exit
```

For detailed testing examples, see [TESTING.md](TESTING.md).

## AI Usage Disclosure
This implementation was drafted with the assistance of an AI coding tool (GitHub Copilot), then reviewed and adjusted for correctness and clarity.
