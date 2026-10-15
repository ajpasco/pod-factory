import { gateCheck } from './check-runner/gate-check.js';
import { lockGuard } from './check-runner/lock-guard.js';
import { recordsValidate } from './check-runner/records-validate.js';
import { verifyRecord } from './check-runner/verify-record.js';
import { verify } from './check-runner/verify.js';
import { APPROVE_USAGE, approve } from './commands/approve.js';
import { hookPreToolUse } from './hook/pre-tool-use.js';
import { Refusal, type CommandIO } from './commands/common.js';
import { doctor } from './commands/doctor.js';
import { lock } from './commands/lock.js';
import { REVOKE_USAGE, revoke } from './commands/revoke.js';
import { STATUS_USAGE, status } from './commands/status.js';
import { STORY_USAGE, storyFinish, storyStart } from './commands/story.js';
import { GitError } from './records/git.js';
import { RecordsReadError } from './records/store.js';
import { RecordWriteError } from './records/write.js';

export const USAGE = `Usage: pod-factory <command>

Commands:
  approve   approve a gate, a story, a bootstrap pull request or an amendment
  lock      lock the tests and enforcement files the gate-2 approval binds
  revoke    revoke a record; the gate it opened closes and CI blocks what relied on it
  story     start a story for a builder, or finish it (verifying, then done)
  status    show every story's stage, owner and what it waits on, and each gate
  doctor    report each enforcement layer present or missing
  hook      answer a Claude Code hook event on standard input: pre-tool-use
  ci        run a check-runner job: lock-guard, verify, verify-record, gate-check,
            records-validate

${APPROVE_USAGE}

${REVOKE_USAGE}

${STORY_USAGE}

${STATUS_USAGE}`;

/** Runs one command; every stop is a plain-language message and a non-zero exit. */
export async function run(argv: string[], io: CommandIO): Promise<number> {
  const [command, ...rest] = argv;
  try {
    if (command === 'approve') return await approve(rest, io);
    if (command === 'lock') return lock(rest, io);
    if (command === 'doctor') return doctor(rest, io);
    if (command === 'status') return status(rest, io);
    if (command === 'revoke') return await revoke(rest, io);
    if (command === 'story') {
      const [verb, ...args] = rest;
      if (verb === 'start') return storyStart(args, io);
      if (verb === 'finish') return storyFinish(args, io);
      throw new Refusal(STORY_USAGE);
    }
    if (command === 'ci') return ci(rest, io);
    if (command === 'hook' && rest.length === 1 && rest[0] === 'pre-tool-use') {
      return hookPreToolUse(io.input?.() ?? '', io);
    }
    if (command === undefined || command === '--help' || command === 'help') {
      io.out(USAGE);
      return 0;
    }
    io.err(`pod-factory has no command "${command}".\n\n${USAGE}`);
    return 2;
  } catch (error) {
    if (
      error instanceof Refusal ||
      error instanceof RecordWriteError ||
      error instanceof RecordsReadError
    ) {
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

function ci(argv: string[], io: CommandIO): number {
  const [job, ...rest] = argv;
  if (job === 'lock-guard') return lockGuard(rest, io);
  if (job === 'verify') return verify(rest, io);
  if (job === 'verify-record') return verifyRecord(rest, io);
  if (job === 'gate-check') return gateCheck(rest, io);
  if (job === 'records-validate') return recordsValidate(rest, io);
  throw new Refusal(
    `pod-factory ci has no job "${job ?? ''}". Jobs: lock-guard, verify, verify-record, gate-check, records-validate. Nothing was checked.`,
  );
}
