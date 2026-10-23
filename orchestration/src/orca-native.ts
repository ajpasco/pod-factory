import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import type { OrcaCapabilities, OrcaWorkspace, OrcaLaunch, OrcaModelPreference, OrcaNativeTarget, OrcaProvider, OrcaTarget, OrcaTransport, OrcaVerification } from './orca-bridge.js';

const installedRoot = '/Applications/Orca.app/Contents/Resources/app.asar.unpacked/out';
const require = createRequire(import.meta.url);
export interface OrcaRpcResponse { ok: boolean; result?: any; _meta?: { runtimeId?: string } }
export type OrcaRpc = (method: string, params: Record<string, any>, options?: Record<string, any>) => Promise<OrcaRpcResponse>;
export interface OrcaNativeBuilders {
  create(provider: OrcaProvider, workspacePath: string): Record<string, any>;
  option(sessionId: string, key: string, value: string, fence: number): Record<string, any>;
}
const installedBuilders: OrcaNativeBuilders = {
  create(agent, workspacePath) {
    const helper = require(installedRoot + '/shared/structured-agent-session-create.js');
    return helper.structuredAgentSessionCreateParams({ sessionId: helper.createStructuredAgentSessionId(agent, randomUUID), worktree: 'path:' + workspacePath, agent, randomUuid: randomUUID });
  },
  option(sessionId, key, value, fence) {
    const helper = require(installedRoot + '/shared/structured-agent-session-mutation.js');
    return { envelope: { sessionId, clientOperationId: helper.createStructuredAgentSessionOperationId(randomUUID), expectedRuntimeFence: fence,
      payloadFingerprint: helper.structuredAgentSessionPayloadFingerprint({ method: 'agentSession.setOption', sessionId, fields: { key, value } }) }, key, value };
  },
};
function installedRpc(): OrcaRpc {
  let client: any;
  return async (method, params, options) => {
    client ??= new (require(installedRoot + '/cli/runtime/client.js').RuntimeClient)(undefined, 15_000, null, null);
    return client.call(method, params, { timeoutMs: 15_000, ...options });
  };
}
const sameNative = (a: OrcaNativeTarget, b: OrcaNativeTarget) => ['runtimeId', 'sessionId', 'handle', 'worktreeId', 'worktreePath', 'agentIdentity', 'executionHostId'].every(key => a[key as keyof OrcaNativeTarget] === b[key as keyof OrcaNativeTarget]);
function mutation(response: OrcaRpcResponse): any {
  if (!response.ok || response.result?.ok !== true) throw new Error(response.result?.refusal?.message ?? 'Orca refused the native session mutation.');
  if (!Number.isSafeInteger(response.result.fence) || response.result.fence < 1) throw new Error('Orca returned an unverifiable native execution fence.');
  return response.result;
}

