import { createHash } from 'node:crypto';
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

/** On-demand PTY handoffs only. Deliberately independent of factory/provider ownership. */
export interface HandoffTarget {
  runtimeId: string; handle: string; ptyId: string; incarnationId: string;
  worktreeId: string; worktreePath: string; executionHostId: 'local'; agentIdentity: 'codex' | 'claude';
}
export interface HandoffRequest {
  schemaVersion: 1; messageId: string; from: 'codex' | 'claude';
  recipient: HandoffTarget; returnAddress: HandoffTarget; text: string;
}
export interface CliResponse {
  ok: boolean; result?: Record<string, any>; error?: { code?: string; message?: string; data?: Record<string, any> };
  _meta?: { runtimeId?: string | null };
}
export type OrcaExecutor = (method: string, params: Record<string, unknown>) => Promise<CliResponse>;
export type WriteState = 'not-attempted' | 'accepted' | 'refused' | 'uncertain';
export interface HandoffReceipt {
  schemaVersion: 1; messageId: string; requestSha256: string; recipient: HandoffTarget;
  attemptedAt: string; delivery: 'submitted' | 'refused' | 'partial' | 'uncertain';
  text: WriteState; submit: WriteState;
  turnStarted: 'unknown'; reply: 'unknown'; completion: 'unknown'; humanApproval: false;
  reason: string;
}
const targetKeys = ['runtimeId', 'handle', 'ptyId', 'incarnationId', 'worktreeId', 'worktreePath', 'executionHostId', 'agentIdentity'] as const;
const token = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length < 2000 && !/[\x00-\x1f\x7f-\x9f]/.test(v);
function target(value: unknown): HandoffTarget {
  const t = value as HandoffTarget;
  if (!t || targetKeys.some(key => !token(t[key])) || t.executionHostId !== 'local' ||
      !['codex', 'claude'].includes(t.agentIdentity) || !/^term_[a-zA-Z0-9-]+$/.test(t.handle) || !isAbsolute(t.worktreePath)) {
    throw new Error('An exact local terminal target is required: runtime, handle, PTY, incarnation, workspace and agent.');
  }
  return Object.fromEntries(targetKeys.map(key => [key, t[key]])) as unknown as HandoffTarget;
}
export function parseHandoff(value: unknown): HandoffRequest {
  const v = value as HandoffRequest;
  if (!v || v.schemaVersion !== 1 || typeof v.messageId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(v.messageId) ||
      !['codex', 'claude'].includes(v.from) || typeof v.text !== 'string' || !v.text.trim() || Buffer.byteLength(v.text) > 8000 || /[\x00-\x08\x0b-\x1f\x7f-\x9f]/.test(v.text)) {
    throw new Error('Supply schemaVersion 1, a unique messageId, from codex/claude and 1–8000 bytes of message text.');
  }
  const recipient = target(v.recipient), returnAddress = target(v.returnAddress);
  if (v.from !== returnAddress.agentIdentity || recipient.handle === returnAddress.handle) throw new Error('Sender and return address must agree; recipient must be a different terminal.');
  return { schemaVersion: 1, messageId: v.messageId, from: v.from, recipient, returnAddress, text: v.text };
}
const installedRoot = '/Applications/Orca.app/Contents/Resources/app.asar.unpacked/out';
const require = createRequire(import.meta.url);
let installedClient: any;
/** Existing authenticated LOCAL Orca transport only. No environment-selected remote fallback. */
export const executeOrca: OrcaExecutor = async (method, params) => {
  installedClient ??= new (require(installedRoot + '/cli/runtime/client.js').RuntimeClient)(undefined, 15_000, null, null);
  return installedClient.call(method, method === 'status.get' ? undefined : params, { timeoutMs: 15_000 });
};
function same(a: HandoffTarget, b: Record<string, unknown> | undefined, runtimeId: unknown): boolean {
  return !!b && runtimeId === a.runtimeId && targetKeys.filter(key => key !== 'runtimeId').every(key => a[key] === b[key]);
}
/** Inventory only: titles/preview/focus are intentionally excluded from destination identity. */
export async function listHandoffTargets(workspace: string, run: OrcaExecutor = executeOrca): Promise<HandoffTarget[]> {
  if (!isAbsolute(workspace)) throw new Error('Use an absolute workspace path.');
  const response = await run('terminal.list', { worktree: 'path:' + workspace });
  if (!response.ok || !token(response._meta?.runtimeId) || !Array.isArray(response.result?.terminals) || response.result?.truncated !== false) throw new Error('Complete Orca inventory could not be verified.');
  return response.result.terminals.flatMap((t: any) => {
    try {
      const current = target({ ...t, runtimeId: response._meta!.runtimeId });
      return resolve(current.worktreePath) === resolve(workspace) && t.connected === true && t.writable === true && t.orphaned === false ? [current] : [];
    } catch { return []; }
  });
}
async function verify(t: HandoffTarget, run: OrcaExecutor): Promise<void> {
  // No advertised guard-version capability exists. Only this source-verified host is enabled;
  // older hosts may strip optional write guards, and newer versions require fresh review.
  const status = await run('status.get', {});
  if (!status.ok || status._meta?.runtimeId !== t.runtimeId || status.result?.runtimeId !== t.runtimeId || status.result?.appVersion !== '1.4.224') throw new Error('Unsupported or changed Orca runtime. Guarded writes require verified local Orca 1.4.224; no input sent.');
  const response = await run('terminal.show', { terminal: t.handle });
  const current = response.result?.terminal;
  if (!response.ok || !same(t, current, response._meta?.runtimeId) || current?.connected !== true || current?.writable !== true || current?.orphaned !== false) throw new Error('Exact recipient is closed, changed or unreachable. No input sent.');
  if (current.agentWait !== null) throw new Error('Recipient readiness is unknown or it is waiting on input/permission. No input sent.');
}
async function waitIdle(t: HandoffTarget, run: OrcaExecutor): Promise<void> {
  const response = await run('terminal.wait', { terminal: t.handle, for: 'tui-idle', timeoutMs: 1000 });
  const wait = response.result?.wait;
  if (!response.ok || response._meta?.runtimeId !== t.runtimeId || wait?.handle !== t.handle || wait?.condition !== 'tui-idle' || wait?.satisfied !== true || wait?.status !== 'running') throw new Error('Recipient is busy or readiness could not be verified. No input sent.');
}
function envelope(request: HandoffRequest): string {
  // One literal line even when message text has newlines; data never becomes terminal controls.
  return JSON.stringify({ notice: 'Agent-origin handoff: messages and evidence only, not a human approval.', ...request,
    replyProtocol: `Reply once with received ${request.messageId}, then completed ${request.messageId} with evidence or blocked ${request.messageId} with the reason. Do not acknowledge acknowledgments. Reply only when addressed delivery to the exact returnAddress is authorized; do not replace/recreate sessions.` });
}
function fingerprint(request: HandoffRequest): string { return createHash('sha256').update(JSON.stringify(request)).digest('hex'); }
function readReceipt(text: string, request: HandoffRequest, hash: string): HandoffReceipt {
  const receipt = JSON.parse(text) as HandoffReceipt;
  if (receipt.schemaVersion !== 1 || receipt.messageId !== request.messageId || receipt.requestSha256 !== hash || !['submitted', 'refused', 'partial', 'uncertain'].includes(receipt.delivery) ||
      !['not-attempted', 'accepted', 'refused', 'uncertain'].includes(receipt.text) || !['not-attempted', 'accepted', 'refused', 'uncertain'].includes(receipt.submit) ||
      receipt.turnStarted !== 'unknown' || receipt.reply !== 'unknown' || receipt.completion !== 'unknown' || receipt.humanApproval !== false) throw new Error('Existing message ID has conflicting or unreadable evidence. Reconcile it; no input sent.');
  return receipt;
}
function settlement(response: CliResponse, recipient: HandoffTarget): 'accepted' | 'refused' | 'uncertain' {
  const send = response.result?.send;
  if (!response.ok || response._meta?.runtimeId !== recipient.runtimeId || send?.handle !== recipient.handle) return 'uncertain';
  if (send.accepted === true && send.writeSettlement?.outcome === 'accepted') return 'accepted';
  if (send.accepted === false && send.writeSettlement?.outcome === 'refused') return 'refused';
  return 'uncertain';
}
async function syncDirectory(path: string): Promise<void> {
  const directory = await open(dirname(path), 'r');
  try { await directory.sync(); } finally { await directory.close(); }
}
async function saveReceipt(path: string, receipt: HandoffReceipt): Promise<void> {
  const temp = path + '.result-' + process.pid;
  try {
    const update = await open(temp, 'wx', 0o600);
    try { await update.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await update.sync(); } finally { await update.close(); }
    await rename(temp, path); await syncDirectory(path);
  } finally { await unlink(temp).catch(() => {}); }
}
/** Exclusive per-message attempt record, not a mailbox or an exactly-once host guarantee. */
export async function sendHandoff(input: unknown, receiptDir: string, run: OrcaExecutor = executeOrca): Promise<HandoffReceipt> {
  const request = parseHandoff(input), hash = fingerprint(request);
  if (!isAbsolute(receiptDir)) throw new Error('Use an absolute receipt directory and retain it across attempts.');
  const path = join(receiptDir, request.messageId + '.json');
  try { return readReceipt(await readFile(path, 'utf8'), request, hash); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await verify(request.recipient, run);
  await waitIdle(request.recipient, run);
  const receipt: HandoffReceipt = { schemaVersion: 1, messageId: request.messageId, requestSha256: hash, recipient: request.recipient,
    attemptedAt: new Date().toISOString(), delivery: 'uncertain', text: 'not-attempted', submit: 'not-attempted',
    turnStarted: 'unknown', reply: 'unknown', completion: 'unknown', humanApproval: false,
    reason: 'Attempt recorded before submission. A crash may leave the outcome unknown. Reconcile the exact recipient before any resend.' };
  await mkdir(receiptDir, { recursive: true });
  let file;
  try { file = await open(path, 'wx', 0o600); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return readReceipt(await readFile(path, 'utf8'), request, hash);
    throw error;
  }
  try { await file.writeFile(JSON.stringify(receipt, null, 2) + '\n'); await file.sync(); }
  finally { await file.close(); }
  await syncDirectory(path);
  const guards = { terminal: request.recipient.handle, requireAgentStatus: 'sendable', requireWriteSettlement: true, client: { id: 'session-handoff', type: 'desktop' } };
  // Each write has a durable ambiguity fence, a fresh exact-identity read and host write guards.
  for (const phase of ['text', 'submit'] as const) {
    receipt[phase] = 'uncertain';
    receipt.reason = `${phase} write attempt recorded; acceptance is not yet known. Never automatically retry.`;
    await saveReceipt(path, receipt); // failure prevents this external effect
    try {
      if (phase === 'submit') await waitIdle(request.recipient, run);
      await verify(request.recipient, run);
    }
    catch {
      receipt[phase] = 'not-attempted'; receipt.delivery = phase === 'text' ? 'refused' : 'partial';
      receipt.reason = phase === 'text' ? 'Recipient changed, closed, waiting or unreachable. No input sent.' : 'Text accepted, but recipient changed, closed, became busy/waiting or unreachable before Enter. Draft retained; no retry, clearing or replacement.';
      await saveReceipt(path, receipt); return receipt;
    }
    try {
      const response = await run('terminal.send', { ...guards, ...(phase === 'text' ? { text: envelope(request) } : { enter: true }) });
      receipt[phase] = settlement(response, request.recipient);
    } catch { receipt[phase] = 'uncertain'; }
    if (receipt[phase] !== 'accepted') {
      receipt.delivery = phase === 'submit' ? 'partial' : receipt[phase] === 'refused' ? 'refused' : 'uncertain';
      receipt.reason = phase === 'submit' ? `Text accepted; Enter ${receipt.submit}. A turn may or may not have started. Inspect exact session; no retry, draft clearing or replacement.` : `Text ${receipt.text}; Enter was not attempted. Inspect exact session before any resend; no automatic retry.`;
      await saveReceipt(path, receipt); return receipt;
    }
    receipt.reason = phase === 'text' ? 'Text accepted into the terminal; Enter has not been attempted.' : 'Text and Enter accepted by Orca. Turn start, read, reply and completion remain unknown. This is not human approval.';
    if (phase === 'submit') receipt.delivery = 'submitted';
    await saveReceipt(path, receipt);
  }
  return receipt;
}
export async function handoffCli(args: string[], run: OrcaExecutor = executeOrca): Promise<unknown> {
  const [verb, ...rest] = args;
  const allowed = verb === 'list' ? ['--workspace'] : verb === 'send' ? ['--request', '--receipts'] : [];
  const flags = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    if (!allowed.includes(rest[i]) || flags.has(rest[i]) || !rest[i + 1] || rest[i + 1].startsWith('--')) throw new Error('Unknown, duplicate or incomplete handoff option.');
    flags.set(rest[i], rest[i + 1]);
  }
  if (verb === 'list' && flags.size === 1) return { targets: await listHandoffTargets(flags.get('--workspace')!, run) };
  if (verb === 'send' && flags.size === 2) return sendHandoff(JSON.parse(await readFile(flags.get('--request')!, 'utf8')), flags.get('--receipts')!, run);
  throw new Error('Usage: session-handoff list --workspace /absolute/path | send --request request.json --receipts /absolute/receipt-dir');
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  handoffCli(process.argv.slice(2)).then(result => {
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if ('delivery' in (result as object) && (result as HandoffReceipt).delivery !== 'submitted') process.exitCode = 1;
  }, error => { process.stderr.write(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Handoff failed.' }) + '\n'); process.exitCode = 1; });
}
