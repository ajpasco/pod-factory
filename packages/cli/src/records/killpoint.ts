/**
 * The defined kill points of REQ-08 inside a record write. The writer calls an optional hook at
 * each one; shipped code never sets it. The kill-and-resume tests pass a hook that kills the
 * process there, exactly as an outside kill would land.
 */
export const KILL_POINTS = [
  'during-journal-write',
  'after-journal',
  'before-push',
  'after-push',
  'after-record-write',
] as const;
export type KillPoint = (typeof KILL_POINTS)[number];

export type KillPointHook = (point: KillPoint) => void;
