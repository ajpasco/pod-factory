/**
 * The defined kill points of REQ-08 inside a record write. When POD_FACTORY_TEST_KILL_AT names
 * one, the process kills itself there with SIGKILL, exactly as an outside kill would land; the
 * kill-and-resume tests use this to stop a write at each point and restart from records alone.
 */
export const KILL_POINTS = [
  'during-journal-write',
  'after-journal',
  'before-push',
  'after-push',
  'after-record-write',
] as const;
export type KillPoint = (typeof KILL_POINTS)[number];

export const KILL_AT_VARIABLE = 'POD_FACTORY_TEST_KILL_AT';

export function killPoint(point: KillPoint): void {
  if (process.env[KILL_AT_VARIABLE] === point) process.kill(process.pid, 'SIGKILL');
}
