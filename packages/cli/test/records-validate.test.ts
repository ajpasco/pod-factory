import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RecordsReadError,
  loadRecords,
  readRecords,
  serializeRecord,
  type FactoryRecord,
} from '../src/index.js';
import { cleanEnv, runCli } from './support/cli.js';
import {
  checkResult,
  gateApproval,
  inProgress,
  lockRecord,
  revocation,
  stored,
} from './support/records.js';
import { BRANCH, fixture, sh, type Fixture } from './support/repo.js';

function validate(cwd: string): { status: number | null; out: string; err: string } {
  const result = runCli(cwd, ['ci', 'records-validate'], cleanEnv({ GITHUB_ACTIONS: 'true' }));
  return { status: result.status, out: result.stdout, err: result.stderr };
}

/** One record of each of the five types, planted on the records branch. */
function plantAllTypes(f: Fixture): FactoryRecord[] {
  const approval = gateApproval();
  const human: FactoryRecord[] = [
    approval,
    lockRecord(approval.recordId),
    revocation(approval.recordId),
    inProgress(),
  ];
  const fromCi = checkResult();
  f.plant(Object.fromEntries(human.map((r) => stored(r))), 'human and builder records');
  f.plant(Object.fromEntries([stored(fromCi)]), 'check result', { by: 'runner' });
  return [...human, fromCi];
}

describe('ci records-validate', () => {
  it('T-20-P1 [M0] every record carries its schema and factory version, and validation passes', () => {
    const f = fixture();
    const records = plantAllTypes(f);

    const run = validate(f.work);
    expect(run.err).toBe('');
    expect(run.out).toMatch(/: 5 valid records, 0 flagged\./);
    expect(run.status).toBe(0);
    const onBranch = f.filesOnBranch();
    expect(onBranch).toHaveLength(records.length);
    for (const path of onBranch) {
      const record = JSON.parse(sh(f.remote, ['show', `${BRANCH}:${path}`])) as FactoryRecord;
      expect(record.schemaVersion, path).toBe(1);
      expect(record.factoryVersion, path).toBe('0.0.0-m0');
    }
  });

  it('T-20-N1 [M0] a record missing its schema or factory version is flagged by name', () => {
    const f = fixture();
    plantAllTypes(f);
    const noSchema = gateApproval();
    const noFactory = gateApproval();
    const [schemaPath, schemaBytes] = stored(noSchema);
    const [factoryPath, factoryBytes] = stored(noFactory);
    const drop = (bytes: string, field: 'schemaVersion' | 'factoryVersion'): string => {
      const kept = Object.entries(JSON.parse(bytes) as Record<string, unknown>).filter(
        ([key]) => key !== field,
      );
      return `${JSON.stringify(Object.fromEntries(kept), null, 2)}\n`;
    };
    f.plant({
      [schemaPath]: drop(schemaBytes, 'schemaVersion'),
      [factoryPath]: drop(factoryBytes, 'factoryVersion'),
    });

    const run = validate(f.work);
    expect(run.out).toMatch(/: 5 valid records, 2 flagged\./);
    expect(run.out).toContain(schemaPath);
    expect(run.out).toMatch(/missing field "schemaVersion"/);
    expect(run.out).toContain(factoryPath);
    expect(run.out).toMatch(/missing field "factoryVersion"/);
    expect(run.status).toBe(1);
  });

  it('T-19-N6 [M0] a modified existing record is flagged and ignored', () => {
    const f = fixture();
    const approval = gateApproval();
    const [path, bytes] = stored(approval);
    f.plant({ [path]: bytes }, 'add an approval');
    const edited = { ...approval, approval: { ...approval.approval, statement: 'rewritten' } };
    f.plant({ [path]: serializeRecord(edited) }, 'edit the approval in place');

    const run = validate(f.work);
    expect(run.out).toMatch(/: 0 valid records, 1 flagged\./);
    expect(run.out).toContain(path);
    expect(run.out).toMatch(/changed in commit [0-9a-f]{12} after it was first added/);
    expect(run.status).toBe(1);
    expect(loadRecords(f.work).records).toEqual([]);
    expect(sh(f.remote, ['show', `${BRANCH}:${path}`]) + '\n').toBe(serializeRecord(edited));
  });

  it('flags a human record pushed by the Actions bot and a check result pushed by anyone else', () => {
    const f = fixture();
    const approval = gateApproval();
    const [approvalPath, approvalBytes] = stored(approval);
    f.plant({ [approvalPath]: approvalBytes }, 'approval pushed by CI', { by: 'runner' });
    const result = checkResult();
    const [resultPath, resultBytes] = stored(result);
    f.plant({ [resultPath]: resultBytes }, 'check result pushed by a person');

    const run = validate(f.work);
    expect(run.out).toMatch(/: 0 valid records, 2 flagged\./);
    expect(run.out).toContain(
      `${approvalPath} is a human approval record committed by the check runner`,
    );
    expect(run.out).toContain(
      `${resultPath} is a check result committed by human@example.test, not by the check runner`,
    );
    expect(run.status).toBe(1);
  });

  it('passes with nothing to validate when the records branch does not exist', () => {
    const f = fixture({ recordsBranch: false });
    const run = validate(f.work);
    expect(run.out).toMatch(/does not exist on origin, so there is nothing to validate/);
    expect(run.status).toBe(0);
  });

  it('reads the whole history from a shallow clone of the records branch', () => {
    const f = fixture();
    const first = gateApproval();
    const second = gateApproval();
    f.plant(Object.fromEntries([stored(first)]), 'first record');
    f.plant(Object.fromEntries([stored(second)]), 'second record');
    const shallow = join(f.root, 'shallow');
    sh(f.root, [
      'clone',
      '--quiet',
      '--depth',
      '1',
      '--branch',
      BRANCH,
      `file://${f.remote}`,
      shallow,
    ]);
    expect(sh(shallow, ['rev-parse', '--is-shallow-repository'])).toBe('true');

    const run = validate(shallow);
    expect(run.err).toBe('');
    expect(run.out).toMatch(/: 2 valid records, 0 flagged\./);
    expect(run.status).toBe(0);
  });

  it('says plainly that it cannot read records when the history is cut short', () => {
    const f = fixture();
    f.plant(Object.fromEntries([stored(gateApproval())]), 'first record');
    f.plant(Object.fromEntries([stored(gateApproval())]), 'second record');
    const shallow = join(f.root, 'shallow');
    sh(f.root, [
      'clone',
      '--quiet',
      '--depth',
      '1',
      '--branch',
      BRANCH,
      `file://${f.remote}`,
      shallow,
    ]);

    expect(() => readRecords(shallow, `refs/remotes/origin/${BRANCH}`)).toThrow(RecordsReadError);
    expect(() => readRecords(shallow, `refs/remotes/origin/${BRANCH}`)).toThrow(
      /history in this clone stops at commit [0-9a-f]{12} \(a shallow clone\).*Nothing was read as approved\./,
    );
  });

  it('refuses a job it does not have, naming the jobs it has', () => {
    const f = fixture();
    const result = runCli(f.work, ['ci', 'deploy'], cleanEnv());
    expect(result.stderr).toMatch(
      /has no job "deploy"\. Jobs: lock-guard, verify, verify-record, gate-check, records-validate\. Nothing was checked\./,
    );
    expect(result.status).toBe(1);
  });
});
