import { Table } from './Table';

export class Join {
  static innerJoin(
    left: Table,
    right: Table,
    leftKey: string,
    rightKey: string
  ): Record<string, any>[] {
    const leftCol = leftKey.split('.').pop() ?? leftKey;
    const rightCol = rightKey.split('.').pop() ?? rightKey;

    const rightIndexed = Boolean(right.getIndex(rightCol));
    const rightRowsAll = rightIndexed ? [] : right.getAllRows();
    const results: Record<string, any>[] = [];

    for (const leftRow of left.getAllRows()) {
      const value = leftRow[leftCol];
      const matches = rightIndexed
        ? right.lookupRows(rightCol, value)
        : rightRowsAll.filter((row) => row[rightCol] === value);

      matches.forEach((rightRow) => {
        const combined = {
          ...prefixRow(leftRow, left.name),
          ...prefixRow(rightRow, right.name),
        };
        results.push(combined);
      });
    }

    return results;
  }
}

function prefixRow(row: Record<string, any>, tableName: string): Record<string, any> {
  const output: Record<string, any> = {};
  Object.entries(row).forEach(([key, value]) => {
    output[`${tableName}.${key}`] = value;
  });
  return output;
}
