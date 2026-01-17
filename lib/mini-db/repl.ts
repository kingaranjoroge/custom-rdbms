import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import path from 'path';
import { Database } from './Database';
import { Executor } from './Executor';

const PROMPT = 'db > ';
const CONTINUATION_PROMPT = '... ';

class REPL {
  private rl: readline.Interface;
  private db: Database;
  private executor: Executor;
  private buffer: string = '';

  constructor() {
    this.rl = readline.createInterface({ input, output });
    this.db = new Database(path.join(process.cwd(), 'storage'));
    this.executor = new Executor(this.db);
  }

  async start(): Promise<void> {
    console.log('Mini RDBMS Interactive REPL');
    console.log('Type SQL statements (end with ;), or "exit"/"quit" to exit.\n');

    while (true) {
      try {
        const line = await this.rl.question(this.buffer ? CONTINUATION_PROMPT : PROMPT);

        if (!this.buffer && (line.toLowerCase() === 'exit' || line.toLowerCase() === 'quit')) {
          console.log('\nGoodbye!');
          this.rl.close();
          break;
        }

        this.buffer += (this.buffer ? ' ' : '') + line;

        if (this.buffer.endsWith(';')) {
          const sql = this.buffer.slice(0, -1).trim();
          this.buffer = '';

          if (sql) {
            try {
              const result = this.executor.execute(sql);
              this.printResult(result);
            } catch (err: any) {
              this.printError(err?.message ?? 'Unknown error');
            }
          }
          console.log();
        }
      } catch (err: any) {
        if (err.code === 'ERR_USE_AFTER_CLOSE') {
          break;
        }
        throw err;
      }
    }
  }

  private printResult(result: any): void {
    if (result === null || result === undefined) {
      console.log('(empty)');
      return;
    }

    if (typeof result === 'object' && result.message) {
      console.log(result.message);
      return;
    }

    if (typeof result === 'object' && result.updated !== undefined) {
      console.log(`${result.updated} row(s) updated.`);
      return;
    }

    if (typeof result === 'object' && result.deleted !== undefined) {
      console.log(`${result.deleted} row(s) deleted.`);
      return;
    }

    if (Array.isArray(result)) {
      if (result.length === 0) {
        console.log('(no results)');
        return;
      }

      this.printTable(result);
      console.log(`(${result.length} row(s))`);
      return;
    }

    if (typeof result === 'object') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(result);
  }

  private printTable(rows: Record<string, any>[]): void {
    if (rows.length === 0) return;

    const columns = Object.keys(rows[0]);
    const colWidths: Record<string, number> = {};

    columns.forEach((col) => {
      colWidths[col] = Math.max(
        col.length,
        ...rows.map((row) => String(row[col] ?? 'null').length)
      );
    });

    const separator = '+' + columns.map((col) => '-'.repeat(colWidths[col] + 2)).join('+') + '+';
    const header =
      '|' +
      columns
        .map((col) => ' ' + col.padEnd(colWidths[col]) + ' ')
        .join('|') +
      '|';

    console.log(separator);
    console.log(header);
    console.log(separator);

    rows.forEach((row) => {
      const cells =
        '|' +
        columns
          .map((col) => ' ' + String(row[col] ?? 'null').padEnd(colWidths[col]) + ' ')
          .join('|') +
        '|';
      console.log(cells);
    });

    console.log(separator);
  }

  private printError(message: string): void {
    console.error(`Error: ${message}`);
  }
}

const repl = new REPL();
repl.start();
