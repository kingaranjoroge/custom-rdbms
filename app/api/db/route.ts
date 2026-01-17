import path from 'path';
import { NextResponse } from 'next/server';
import { Database } from '../../../lib/mini-db/Database';
import { Executor } from '../../../lib/mini-db/Executor';

const db = new Database(path.join(process.cwd(), 'storage'));
const executor = new Executor(db);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sql = body?.sql;
    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ success: false, error: 'SQL string required' }, { status: 400 });
    }
    const result = executor.execute(sql);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message ?? 'Unknown error' }, { status: 400 });
  }
}
