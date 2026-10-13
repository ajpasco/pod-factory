// Runs one record write in its own process so a test can kill it at a defined kill point.
// The test variable is read here, never by pod-factory itself.
import {
  KILL_POINTS,
  resumePendingRecords,
  writeRecord,
  type FactoryRecord,
  type KillPoint,
  type WriteOptions,
} from '../../src/index.js';

const KILL_AT_VARIABLE = 'POD_FACTORY_TEST_KILL_AT';

const killAt = process.env[KILL_AT_VARIABLE];
if (killAt !== undefined && !(KILL_POINTS as readonly string[]).includes(killAt)) {
  throw new Error(`${KILL_AT_VARIABLE}=${killAt} is not a kill point`);
}
const options: WriteOptions = {
  onKillPoint: (point: KillPoint) => {
    if (point === killAt) process.kill(process.pid, 'SIGKILL');
  },
};

const [mode, cwd, payload, subject] = process.argv.slice(2);
if (cwd === undefined)
  throw new Error('usage: write-child <write|resume> <cwd> [record] [subject]');
if (mode === 'resume') {
  process.stdout.write(JSON.stringify(resumePendingRecords(cwd, options)));
} else {
  const record = JSON.parse(payload ?? '') as FactoryRecord;
  process.stdout.write(JSON.stringify(writeRecord(cwd, record, subject ?? 'test', options)));
}
