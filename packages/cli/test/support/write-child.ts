// Runs one record write in its own process so a test can kill it at a defined kill point.
import { resumePendingRecords, writeRecord, type FactoryRecord } from '../../src/index.js';

const [mode, cwd, payload, subject] = process.argv.slice(2);
if (cwd === undefined)
  throw new Error('usage: write-child <write|resume> <cwd> [record] [subject]');
if (mode === 'resume') {
  process.stdout.write(JSON.stringify(resumePendingRecords(cwd)));
} else {
  const record = JSON.parse(payload ?? '') as FactoryRecord;
  process.stdout.write(JSON.stringify(writeRecord(cwd, record, subject ?? 'test')));
}
