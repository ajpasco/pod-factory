import { describe, expect, it } from 'vitest';
import {
  loadRecords,
  recordFileName,
  serializeRecord,
  validateBootstrapRecord,
  validateRecord,
  writeRecord,
  type FactoryRecord,
} from '../src/index.js';
import { fixture } from './support/repo.js';
import {
  AGENT,
  HUMAN,
  RUNNER,
  checkResult,
  gateApproval,
  inProgress,
  lockRecord,
  revocation,
  stored,
} from './support/records.js';

function validate(record: FactoryRecord, mutate?: (json: Record<string, unknown>) => void) {
  const name = recordFileName(record, 'test');
  if (mutate === undefined) return validateRecord(`records/${name}`, serializeRecord(record));
  const json = JSON.parse(serializeRecord(record)) as Record<string, unknown>;
  mutate(json);
  return validateRecord(`records/${name}`, `${JSON.stringify(json, null, 2)}\n`);
}

function reason(result: ReturnType<typeof validate>): string {
  if (result.ok) throw new Error('expected the record to be invalid');
  return result.reason;
}

describe('record validation', () => {
  it('T-20-N5 [M0] an unknown or free-text hash algorithm, or a newer schema, is invalid and readers fail closed', () => {
    const unknown = gateApproval();
    const freeText = gateApproval();
    const newer = gateApproval();
    const good = gateApproval();

    expect(reason(validate(unknown, (r) => (r.hashAlgorithm = 'sha512-lf')))).toMatch(
      /names the hash algorithm "sha512-lf", which this pod-factory does not know/,
    );
    expect(
      reason(validate(freeText, (r) => (r.hashAlgorithm = 'sha256 over LF-normalized UTF-8'))),
    ).toMatch(
      /names the hash algorithm "sha256 over LF-normalized UTF-8", which this pod-factory does not know/,
    );
    expect(reason(validate(newer, (r) => (r.schemaVersion = 2)))).toMatch(
      /uses schema 2, which is newer than this pod-factory reads \(schema 1\); upgrade pod-factory/,
    );

    // A reader given all four on the records branch counts only the good one and names the rest.
    const f = fixture();
    const raw = (
      record: FactoryRecord,
      mutate: (r: Record<string, unknown>) => void,
    ): [string, string] => {
      const [path, bytes] = stored(record);
      const json = JSON.parse(bytes) as Record<string, unknown>;
      mutate(json);
      return [path, `${JSON.stringify(json, null, 2)}\n`];
    };
    f.plant(
      Object.fromEntries([
        raw(unknown, (r) => (r.hashAlgorithm = 'sha512-lf')),
        raw(freeText, (r) => (r.hashAlgorithm = 'sha256 over LF-normalized UTF-8')),
        raw(newer, (r) => (r.schemaVersion = 2)),
      ]),
    );
    writeRecord(f.work, good, 'gate-2');
    const set = loadRecords(f.work);
    expect(set.records.map((s) => s.record.recordId)).toEqual([good.recordId]);
    for (const bad of [unknown, freeText, newer]) {
      const flag = set.flagged.find((x) => x.path.includes(bad.recordId));
      expect(flag?.reason).toMatch(/does not know|newer than this pod-factory/);
      expect(flag?.reason).toMatch(/it is ignored$/);
    }
  });

  it('accepts a well-formed record of each of the five types', () => {
    const approval = gateApproval();
    for (const record of [
      approval,
      lockRecord(approval.recordId),
      revocation(approval.recordId),
      inProgress(),
      inProgress(HUMAN),
      checkResult('verify'),
      checkResult('lock-guard'),
      checkResult('gate-check'),
    ]) {
      expect(validate(record), record.recordType).toMatchObject({ ok: true });
    }
  });

  it('names a missing schema version or factory version', () => {
    expect(reason(validate(gateApproval(), (r) => delete r.schemaVersion))).toMatch(
      /missing field "schemaVersion"/,
    );
    expect(reason(validate(gateApproval(), (r) => delete r.factoryVersion))).toMatch(
      /missing field "factoryVersion"/,
    );
  });

  it('enforces the writer rule for each type', () => {
    const agentApproval = { ...gateApproval(), actor: AGENT };
    expect(reason(validate(agentApproval))).toMatch(
      /was written by actor kind agent, but only human may write approval records/,
    );
    expect(reason(validate({ ...gateApproval(), actor: RUNNER }))).toMatch(/only human may write/);
    expect(reason(validate({ ...lockRecord('0123456789ab'), actor: AGENT }))).toMatch(/only human/);
    expect(reason(validate({ ...revocation('0123456789ab'), actor: RUNNER }))).toMatch(
      /only human/,
    );
    expect(reason(validate({ ...checkResult(), actor: HUMAN }))).toMatch(
      /only check-runner may write/,
    );
    expect(reason(validate(inProgress(RUNNER)))).toMatch(
      /only human or agent may write transition/,
    );
  });

  it('accepts verify, lock-guard and gate-check results and nothing else', () => {
    expect(
      reason(
        validate(
          checkResult(),
          (r) => ((r.checkResult as Record<string, unknown>).check = 'class-check'),
        ),
      ),
    ).toMatch(/field "checkResult.check" must be one of verify, lock-guard, gate-check/);
    expect(
      reason(
        validate(
          checkResult('verify'),
          (r) => ((r.checkResult as Record<string, unknown>).bundleManifestSha256 = null),
        ),
      ),
    ).toMatch(/evidence bundle manifest/);
  });

  it('refuses a typed prefix that is not the start of the hash shown', () => {
    expect(
      reason(
        validate(
          gateApproval(),
          (r) => ((r.approval as Record<string, unknown>).typedPrefix = 'bbbbbbbb'),
        ),
      ),
    ).toMatch(/does not match the first eight characters/);
  });

  it('refuses a record whose bytes are not the fixed format', () => {
    const record = gateApproval();
    const name = `records/${recordFileName(record, 'test')}`;
    const bytes = serializeRecord(record);
    expect(validateRecord(name, bytes)).toMatchObject({ ok: true });
    expect(reason(validateRecord(name, bytes.replace(/\n {2}/g, '\n    ')))).toMatch(
      /fixed record format/,
    );
    expect(reason(validateRecord(name, bytes.replace(/\n/g, '\r\n')))).toMatch(
      /fixed record format/,
    );
    expect(reason(validateRecord(name, bytes.trimEnd()))).toMatch(/fixed record format/);
    const reordered = JSON.parse(bytes) as Record<string, unknown>;
    const { schemaVersion, ...rest } = reordered;
    expect(
      reason(validateRecord(name, `${JSON.stringify({ ...rest, schemaVersion }, null, 2)}\n`)),
    ).toMatch(/fixed record format/);
  });

  it('refuses a file name that disagrees with the content', () => {
    const record = gateApproval();
    const bytes = serializeRecord(record);
    const name = recordFileName(record, 'gate-2');
    expect(
      reason(validateRecord(`records/${name.replace('-approval-', '-lock-')}`, bytes)),
    ).toMatch(/file name type/);
    expect(
      reason(validateRecord(`records/${name.replace(record.recordId, '0123456789ab')}`, bytes)),
    ).toMatch(/file name ID/);
    expect(reason(validateRecord(`records/${name.replace(/^\d{8}/, '19990101')}`, bytes))).toMatch(
      /file name timestamp/,
    );
    expect(reason(validateRecord('records/approval.json', bytes))).toMatch(/does not follow/);
  });

  it('refuses unexpected fields and the agent kind outside transitions', () => {
    expect(reason(validate(gateApproval(), (r) => (r.note = 'extra')))).toMatch(
      /unexpected field "note"/,
    );
    expect(
      reason(
        validate(gateApproval(), (r) => ((r.actor as Record<string, unknown>).kind = 'robot')),
      ),
    ).toMatch(/field "actor.kind" must be one of human, check-runner, agent/);
  });

  it('binds before and after hashes only for an amendment approval', () => {
    const amendment = gateApproval();
    amendment.approval = { ...amendment.approval, kind: 'amendment', gate: null };
    amendment.binds = {
      tree: null,
      files: { 'packages/cli/test/a.test.ts': { before: 'a'.repeat(64), after: 'b'.repeat(64) } },
    };
    expect(validate(amendment)).toMatchObject({ ok: true });
    const plain = gateApproval();
    plain.binds = amendment.binds;
    expect(reason(validate(plain))).toMatch(/must be a SHA-256 hash/);
  });

  it('refuses a path that leaves the repository', () => {
    const record = gateApproval();
    record.binds = { tree: null, files: { '../secrets': 'a'.repeat(64) } };
    expect(reason(validate(record))).toMatch(/not a plain path inside the repository/);
  });

  it('reports half-written content by name, never throwing', () => {
    const record = gateApproval();
    const name = `records/${recordFileName(record, 'gate-2')}`;
    const bytes = serializeRecord(record);
    const result = validateRecord(name, bytes.slice(0, Math.floor(bytes.length / 2)));
    expect(reason(result)).toBe(`${name} is not complete JSON, so it may be half-written`);
  });

  it('requires a lock to bind its tree and hold its patterns and commands', () => {
    const lock = lockRecord('0123456789ab');
    expect(validate(lock)).toMatchObject({ ok: true });
    expect(reason(validate({ ...lock, binds: { ...lock.binds, tree: null } }))).toMatch(
      /a lock must bind the approved tree/,
    );
    expect(reason(validate({ ...lock, lock: { ...lock.lock, patterns: [] } }))).toMatch(
      /field "lock.patterns" must be a non-empty list/,
    );
    expect(reason(validate({ ...lock, lock: { ...lock.lock, testCommands: [] } }))).toMatch(
      /field "lock.testCommands" must be a non-empty list/,
    );
    expect(
      reason(validate({ ...lock, lock: { ...lock.lock, patterns: ['docs/x.md', 'docs/x.md'] } })),
    ).toMatch(/repeats a pattern/);
    expect(
      reason(
        validate(
          lockRecord('0123456789ab'),
          (r) => ((r.lock as Record<string, unknown>).testCommand = 'npm test'),
        ),
      ),
    ).toMatch(/unexpected field "lock.testCommand"/);
  });

  it('accepts a record ID or a bootstrap record file name in refs, and nothing else', () => {
    const approval = gateApproval();
    approval.refs = [
      '0123456789ab',
      '0005-classification-gate-2.json',
      '0001-gate-1-approval-prd-0.9.json',
    ];
    expect(validate(approval)).toMatchObject({ ok: true });
    for (const bad of ['records/bootstrap/0005-x.json', '5-x.json', 'not-an-id', '0005-X.json']) {
      approval.refs = [bad];
      expect(reason(validate(approval)), bad).toMatch(
        /must be a record ID or a bootstrap record's file name/,
      );
    }
  });

  it('reads a bootstrap classification record', () => {
    const record = {
      schemaVersion: 'bootstrap-0',
      recordType: 'classification',
      factoryVersion: 'bootstrap (decision 23)',
      hashAlgorithm: 'sha256 over LF-normalized UTF-8',
      createdAt: '2026-10-20T12:00:00-04:00',
      actor: { name: 'Test Human', email: 'human@example.test', kind: 'human' },
      binds: { '.factory/work/classification/gate-2.json': { sha256: 'a'.repeat(64) } },
      outcome: 'approved',
    };
    const path = 'records/bootstrap/0005-classification-gate-2.json';
    expect(validateBootstrapRecord(path, JSON.stringify(record))).toMatchObject({ ok: true });
    expect(
      validateBootstrapRecord(path, JSON.stringify({ ...record, recordType: 'verdict' })),
    ).toMatchObject({ ok: false });
  });
});
