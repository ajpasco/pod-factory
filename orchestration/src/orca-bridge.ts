import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, resolve } from 'node:path';
import { promisify } from 'node:util';
import { PreparationStore, validId } from './store.js';
import { Preparation, WorkflowError } from './types.js';
import { OrcaNativeTransport } from './orca-native.js';

/** Runtime identity is captured explicitly, never inferred from the focused pane. */
interface OrcaTargetBase {
  runtimeId: string;
  handle: string;
  worktreeId: string;
  worktreePath: string;
  executionHostId: 'local';
  agentIdentity: 'codex' | 'claude';
  title?: string;
}
export interface OrcaTerminalTarget extends OrcaTargetBase { kind?: 'terminal'; ptyId: string; incarnationId: string }
export interface OrcaNativeTarget extends OrcaTargetBase { kind: 'native'; sessionId: string }
export type OrcaTarget = OrcaTerminalTarget | OrcaNativeTarget;
export interface OrcaVerification {
  target?: OrcaTarget;
  state: 'ready' | 'busy' | 'unavailable';
  reason?: string;
}
export interface OrcaTransport {
  readonly deliverySupported?: boolean;
  readonly unsupportedReason?: string;
  capabilities?(target?: OrcaTarget): OrcaCapabilities;
  targets(): Promise<OrcaTarget[]>;
  verify(target: OrcaTarget): Promise<OrcaVerification>;
  /** Implementations must atomically refuse shell/permission/incarnation fallback. */
  send(target: OrcaTarget, message: string, requestId?: string): Promise<{ accepted: boolean; requestId?: string; stage?: string }>;
  reveal?(target: OrcaTarget): Promise<void>;
  useWorkspace?(path: string): void;
  prepareWorkspace?(name: string): Promise<OrcaWorkspace>;
  createWorkspace?(workspace: OrcaWorkspace): Promise<void>;
  prepareSession?(provider: OrcaProvider, preference: OrcaModelPreference): Promise<OrcaLaunch>;
  launchSession?(launch: OrcaLaunch, persist: () => Promise<void>): Promise<OrcaNativeTarget>;
}
export type OrcaEventType = 'answer-saved' | 'task-finished' | 'decision-saved';
export type OrcaProvider = 'claude' | 'codex';
export interface OrcaModelPreference { model: string; effort: 'low' | 'medium' | 'high' }
export type OrcaPreferences = Record<OrcaProvider, OrcaModelPreference>;
export interface OrcaPreferenceInput extends OrcaModelPreference { provider: OrcaProvider }
export interface OrcaWorkspace {
  state: 'uncertain' | 'ready'; name: string; sourcePath: string; runtimeId: string; repoId: string;
  createParams: Record<string, any>; path?: string; id?: string; reason: string;
}
export interface OrcaLaunch {
  state: 'uncertain' | 'partial' | 'paired'; provider: OrcaProvider; preference: OrcaModelPreference; sessionId: string;
  createParams: Record<string, any>; optionRequests: { params: Record<string, any>; applied?: boolean }[];
  target?: OrcaNativeTarget; fence?: number; reason: string;
  modelConfirmation?: 'pending-provider-turn';
}
const defaultPreferences = (): OrcaPreferences => ({ claude: { model: 'claude-opus-5-5', effort: 'medium' }, codex: { model: 'gpt-6.1-sol', effort: 'high' } });
const validPreference = (value: OrcaModelPreference | undefined): boolean => !!value && typeof value.model === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,99}$/.test(value.model) && ['low', 'medium', 'high'].includes(value.effort);
export interface OrcaReceipt {
  id: string;
  target: OrcaTarget;
  preparationId: string;
  revision: number;
  preparationStatus: string;
  eventType: OrcaEventType;
  localUrl: string;
  state: 'pending' | 'delivered' | 'uncertain';
  reason: string;
  createdAt: string;
  attemptedAt?: string;
  requestId?: string;
  stage?: string;
}
export interface OrcaBridgeState {
  schemaVersion: 1;
  attachment: { target: OrcaTarget; directPromptOptIn: true; attachedAt: string } | null;
  receipts: OrcaReceipt[];
  preferredProvider: OrcaProvider;
  preferences: OrcaPreferences;
  launch?: OrcaLaunch;
  workspace?: OrcaWorkspace;
}
export interface OrcaCapabilities { deliverySupported: boolean; startSupported?: boolean; reason?: string }
export interface OrcaBridgeStatus extends OrcaBridgeState { capabilities: OrcaCapabilities; workspacePath: string }
const targetFields = ['runtimeId', 'handle', 'ptyId', 'incarnationId', 'worktreeId', 'worktreePath'] as const;
function validTarget(value: unknown): value is OrcaTarget {
  if (!value || typeof value !== 'object') return false;
  const target = value as OrcaTarget;
  const fields = target.kind === 'native' ? ['runtimeId', 'handle', 'sessionId', 'worktreeId', 'worktreePath'] : targetFields;
  return fields.every(key => { const text = (target as unknown as Record<string, unknown>)[key]; return typeof text === 'string' && text.length > 0 && text.length < 2000 && !/[\r\n\0]/.test(text); }) &&
    target.executionHostId === 'local' && ['codex', 'claude'].includes(target.agentIdentity) && (target.kind !== 'native' || target.handle === target.sessionId);
}
function sameTarget(a: OrcaTarget | undefined, b: OrcaTarget): boolean {
  const fields = b.kind === 'native' ? ['kind', 'runtimeId', 'handle', 'sessionId', 'worktreeId', 'worktreePath'] : targetFields;
  return !!a && (a.kind === 'native') === (b.kind === 'native') && [...fields, 'executionHostId', 'agentIdentity'].every(key => (a as unknown as Record<string, unknown>)[key] === (b as unknown as Record<string, unknown>)[key]);
}
const receiptId = (id: string, revision: number, event: string) => createHash('sha256').update(JSON.stringify([id, revision, event])).digest('hex').slice(0, 32);

