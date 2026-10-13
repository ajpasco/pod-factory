import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** The algorithm name every schema-1 record carries. */
export const HASH_ALGORITHM = 'sha256-lf';

/** The same algorithm as the bootstrap records name it (schema bootstrap-0). */
export const BOOTSTRAP_HASH_ALGORITHM = 'sha256 over LF-normalized UTF-8';

const CR = 0x0d;
const LF = 0x0a;

/** Replaces every CRLF with LF. A lone CR is content and is kept. */
export function normalizeLf(bytes: Uint8Array): Buffer {
  const out = Buffer.alloc(bytes.length);
  let n = 0;
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i] as number;
    if (b === CR && bytes[i + 1] === LF) continue;
    out[n++] = b;
  }
  return out.subarray(0, n);
}

/** SHA-256 over LF-normalized bytes, lowercase hex. */
export function hashBytes(bytes: Uint8Array): string {
  return createHash('sha256').update(normalizeLf(bytes)).digest('hex');
}

/** SHA-256 over the LF-normalized UTF-8 encoding of a string, lowercase hex. */
export function hashText(text: string): string {
  return hashBytes(Buffer.from(text, 'utf8'));
}

export function hashFile(path: string): string {
  return hashBytes(readFileSync(path));
}
