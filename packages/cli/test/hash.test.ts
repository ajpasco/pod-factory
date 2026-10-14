import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hashBytes, hashText, normalizeLf } from '../src/index.js';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

describe('line-ending-normalized hashing', () => {
  it('T-06-P6 [M0] the approved PRD saved with Windows line endings hashes to the hash in its approval record', () => {
    const amendment = JSON.parse(
      readFileSync(
        `${repoRoot}.factory/records/0006-amendment-prd-0.10-authorized-execution.json`,
        'utf8',
      ),
    ) as { binds: { 'docs/PRD.md': { after: { sha256: string } } } };
    const approved = amendment.binds['docs/PRD.md'].after.sha256;

    const prd = readFileSync(`${repoRoot}docs/PRD.md`);
    const windows = Buffer.from(prd.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8');
    expect(windows.includes('\r\n')).toBe(true);
    expect(windows.equals(prd)).toBe(false);

    expect(hashBytes(windows)).toBe(approved);
    expect(hashBytes(prd)).toBe(approved);
  });

  it('keeps a lone carriage return as content', () => {
    expect(normalizeLf(Buffer.from('a\rb\r\nc'))).toEqual(Buffer.from('a\rb\nc'));
    expect(hashText('a\rb')).not.toBe(hashText('a\nb'));
  });

  it('hashes text and its UTF-8 bytes the same way, in lowercase hex', () => {
    const text = 'ünïcode line\r\nnext\n';
    expect(hashText(text)).toBe(hashBytes(Buffer.from(text, 'utf8')));
    expect(hashText(text)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashText('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