/** One instance belongs to the existing single-owner preparation server. No timers or replay loop. */
export class OrcaBridge {
  private readonly path: string;
  private state?: OrcaBridgeState;
  private queue: Promise<unknown> = Promise.resolve();
  private readonly transport: OrcaTransport;
  constructor(private readonly options: { store: PreparationStore; transport?: OrcaTransport; workspacePath: string }) {
    this.path = resolve(options.store.dataDir, 'orca-bridge.json');
    this.transport = options.transport ?? new OrcaNativeTransport({ workspacePath: options.workspacePath, terminalTransport: new OrcaCliTransport() });
  }
  private async serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => {}).then(fn); this.queue = next;
    return next;
  }
  private async load(): Promise<OrcaBridgeState> {
    if (this.state) return this.state;
    let state: OrcaBridgeState;
    try { state = JSON.parse(await this.options.store.readText(this.path)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new WorkflowError('ORCA_STATE', 'Orca attachment state is unreadable; restore it before notifying.');
      state = { schemaVersion: 1, attachment: null, receipts: [], preferredProvider: 'claude', preferences: defaultPreferences() };
    }
    // Old bridge files acquire defaults in memory; read-only status never rewrites them.
    state.preferredProvider ??= 'claude'; state.preferences ??= defaultPreferences();
    if (state.schemaVersion !== 1 || !Array.isArray(state.receipts) || state.receipts.length > 100 ||
      !['claude', 'codex'].includes(state.preferredProvider) || !validPreference(state.preferences.claude) || !validPreference(state.preferences.codex) ||
      (state.launch && (!['uncertain', 'partial', 'paired'].includes(state.launch.state) || !['claude', 'codex'].includes(state.launch.provider) || !validPreference(state.launch.preference) || typeof state.launch.sessionId !== 'string' || !state.launch.createParams || !Array.isArray(state.launch.optionRequests))) ||
      (state.attachment !== null && (!state.attachment || state.attachment.directPromptOptIn !== true || !validTarget(state.attachment.target))) ||
      state.receipts.some(receipt => !receipt || !validTarget(receipt.target) || !validId(receipt.preparationId) ||
        !Number.isSafeInteger(receipt.revision) || receipt.revision < 1 || !['pending', 'delivered', 'uncertain'].includes(receipt.state) ||
        !['answer-saved', 'task-finished', 'decision-saved'].includes(receipt.eventType) ||
        receipt.id !== receiptId(receipt.preparationId, receipt.revision, receipt.eventType) || typeof receipt.reason !== 'string' ||
        typeof receipt.localUrl !== 'string' || typeof receipt.preparationStatus !== 'string' || typeof receipt.createdAt !== 'string' ||
        (receipt.state === 'pending' && receipt.attemptedAt !== undefined))) {
      throw new WorkflowError('ORCA_STATE', 'Orca attachment state is invalid; restore it before notifying.');
    }
    if (state.workspace && (!['uncertain', 'ready'].includes(state.workspace.state) || typeof state.workspace.name !== 'string' ||
      resolve(state.workspace.sourcePath ?? '') !== resolve(this.options.workspacePath) || !state.workspace.runtimeId || !state.workspace.repoId || !state.workspace.createParams ||
      (state.workspace.state === 'ready' && (!state.workspace.path || !isAbsolute(state.workspace.path) || !state.workspace.id)))) {
      throw new WorkflowError('ORCA_STATE', 'Saved project workspace is invalid; inspect it before starting.');
    }
    this.state = state;
    if (state.workspace?.state === 'ready') this.transport.useWorkspace?.(state.workspace.path!);
    return state;
  }
  private async save(): Promise<void> { await this.options.store.atomicWrite(this.path, JSON.stringify(this.state, null, 2) + '\n'); }
  private workspacePath(): string { return this.state?.workspace?.state === 'ready' ? this.state.workspace.path! : this.options.workspacePath; }
  private snapshot(): OrcaBridgeStatus {
    return { ...structuredClone(this.state!), workspacePath: this.workspacePath(), capabilities: this.transport.capabilities?.(this.state?.attachment?.target) ?? { deliverySupported: this.transport.deliverySupported !== false, startSupported: !!this.transport.prepareSession, reason: this.transport.unsupportedReason } };
  }
  async targets(): Promise<OrcaTarget[]> {
    await this.load();
    return (await this.transport.targets()).filter(target => resolve(target.worktreePath) === resolve(this.workspacePath()));
  }
  async status(): Promise<OrcaBridgeStatus> { return this.serial(async () => { await this.load(); return this.snapshot(); }); }
  async startSession(input: { workspaceName?: string } = {}): Promise<OrcaBridgeStatus> {
    return this.serial(async () => {
      const state = await this.load();
      if (input.workspaceName !== undefined) {
        if (typeof input.workspaceName !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 _-]{0,59}$/.test(input.workspaceName)) throw new WorkflowError('ORCA_WORKSPACE', 'Use a workspace name of 1–60 letters, numbers, spaces, hyphens or underscores.', 400);
        const name = input.workspaceName.trim();
        if (state.workspace && state.workspace.name !== name) throw new WorkflowError('ORCA_WORKSPACE', 'This preparation already has a workspace attempt. Inspect it rather than creating another.');
        if (!state.workspace) {
          if (state.attachment || (state.launch && state.launch.state !== 'paired')) throw new WorkflowError('ORCA_ATTACHED', 'Disconnect the existing owner before creating a project workspace. Its chat will be preserved.');
          if (!this.transport.prepareWorkspace || !this.transport.createWorkspace || !this.transport.useWorkspace) throw new WorkflowError('ORCA_UNSUPPORTED', 'Project workspace creation is unavailable.');
          state.workspace = await this.transport.prepareWorkspace(name);
          await this.save(); // Record the attempt before creating a worktree; never retry ambiguous creation.
          try { await this.transport.createWorkspace(state.workspace); }
          catch (error) { state.workspace.reason = `Workspace creation needs inspection: ${error instanceof Error ? error.message : 'unknown outcome'}. No automatic retry.`; }
          await this.save();
        }
      }
      if (state.workspace?.state === 'uncertain') return this.snapshot();
      if (state.workspace?.state === 'ready') this.transport.useWorkspace?.(state.workspace.path!);
      if (state.launch && (state.launch.state !== 'paired' || state.attachment)) return this.snapshot(); // Partial/uncertain launches never retry; a completed launch needs explicit detach before another start.
      if (state.attachment) throw new WorkflowError('ORCA_ATTACHED', 'Detach the current session before explicitly starting a native session.');
      if (!this.transport.prepareSession || !this.transport.launchSession) throw new WorkflowError('ORCA_UNSUPPORTED', 'Native Orca session creation is unavailable.');
      state.launch = await this.transport.prepareSession(state.preferredProvider, structuredClone(state.preferences[state.preferredProvider]));
      await this.save(); // The complete create envelope and operation ID precede the effect.
      try {
        const target = await this.transport.launchSession(state.launch, () => this.save());
        if (!validTarget(target) || target.kind !== 'native' || resolve(target.worktreePath) !== resolve(this.workspacePath())) throw new Error('Created session identity does not match this workspace.');
        state.attachment = { target, directPromptOptIn: true, attachedAt: new Date().toISOString() };
        state.launch.state = 'paired'; state.launch.reason = 'Requested model and effort accepted by Orca; provider model confirmation awaits a turn. Paired; no initial prompt sent.';
      } catch (error) { state.launch.reason = `Launch outcome requires inspection: ${error instanceof Error ? error.message : 'unknown error'}. Session ${state.launch.sessionId}. No automatic retry or replacement.`; }
      await this.save(); return this.snapshot();
    });
  }
  async reveal(selected?: OrcaTarget): Promise<{ revealed: true; sessionId: string }> {
    return this.serial(async () => {
      const state = await this.load();
      const target = selected ?? state.attachment?.target ?? state.launch?.target;
      if (!validTarget(target) || resolve(target.worktreePath) !== resolve(this.workspacePath()) || !this.transport.reveal) throw new WorkflowError('ORCA_TARGET', 'Choose an existing session in this preparation workspace.');
      await this.transport.reveal(target);
      return { revealed: true, sessionId: target.handle };
    });
  }
  async setPreferences(input: OrcaPreferenceInput): Promise<OrcaBridgeStatus> {
    return this.serial(async () => {
      if (!['claude', 'codex'].includes(input.provider) || !validPreference(input)) throw new WorkflowError('ORCA_PREFERENCES', 'Choose Claude or Codex, a model identifier of 1–100 characters, and low, medium, or high effort.', 400);
      const state = await this.load();
      state.preferredProvider = input.provider; state.preferences[input.provider] = { model: input.model, effort: input.effort };
      await this.save(); return this.snapshot();
    });
  }
  async attach(input: { target: OrcaTarget; directPromptOptIn: true }): Promise<OrcaBridgeStatus> {
    return this.serial(async () => {
      if (input.directPromptOptIn !== true || !validTarget(input.target)) throw new WorkflowError('ORCA_TARGET', 'Choose an exact Orca agent session and explicitly opt in to direct prompts.', 400);
      await this.load();
      if (resolve(input.target.worktreePath) !== resolve(this.workspacePath())) throw new WorkflowError('ORCA_TARGET', 'Choose an agent in this preparation workspace.', 400);
      const state = await this.load();
      if (state.attachment && !sameTarget(state.attachment.target, input.target)) throw new WorkflowError('ORCA_ATTACHED', 'Detach the current owning session before choosing a different session.');
      const verified = await this.transport.verify(input.target);
      if (!sameTarget(verified.target, input.target) || verified.state === 'unavailable') throw new WorkflowError('ORCA_TARGET', verified.reason ?? 'The selected Orca session cannot be verified.');
      state.attachment = { target: structuredClone(input.target), directPromptOptIn: true, attachedAt: new Date().toISOString() };
      await this.save(); return this.snapshot();
    });
  }
  async detach(): Promise<OrcaBridgeStatus> {
    return this.serial(async () => { const state = await this.load(); state.attachment = null; await this.save(); return this.snapshot(); });
  }
  async notify(preparation: Preparation, eventType: OrcaEventType, localUrl: string): Promise<OrcaReceipt | null> {
    return this.serial(async () => {
      const state = await this.load(); if (!state.attachment) return null;
      const url = new URL(localUrl);
      if (!validId(preparation.id) || !Number.isSafeInteger(preparation.revision) || preparation.revision < 1 ||
        !['answer-saved', 'task-finished', 'decision-saved'].includes(eventType) || url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new WorkflowError('ORCA_EVENT', 'Supply a saved preparation and the local service origin.', 400);
      if (eventType === 'task-finished' && (!preparation.task || !['completed', 'failed', 'interrupted'].includes(preparation.task.status))) throw new WorkflowError('ORCA_EVENT', 'Only a durably finished task can emit a task notice.', 400);
      const id = receiptId(preparation.id, preparation.revision, eventType);
      const existing = state.receipts.find(receipt => receipt.id === id); if (existing) return structuredClone(existing);
      if (state.receipts.length >= 100) throw new WorkflowError('ORCA_STORAGE', 'The 100-notification receipt limit is reached. Existing receipts were retained; no notice was submitted.');
      const receipt: OrcaReceipt = { id, target: structuredClone(state.attachment.target), preparationId: preparation.id,
        revision: preparation.revision, preparationStatus: preparation.planning?.phase ?? preparation.stage, eventType, localUrl: url.origin,
        state: 'pending', reason: 'Not submitted.', createdAt: new Date().toISOString() };
      state.receipts.push(receipt); await this.save();
      await this.deliver(receipt); return structuredClone(receipt);
    });
  }
  async resume(id: string): Promise<OrcaReceipt> {
    return this.serial(async () => {
      const state = await this.load(); const receipt = state.receipts.find(item => item.id === id);
      if (!receipt) throw new WorkflowError('ORCA_RECEIPT', 'Notification receipt not found.', 404);
      // Resuming only submits a definitely unsent notice. Uncertain attempts never resend.
      if (receipt.state === 'pending') await this.deliver(receipt);
      return structuredClone(receipt);
    });
  }
  private async deliver(receipt: OrcaReceipt): Promise<void> {
    if (!sameTarget(this.state!.attachment?.target, receipt.target)) {
      receipt.reason = 'The original owning session is detached. Choose it explicitly before resuming.'; await this.save(); return;
    }
    const capabilities = this.transport.capabilities?.(receipt.target);
    if (capabilities?.deliverySupported === false || (!capabilities && this.transport.deliverySupported === false)) {
      receipt.reason = capabilities?.reason ?? this.transport.unsupportedReason ?? 'This Orca transport cannot safely submit notifications.'; await this.save(); return;
    }
    let verified: OrcaVerification;
    try { verified = await this.transport.verify(receipt.target); }
    catch { receipt.reason = 'The exact owning session could not be verified. Resume explicitly after checking Orca.'; await this.save(); return; }
    if (!sameTarget(verified.target, receipt.target) || verified.state !== 'ready') {
      receipt.reason = verified.reason ?? 'The exact owning session is busy or unavailable. Resume explicitly when it is ready.'; await this.save(); return;
    }
    receipt.state = 'uncertain'; receipt.attemptedAt = new Date().toISOString(); receipt.requestId = randomUUID();
    receipt.reason = 'Submission attempt recorded; acceptance is not yet known. Inspect the owning session before taking further action.';
    await this.save(); // Persist the ambiguity fence before the external effect, including crashes.
    try {
      const result = await this.transport.send(receipt.target,
        `Preparation service notification ${receipt.id}: ${receipt.preparationId}, revision ${receipt.revision}, status ${receipt.preparationStatus}. Local page: ${receipt.localUrl}. Read shared preparation status before deciding what to do next. This is an agent notification, not user approval.`, receipt.requestId);
      receipt.requestId = result.requestId; receipt.stage = result.stage;
      if (result.accepted) { receipt.state = 'delivered'; receipt.reason = receipt.target.kind === 'native' ? 'Orca durably enqueued the notification. This does not prove it was read, completed, or approved.' : 'Orca accepted input. This does not prove it was read, completed, or approved.'; }
      else receipt.reason = 'Orca did not confirm input acceptance. Inspect the owning session; automatic resend is disabled.';
    } catch { receipt.reason = 'Submission outcome is uncertain. Inspect the owning session; automatic resend is disabled.'; }
    await this.save();
  }
}

