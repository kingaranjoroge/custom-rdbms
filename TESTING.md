# Testing Guide - Mini RDBMS

A comprehensive walkthrough to test the functionality of the mini RDBMS + Next.js demo.

## Prerequisites
- Node.js installed
- Terminal open in the `rdbms/` directory

## Setup

### Install and Start
```bash
npm install
npm run dev
```

Open your browser to **http://localhost:3000/dashboard**

You should see the SQL playground with a textarea input and an Execute button.

---

## Test 1: Basic CRUD Operations

Use the dashboard textarea to run these SQL statements one by one. Click **Execute** after each and check the result JSON below.

### Create Table
```sql
CREATE TABLE users (id INT PRIMARY KEY, name TEXT);
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "message": "Table users created"
  }
}
```

### Insert Rows
```sql
INSERT INTO users VALUES (1, 'Ada');
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "id": 1,
    "name": "Ada"
  }
}
```

Insert a second row:
```sql
INSERT INTO users VALUES (2, 'Lin');
```

### Query All Rows
```sql
SELECT * FROM users;
```

**Expected Result:**
```json
{
  "success": true,
  "result": [
    {
      "id": 1,
      "name": "Ada"
    },
    {
      "id": 2,
      "name": "Lin"
    }
  ]
}
```

### Update a Row
```sql
UPDATE users SET name='Ada Lovelace' WHERE id=1;
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "updated": 1
  }
}
```

Verify the change:
```sql
SELECT * FROM users;
```

You should see Ada's name is now "Ada Lovelace".

### Delete a Row
```sql
DELETE FROM users WHERE id=2;
```

**Expected Result:**
```json
{
  "success": true,
  "result": {
    "deleted": 1
  }
}
```

Re-query to confirm:
```sql
SELECT * FROM users;
```

Only the Ada row should remain.

---

## Test 2: INNER JOIN

### Create Orders Table
```sql
CREATE TABLE orders (id INT PRIMARY KEY, user_id INT UNIQUE, total INT);
```

### Insert Order Data
```sql
INSERT INTO orders VALUES (10, 1, 42);
```

### Execute Inner Join
```sql
SELECT users.name, orders.total FROM users JOIN orders ON users.id = orders.user_id;
```

**Expected Result:**
```json
{
  "success": true,
  "result": [
    {
      "users.name": "Ada Lovelace",
      "orders.total": 42
    }
  ]
}
```

Note: Column names are prefixed with `table_name.` to avoid collisions.

---

## Test 3: Verify Persistence

### Check Storage Directory
After running inserts/updates, open the `/storage` folder in the project root.

You should see:
- `users.json` — Contains user rows with schema
- `orders.json` — Contains order rows with schema

Each file looks similar to:
```json
{
  "name": "users",
  "columns": [
    {
      "name": "id",
      "type": "INT",
      "primaryKey": true,
      "unique": true
    },
    {
      "name": "name",
      "type": "TEXT"
    }
  ],
  "rows": [
    {
      "_id": 1,
      "id": 1,
      "name": "Ada Lovelace"
    }
  ]
}
```

### Restart and Verify
1. Stop the dev server (Ctrl+C)
2. Run `npm run dev` again
3. In the dashboard, run: `SELECT * FROM users;`

Your previously inserted data should still be there. This confirms file persistence works.

---

## Test 4: API Direct Testing (Optional)

If you prefer testing via curl or Postman instead of the UI:

### From Another Terminal
Keep the dev server running and open a new terminal. Run:

```bash
curl -X POST http://localhost:3000/api/db \
  -H "Content-Type: application/json" \
  -d "{\"sql\":\"SELECT * FROM users;\"}"
```

You should receive the JSON response from the API directly.

### Example: Create and Insert via API
```bash
curl -X POST http://localhost:3000/api/db \
  -H "Content-Type: application/json" \
  -d "{\"sql\":\"CREATE TABLE products (id INT PRIMARY KEY, name TEXT);\"}"

curl -X POST http://localhost:3000/api/db \
  -H "Content-Type: application/json" \
  -d "{\"sql\":\"INSERT INTO products VALUES (1, 'Laptop');\"}"

curl -X POST http://localhost:3000/api/db \
  -H "Content-Type: application/json" \
  -d "{\"sql\":\"SELECT * FROM products;\"}"
```

---

## Test 5: Error Scenarios

Test that the system properly rejects invalid queries.

### Duplicate Primary Key
```sql
INSERT INTO users VALUES (1, 'Duplicate');
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Duplicate value for unique column 'id': 1"
}
```

### Unknown Column in SELECT
```sql
SELECT nope FROM users;
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Unknown column 'nope' in table 'users'"
}
```

### Invalid SQL Syntax
```sql
SELECT FROM users WHERE;
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Invalid SELECT syntax"
}
```

### Table Not Found
```sql
SELECT * FROM nonexistent;
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Table not found: nonexistent"
}
```

---

## Test 6: Interactive REPL Terminal

Test using the command-line REPL instead of the web UI.

### Start the REPL
```bash
npm run repl
```

You should see:
```
Mini RDBMS Interactive REPL
Type SQL statements (end with ;), or "exit"/"quit" to exit.

db >
```

### Execute Queries in REPL

#### Create and Insert
```
db > CREATE TABLE products (id INT PRIMARY KEY, name TEXT);
Table products created.

db > INSERT INTO products VALUES (1, 'Laptop');
{ id: 1, name: 'Laptop' }

db > INSERT INTO products VALUES (2, 'Mouse');
{ id: 2, name: 'Mouse' }
```

#### Select with Table Formatting
```
db > SELECT * FROM products;
+----+--------+
| id | name   |
+----+--------+
| 1  | Laptop |
| 2  | Mouse  |
+----+--------+
(2 row(s))
```

#### Multi-line SQL
The REPL buffers input until it encounters a `;`. You can type SQL across multiple lines:
```
db > SELECT * FROM products
... WHERE id = 1;
+----+--------+
| id | name   |
+----+--------+
| 1  | Laptop |
+----+--------+
(1 row(s))
```

#### Update and Delete
```
db > UPDATE products SET name='Gaming Mouse' WHERE id=2;
1 row(s) updated.

db > DELETE FROM products WHERE id=2;
1 row(s) deleted.
```

#### Exit REPL
```
db > exit
Goodbye!
```

### REPL Features
- **Table Format Output**: SELECT results display as ASCII tables with aligned columns
- **Multi-line Input**: Continue typing SQL across multiple lines until you end with `;`
- **Operation Feedback**: INSERT/UPDATE/DELETE show row counts
- **Error Messages**: Invalid SQL or constraint violations display readable errors
- **Shared State**: The REPL uses the same Database and Executor as the web UI

---

## Summary

| Test | Method | Purpose |
|------|--------|---------|
| Create | `CREATE TABLE` | Verify table schema creation |
| Insert | `INSERT INTO` | Verify data insertion and constraints |
| Select | `SELECT *` | Verify data retrieval |
| Update | `UPDATE SET` | Verify data modification |
| Delete | `DELETE FROM` | Verify data removal |
| Join | `SELECT ... JOIN` | Verify INNER JOIN logic |
| Persistence | Check `/storage` + restart | Verify file-based persistence |
| Errors | Invalid queries | Verify error handling |
| REPL | `npm run repl` | Test terminal-based interactive CLI |

All tests should pass with the expected results shown above. If any test fails, check the error message in the JSON response (web UI) or console output (REPL) for diagnostics.
