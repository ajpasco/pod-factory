import { APPROVE_USAGE, approve } from './commands/approve.js';
import { Refusal, type CommandIO } from './commands/common.js';
import { lock } from './commands/lock.js';
import { GitError } from './records/git.js';
import { RecordWriteError } from './records/write.js';

export const USAGE = `Usage: pod-factory <command>

Commands:
  approve   approve a gate, a story, a bootstrap pull request or an amendment
  lock      lock the tests and enforcement files the gate-2 approval binds

${APPROVE_USAGE}`;

/** Runs one command; every stop is a plain-language message and a non-zero exit. */
export async function run(argv: string[], io: CommandIO): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === 'approve') return await approve(rest, io);
    if (command === 'lock') return lock(rest, io);
    if (command === undefined || command === '--help' || command === 'help') {
      io.out(USAGE);
      return 0;
    }
    io.err(`pod-factory has no command "${command}".\n\n${USAGE}`);
    return 2;
  } catch (error) {
    if (error instanceof Refusal || error instanceof RecordWriteError) {
      io.err(error.message);
      return 1;
    }
    if (error instanceof GitError) {
      io.err(
        `pod-factory ${command} stopped because git failed: ${error.stderr.trim() || error.message}. Nothing new was written.`,
      );
      return 1;
    }
    throw error;
  }
}
