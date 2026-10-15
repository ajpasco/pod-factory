import { contentAt, fetchTrunk, filesAt, hashesAt, TRUNK } from '../git-tree.js';
import { BUILD_PLAN, STORY_FILE } from '../lock-policy.js';
import { loadRecords } from '../records/store.js';
import { statusReport, type PlannedStory } from '../status/report.js';
import { Refusal, type CommandIO } from './common.js';

export const STATUS_USAGE = `Usage:
  pod-factory status
  Prints every story in the build plan on main with its stage, owner, what it waits on and the
  record or rule holding it, then each gate. It reads and never writes.`;

/**
 * `pod-factory status`. Reads the records branch and main, writes nothing, and exits 0 whenever
 * the report was produced, however blocked everything is. Returns the exit code.
 */
export function status(argv: string[], io: CommandIO): number {
  if (argv.length > 0) {
    throw new Refusal(`status takes no arguments.\n${STATUS_USAGE}`);
  }
  const set = loadRecords(io.cwd, io.remote);
  const main = fetchTrunk(io.cwd, io.remote);
  const files = filesAt(io.cwd, main);
  const text = (path: string) =>
    files.has(path) ? contentAt(io.cwd, files, path).toString('utf8') : null;

  const plan = text(BUILD_PLAN);
  // The stories in the order the plan names them, each once, as `approve 3` finds them.
  const paths = plan === null ? [] : [...new Set(plan.match(STORY_FILE) ?? [])];
  const stories: PlannedStory[] = paths.map((path) => ({
    story: path.split('/')[2] as string,
    path,
    text: text(path),
  }));
  const noStories =
    plan === null
      ? `${TRUNK} has no build plan ${BUILD_PLAN}, so there are no stories to show yet.`
      : paths.length === 0
        ? `The build plan ${BUILD_PLAN} on ${TRUNK} names no story file (.factory/work/story-<n>/story.md).`
        : null;

  const lines = statusReport({
    set,
    main,
    noStories,
    stories,
    hashOnMain: (path) =>
      files.has(path) ? (hashesAt(io.cwd, files, [path])[path] ?? null) : null,
    now: new Date(),
  });
  for (const line of lines) io.out(line);
  return 0;
}
