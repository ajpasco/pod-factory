import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BOOTSTRAP_HASH_ALGORITHM, hashText, validateBootstrapRecord } from '../src/index.js';

// Bootstrap records 0001 to 0004 are still in the working tree; they move to the records
// branch when it is created. These tests read only the binding artifacts: docs/PRD.md whole and
// per requirement. docs/PRD-reference.md is a non-binding traceability note and is never read.

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const recordsDir = `${repoRoot}.factory/records/`;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function record(prefix: string): Json {
  const name = readdirSync(recordsDir).find((n) => n.startsWith(`${prefix}-`));
  if (name === undefined) throw new Error(`bootstrap record ${prefix} not found`);
  return JSON.parse(readFileSync(recordsDir + name, 'utf8')) as Json;
}

const prd = readFileSync(`${repoRoot}docs/PRD.md`, 'utf8');

/** Each requirement hashed as its line without the newline, as record 0001 did. */
function requirementHashesToday(): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const line of prd.replace(/\r\n/g, '\n').split('\n')) {
    const id = /^\*\*(REQ-\d+)\b/.exec(line)?.[1];
    if (id !== undefined) hashes[id] = hashText(line);
  }
  return hashes;
}

/** Record 0001's requirement hashes with each amendment's changes laid over in order. */
function approvedRequirements(amendments: Json[]): Record<string, string> {
  const approved: Record<string, string> = { ...record('0001').binds.requirements };
  for (const amendment of amendments) {
    for (const [id, change] of Object.entries<Json>(amendment.binds.requirementsChanged ?? {})) {
      expect(approved[id] ?? null, `${id} before ${amendment.subject}`).toBe(change.before);
      approved[id] = change.after;
    }
  }
  return approved;
}

describe('bootstrap records', () => {
  it('T-20-P2 [M0] each bootstrap record names its schema version, factory version and hash algorithm', () => {
    const names = readdirSync(recordsDir)
      .filter((n) => n.endsWith('.json'))
      .sort();
    expect(names.map((n) => n.slice(0, 4))).toEqual(['0001', '0002', '0003', '0004', '0006']);
    for (const name of names) {
      const bytes = readFileSync(recordsDir + name);
      const result = validateBootstrapRecord(`records/bootstrap/${name}`, bytes);
      expect(result, name).toMatchObject({ ok: true });
      const parsed = JSON.parse(bytes.toString('utf8')) as Json;
      expect(parsed.schemaVersion, name).toBe('bootstrap-0');
      expect(typeof parsed.factoryVersion, name).toBe('string');
      expect(parsed.factoryVersion.length, name).toBeGreaterThan(0);
      expect(parsed.hashAlgorithm, name).toBe(BOOTSTRAP_HASH_ALGORITHM);
    }
  });

  it("T-03-P5 [M0] today's PRD matches the gate-1 record as amended, whole and for every requirement", () => {
    const r0002 = record('0002');
    const r0004 = record('0004');
    const r0006 = record('0006');
    expect(r0002.amends).toBe('0001-gate-1-approval-prd-0.9.json');
    expect(r0004.amends).toContain('0001-gate-1-approval-prd-0.9.json');

    expect(hashText(prd)).toBe(r0006.binds['docs/PRD.md'].after.sha256);

    const approved = approvedRequirements([r0002, r0004, r0006]);
    const today = requirementHashesToday();
    expect(Object.keys(today).sort()).toEqual(Object.keys(approved).sort());
    expect(Object.keys(today)).toHaveLength(27);
    for (const [id, hash] of Object.entries(today)) expect(hash, id).toBe(approved[id]);
  });

  it("T-03-P7 [M0] records 0001 to 0004 chain to today's PRD, with the reference kept as a traceability note", () => {
    const [r0001, r0002, r0003, r0004, r0006] = ['0001', '0002', '0003', '0004', '0006'].map(
      record,
    ) as [Json, Json, Json, Json, Json];

    // The PRD's whole-document hash runs unbroken from gate 1 to today.
    expect(r0002.binds['docs/PRD.md'].before.sha256).toBe(r0001.binds['docs/PRD.md'].sha256);
    expect(r0003.binds['docs/PRD.md'].unchanged).toBe(r0002.binds['docs/PRD.md'].after.sha256);
    expect(r0004.binds['docs/PRD.md'].before.sha256).toBe(r0002.binds['docs/PRD.md'].after.sha256);
    expect(r0006.binds['docs/PRD.md'].before.sha256).toBe(r0004.binds['docs/PRD.md'].after.sha256);
    expect(hashText(prd)).toBe(r0006.binds['docs/PRD.md'].after.sha256);

    // Every requirement as approved through the chain matches its line today.
    const approved = approvedRequirements([r0002, r0004, r0006]);
    const today = requirementHashesToday();
    expect(Object.keys(today).sort()).toEqual(Object.keys(approved).sort());
    for (const [id, hash] of Object.entries(today)) expect(hash, id).toBe(approved[id]);

    // The reference: the records carry its hash as a field; its value and the file are not checked.
    expect(r0001.binds['docs/PRD-reference.md'].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r0003.binds['docs/PRD-reference.md'].after).toMatch(/^[0-9a-f]{64}$/);
    expect(r0003.binds['docs/PRD-reference.md'].role).toMatch(/traceability/);
  });
});
