// Runs one pod-factory command in its own process, as the human or the orchestrator would, so a
// test can kill it at a defined kill point. The test variable is read here, never by pod-factory.
import { KILL_POINTS, run, type CommandIO, type KillPoint } from '../../src/index.js';

const KILL_AT_VARIABLE = 'POD_FACTORY_TEST_KILL_AT';
const killAt = process.env[KILL_AT_VARIABLE];
if (killAt !== undefined && !(KILL_POINTS as readonly string[]).includes(killAt)) {
  throw new Error(`${KILL_AT_VARIABLE}=${killAt} is not a kill point`);
}

const [cwd, who, token, ...args] = process.argv.slice(2);
if (cwd === undefined || (who !== 'human' && who !== 'agent') || token === undefined) {
  throw new Error('usage: flow-child <cwd> <human|agent> <confirmation token> <command...>');
}
const extra = JSON.parse(process.env.POD_FACTORY_TEST_CTX_ENV ?? '{}') as Record<string, string>;
const lines: string[] = [];
const io: CommandIO = {
  cwd,
  ctx:
    who === 'human'
      ? { env: { ...extra }, stdinIsTTY: true, stdoutIsTTY: true }
      : { env: { ...extra, CLAUDECODE: '1' }, stdinIsTTY: false, stdoutIsTTY: false },
  remote: 'origin',
  out: (line) => {
    lines.push(line);
    process.stdout.write(`${line}\n`);
  },
  err: (line) => process.stderr.write(`${line}\n`),
  // Types the token and the first eight characters of the hash shown, as asked.
  ask: () => {
    const prefix = 'Hash of everything above: ';
    const shown = lines.find((l) => l.startsWith(prefix)) ?? '';
    return Promise.resolve(`${token} ${shown.slice(prefix.length, prefix.length + 8)}`);
  },
  onKillPoint: (point: KillPoint) => {
    if (point === killAt) process.kill(process.pid, 'SIGKILL');
  },
};
process.exitCode = await run(args, io);