type CliEnvelope = { ok: boolean; result?: Record<string, any>; error?: { code?: string }; _meta?: { runtimeId?: string } };
export type OrcaCliRunner = (args: string[], cwd?: string) => Promise<CliEnvelope>;
const runCli: OrcaCliRunner = async (args, cwd) => {
  try {
    const result = await promisify(execFile)('orca', args, { cwd, timeout: 12_000, maxBuffer: 1_000_000, encoding: 'utf8' });
    return JSON.parse(result.stdout);
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout;
    if (stdout) { try { return JSON.parse(stdout); } catch { /* report unverified transport */ } }
    throw new Error('Orca local runtime could not be verified.');
  }
};

/** CLI discovery is read-only. Delivery requires a runtime route with atomic agent guards. */
export class OrcaCliTransport implements OrcaTransport {
  readonly deliverySupported = false;
  readonly unsupportedReason = 'The installed terminal-send CLI lacks an atomic agent/incarnation guard. Notification is pending; delivery is disabled to prevent a prompt reaching a shell.';
  constructor(private readonly run: OrcaCliRunner = runCli) {}
  private workspacePath?: string;
  useWorkspace(path: string): void { this.workspacePath = resolve(path); }
  async targets(): Promise<OrcaTarget[]> {
    const response = await this.run(['terminal', 'list', '--worktree', this.workspacePath ? 'path:' + this.workspacePath : 'current', '--json']);
    if (!response.ok || !response._meta?.runtimeId || !Array.isArray(response.result?.terminals)) throw new WorkflowError('ORCA_UNAVAILABLE', 'Orca terminal inventory is unavailable.');
    return response.result.terminals.map((terminal: Record<string, unknown>) => ({ ...terminal, runtimeId: response._meta!.runtimeId }))
      .filter((target: unknown): target is OrcaTarget => validTarget(target)).map((target: OrcaTarget) => Object.fromEntries([...targetFields, 'executionHostId', 'agentIdentity', ...(typeof target.title === 'string' ? ['title'] : [])].map(key => [key, target[key as keyof OrcaTarget]])) as unknown as OrcaTarget);
  }
  async verify(target: OrcaTarget): Promise<OrcaVerification> {
    const response = await this.run(['terminal', 'show', '--terminal', target.handle, '--json'], target.worktreePath);
    const terminal = response.result?.terminal;
    const current = terminal && { ...terminal, runtimeId: response._meta?.runtimeId } as OrcaTarget;
    if (!response.ok || !sameTarget(current, target) || terminal.orphaned || !terminal.connected || !terminal.writable) return { state: 'unavailable', reason: 'The exact Orca runtime, workspace, and agent incarnation are no longer available.' };
    if (terminal.agentWait !== null) return { target: current, state: 'busy', reason: 'The agent is waiting on permission/input, or readiness is unsupported. No prompt was sent.' };
    return { target: current, state: 'busy', reason: this.unsupportedReason };
  }
  async send(): Promise<{ accepted: boolean }> { throw new Error('Unsafe terminal-send fallback is disabled.'); }
}
