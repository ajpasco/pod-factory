// Explicit, bounded integration probe. Creates one new chat; never touches existing chats.
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { OrcaBridge, OrcaCliTransport } from '../dist/src/orca-bridge.js';
import { OrcaNativeTransport } from '../dist/src/orca-native.js';
import { PreparationStore } from '../dist/src/store.js';

if (process.env.RUN_LIVE_ORCA !== '1') throw new Error('Set RUN_LIVE_ORCA=1 explicitly; this creates one new native Claude chat and requests one short response.');
const dataDir = await mkdtemp(join(tmpdir(), 'orca-preparation-live-'));
const workspacePath = resolve('..');
const transport = new OrcaNativeTransport({ workspacePath, terminalTransport: new OrcaCliTransport() });
const bridge = new OrcaBridge({ store: new PreparationStore(dataDir), workspacePath, transport });
await mkdir('evidence', { recursive: true });
const evidence = { createdAt: new Date().toISOString(), dataDir, requested: { provider: 'claude', model: 'claude-opus-5-5', effort: 'medium' }, launch: null, notification: null };
const save = () => writeFile('evidence/orca-native-live.json', JSON.stringify(evidence, null, 2) + '\n');
const status = await bridge.startSession();
evidence.launch = { state: status.launch?.state, reason: status.launch?.reason, target: status.attachment?.target ?? null };
await save();
console.log(JSON.stringify(evidence.launch));
if (status.launch?.state !== 'paired' || status.attachment?.target.kind !== 'native') {
  process.exitCode = 1;
} else {
  const requestId = randomUUID();
  evidence.notification = { state: 'uncertain', requestId };
  await save(); // Record the attempt before any external message effect.
  try {
    const receipt = await transport.send(status.attachment.target,
      'Synthetic integration smoke test from the preparation coordinator. Reply exactly ORCA_PREPARATION_SMOKE_READY. Do not use tools, read or edit files, start work, or approve anything. This is not a product request or user approval.', requestId);
    evidence.notification = { state: 'enqueued', ...receipt };
  } catch (error) { evidence.notification.reason = error instanceof Error ? error.message : String(error); process.exitCode = 1; }
  await save(); console.log(JSON.stringify(evidence.notification));
}