/** One native chat path through Orca's existing authenticated local RuntimeClient. */
export class OrcaNativeTransport implements OrcaTransport {
  private readonly rpc: OrcaRpc;
  private readonly builders: OrcaNativeBuilders;
  private readonly sender?: string;
  private readonly available: boolean;
  private workspacePath: string;
  constructor(private readonly options: { workspacePath: string; terminalTransport: OrcaTransport; rpc?: OrcaRpc; builders?: OrcaNativeBuilders; senderHandle?: string }) {
    this.workspacePath = options.workspacePath;
    this.rpc = options.rpc ?? installedRpc(); this.builders = options.builders ?? installedBuilders;
    this.sender = options.senderHandle ?? process.env.ORCA_TERMINAL_HANDLE;
    this.available = !!options.rpc || existsSync(installedRoot + '/cli/runtime/client.js');
  }
  useWorkspace(path: string): void { this.workspacePath = resolve(path); this.options.terminalTransport.useWorkspace?.(this.workspacePath); }
  async prepareWorkspace(name: string): Promise<OrcaWorkspace> {
    const source = await this.rpc('worktree.show', { worktree: 'path:' + this.options.workspacePath });
    const wt = source.result?.worktree;
    if (!source.ok || !source._meta?.runtimeId || wt?.hostId !== 'local' || resolve(wt.path ?? '') !== resolve(this.options.workspacePath) || !wt.repoId) throw new Error('The source Orca worktree cannot be verified.');
    const repository = await this.rpc('repo.show', { repo: 'id:' + wt.repoId });
    const repo = repository.result?.repo;
    if (!repository.ok || repository._meta?.runtimeId !== source._meta.runtimeId || repo?.id !== wt.repoId || repo.kind !== 'git' || !repo.worktreeBaseRef) throw new Error('The repository and its default base cannot be verified.');
    return { state: 'uncertain', name, sourcePath: this.options.workspacePath, runtimeId: source._meta.runtimeId, repoId: repo.id,
      createParams: { repo: 'id:' + repo.id, name, displayName: name, displayNameKind: 'user', baseBranch: repo.worktreeBaseRef,
        noParent: true, setupDecision: 'skip', runHooks: false, activate: true, navigation: 'host' },
      reason: 'Workspace attempt saved before creation. No builder or setup script is authorized.' };
  }
  async createWorkspace(workspace: OrcaWorkspace): Promise<void> {
    const response = await this.rpc('worktree.create', workspace.createParams, { timeoutMs: 90_000 });
    const wt = response.result?.worktree;
    if (!response.ok || response._meta?.runtimeId !== workspace.runtimeId || wt?.repoId !== workspace.repoId || !wt.id || typeof wt.path !== 'string' || !isAbsolute(wt.path) || wt.hostId !== 'local') throw new Error('Orca did not confirm the created worktree identity.');
    workspace.path = wt.path; workspace.id = wt.id;
    const checked = await this.rpc('worktree.show', { worktree: 'path:' + wt.path });
    const actual = checked.result?.worktree;
    if (!checked.ok || checked._meta?.runtimeId !== workspace.runtimeId || actual?.id !== wt.id || actual.repoId !== workspace.repoId || actual.path !== wt.path || actual.hostId !== 'local') throw new Error('Created worktree could not be independently verified.');
    workspace.state = 'ready'; workspace.reason = 'Named Orca worktree created and revealed. Setup hooks skipped; no build authorized.';
  }
  capabilities(target?: OrcaTarget): OrcaCapabilities {
    if (target && target.kind !== 'native') return { deliverySupported: false, startSupported: this.available, reason: this.options.terminalTransport.unsupportedReason ?? 'Terminal notification is unsupported; explicitly start a native Orca chat.' };
    return { deliverySupported: this.available && !!this.sender, startSupported: this.available,
      reason: !this.available ? 'The installed native Orca runtime client is unavailable.' : !this.sender ? 'The service has no captured Orca sender handle. Restart it from its owning Orca agent session.' : undefined };
  }
  private async nativeTargets(): Promise<OrcaNativeTarget[]> {
    const response = await this.rpc('session.tabs.list', { worktree: 'path:' + this.workspacePath });
    if (!response.ok || !response._meta?.runtimeId || typeof response.result?.worktree !== 'string' || !response.result.worktree || !Array.isArray(response.result.tabs)) throw new Error('Native Orca session inventory is unavailable.');
    return response.result.tabs.filter((tab: any) => tab.type === 'agent-session' && typeof tab.sessionId === 'string' && ['claude', 'codex'].includes(tab.agent)).map((tab: any) => ({
      kind: 'native', sessionId: tab.sessionId, handle: tab.sessionId, runtimeId: response._meta!.runtimeId!, worktreeId: response.result.worktree,
      worktreePath: resolve(this.workspacePath), executionHostId: 'local', agentIdentity: tab.agent, ...(typeof tab.title === 'string' ? { title: tab.title } : {}),
    }));
  }
  async targets(): Promise<OrcaTarget[]> {
    const results = await Promise.allSettled([this.nativeTargets(), this.options.terminalTransport.targets()]);
    const found = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
    if (results.every(result => result.status === 'rejected')) throw new Error('Orca session inventory is unavailable.');
    return found;
  }
  async verify(target: OrcaTarget): Promise<OrcaVerification> {
    if (target.kind !== 'native') return this.options.terminalTransport.verify(target);
    if (resolve(target.worktreePath) !== resolve(this.workspacePath)) return { state: 'unavailable', reason: 'The native session belongs to another workspace.' };
    const current = (await this.nativeTargets()).find(item => sameNative(item, target));
    return current ? { target: current, state: 'ready' } : { state: 'unavailable', reason: 'The exact native Orca session, provider, workspace, or runtime is unavailable.' };
  }
  async send(target: OrcaTarget, message: string, requestId?: string): Promise<{ accepted: boolean; requestId?: string; stage?: string }> {
    if (target.kind !== 'native' || !this.sender || !requestId) throw new Error('Native notification needs an exact session, captured sender, and persisted request ID.');
    if ((await this.verify(target)).state !== 'ready') throw new Error('The native notification target changed.');
    const sender = await this.rpc('terminal.show', { terminal: this.sender });
    const actual = sender.result?.terminal;
    const source = await this.rpc('session.tabs.list', { worktree: 'path:' + this.options.workspacePath });
    if (!source.ok || source._meta?.runtimeId !== target.runtimeId || !sender.ok || sender._meta?.runtimeId !== target.runtimeId || actual?.handle !== this.sender || actual.worktreeId !== source.result?.worktree || resolve(actual.worktreePath ?? '') !== resolve(this.options.workspacePath)) throw new Error('The captured service sender cannot be verified in this Orca workspace.');
    const response = await this.rpc('orchestration.send', { from: this.sender, to: 'orca_session_id:' + target.sessionId, subject: 'Saved preparation status', body: message, type: 'status' }, { orchestrationRequestId: requestId });
    if (!response.ok || response._meta?.runtimeId !== target.runtimeId || !response.result?.message?.id || response.result.mutation?.requestId !== requestId) throw new Error('Native enqueue outcome is uncertain.');
    return { accepted: true, requestId, stage: 'durable_enqueue' };
  }
  async reveal(target: OrcaTarget): Promise<void> {
    if (target.kind !== 'native') {
      if (resolve(target.worktreePath) !== this.workspacePath) throw new Error('The terminal belongs to another workspace.');
      const shown = await this.rpc('terminal.show', { terminal: target.handle, expectedIncarnationId: target.incarnationId });
      const current = shown.result?.terminal;
      if (!shown.ok || shown._meta?.runtimeId !== target.runtimeId || !current?.connected || current.orphaned ||
          ['handle', 'ptyId', 'incarnationId', 'worktreeId', 'worktreePath', 'agentIdentity', 'executionHostId'].some(key => current[key] !== (target as unknown as Record<string, unknown>)[key])) throw new Error('The exact terminal session changed; refresh the session list.');
      const focused = await this.rpc('terminal.focus', { terminal: target.handle, expectedIncarnationId: target.incarnationId, navigation: 'host' });
      if (!focused.ok || focused._meta?.runtimeId !== target.runtimeId || focused.result?.focus?.handle !== target.handle || focused.result.focus.worktreeId !== target.worktreeId) throw new Error('Orca did not confirm the selected terminal navigation request.');
      const tabs = await this.rpc('session.tabs.list', { worktree: 'path:' + target.worktreePath });
      if (!tabs.ok || tabs._meta?.runtimeId !== target.runtimeId || !tabs.result?.tabs?.some((tab: any) => tab.type === 'terminal' && tab.terminal === target.handle && tab.incarnationId === target.incarnationId && tab.isActive === true)) throw new Error('Orca accepted navigation, but did not confirm that the selected CLI is visible. Open its terminal tab in the project sidebar; no new session was created.');
      return;
    }
    if ((await this.verify(target)).state !== 'ready') throw new Error('The exact native chat is unavailable; no replacement was created.');
    const response = await this.rpc('agentSession.reveal', { sessionId: target.sessionId });
    if (!response.ok || response._meta?.runtimeId !== target.runtimeId || response.result?.ok !== true ||
      response.result.sessionId !== target.sessionId || response.result.workspaceId !== target.worktreeId || response.result.agent !== target.agentIdentity || response.result.readable !== true) {
      throw new Error('Orca did not confirm revealing the exact chat. The created session is retained.');
    }
  }
  async prepareSession(provider: OrcaProvider, preference: OrcaModelPreference): Promise<OrcaLaunch> {
    const support = await this.rpc('agentSession.createSupport', { worktree: 'path:' + this.workspacePath, agent: provider });
    if (!support.ok || support.result?.supported !== true) throw new Error('This Orca workspace does not support the selected native provider.');
    const createParams = this.builders.create(provider, this.workspacePath);
    return { state: 'uncertain', provider, preference, sessionId: createParams.envelope.sessionId, createParams, optionRequests: [], reason: 'Create request recorded; no confirmed session result yet.' };
  }
  async launchSession(launch: OrcaLaunch, persist: () => Promise<void>): Promise<OrcaNativeTarget> {
    const created = await this.rpc('agentSession.create', launch.createParams);
    const result = mutation(created);
    if (result.value?.sessionId !== launch.sessionId) throw new Error('Created native session ID did not match its persisted create request.');
    launch.state = 'partial'; launch.fence = result.fence; launch.reason = 'Session created. Requested model and effort have not yet been accepted.'; await persist();
    const target = (await this.nativeTargets()).find(item => item.sessionId === launch.sessionId && item.agentIdentity === launch.provider && item.runtimeId === created._meta?.runtimeId);
    if (!target) throw new Error('Created native session is missing from the exact workspace inventory.');
    launch.target = target; await persist();
    for (const key of ['model', 'effort'] as const) {
      if ((await this.verify(target)).state !== 'ready') throw new Error('Native session identity changed during model configuration.');
      const operation = { params: this.builders.option(target.sessionId, key, launch.preference[key], launch.fence!) };
      launch.optionRequests.push(operation); await persist();
      const updated = await this.rpc('agentSession.setOption', operation.params);
      const applied = mutation(updated);
      if (updated._meta?.runtimeId !== target.runtimeId || applied.value?.key !== key || applied.value.value !== launch.preference[key]) throw new Error('Orca did not confirm the requested model option mutation.');
      launch.fence = applied.fence; (operation as { applied?: boolean }).applied = true; await persist();
    }
    const options = await this.rpc('agentSession.options', { sessionId: target.sessionId });
    const current = options.result?.current;
    if (!options.ok || options._meta?.runtimeId !== target.runtimeId || current?.effort !== launch.preference.effort) throw new Error('Native effort does not match the accepted request. The created session remains unpaired.');
    // Idle Claude reports a family alias (e.g. opus), with model confirmation deferred until a turn.
    // Exact setOption receipts above prove the requested preference was accepted, not provider execution.
    launch.modelConfirmation = 'pending-provider-turn'; await persist();
    if ((await this.verify(target)).state !== 'ready') throw new Error('Native session identity changed after model verification.');
    await this.reveal(target);
    return target;
  }
}
