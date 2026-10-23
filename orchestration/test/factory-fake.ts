// FAKE FACTORY ADAPTER — fixture only. It proves the dispatch contract and carries no authority.
// Nothing here reads or writes a real record, and no outcome it reports is evidence about the
// real factory. Real behaviour is observed by test/factory-real-route.mjs.
import { evaluateDispatch, mayDispatch } from '../src/factory.js';
import type { DispatchDecision, DispatchLedgerEntry, DispatchRequest, FactoryExportPackage, FactoryOutcome, FactoryPrerequisite, FactoryRoute, FactoryRouteState } from '../src/factory.js';

export const PREREQUISITE_IDS = ['gate-2-approval', 'gate-2-lock', 'harness-authored', 'harness-protected', 'test-command-locked', 'gate-3-approval', 'story-authorized', 'story-bytes-match'] as const;
export type PrerequisiteId = (typeof PREREQUISITE_IDS)[number];
/** Only these are things a person fixes with a command; the rest need work to exist first. */
const HUMAN_FIXABLE = new Set<PrerequisiteId>(['gate-2-approval', 'gate-2-lock', 'harness-protected', 'test-command-locked', 'gate-3-approval', 'story-authorized']);

export interface FakeExecution { operationId: string; story: string; packageDigest: string; factoryRef: string; candidate: string }

export class FakeFactoryRoute implements FactoryRoute {
  readonly label = 'FAKE FACTORY ADAPTER — fixture only, never real authority';
  readonly executions: FakeExecution[] = [];
  readonly ledger: DispatchLedgerEntry[] = [];
  private satisfied: Set<PrerequisiteId>;
  constructor(private readonly world: { satisfied?: PrerequisiteId[]; result?: 'succeeded' | 'failed' | 'uncertain'; candidate?: string; routeOutcome?: FactoryOutcome } = {}) {
    this.satisfied = new Set(world.satisfied ?? PREREQUISITE_IDS);
  }
  withdraw(id: PrerequisiteId): void { this.satisfied.delete(id); }

  async inspect(story: string): Promise<FactoryRouteState> {
    const prerequisites: FactoryPrerequisite[] = PREREQUISITE_IDS.map(id => {
      const ok = this.satisfied.has(id);
      return { id, satisfied: ok, requirement: `fixture requirement ${id}`, observed: ok ? `fixture: ${id} satisfied` : `fixture: ${id} is not satisfied`,
        ...(ok || !HUMAN_FIXABLE.has(id) ? {} : { humanAction: `fixture human action for ${id}` }) };
    });
    const missing = prerequisites.filter(p => !p.satisfied);
    const outcome: FactoryOutcome = this.world.routeOutcome ?? (missing.length === 0 ? 'ready' : missing.every(p => p.humanAction !== undefined) ? 'waiting-for-user' : 'blocked');
    return { outcome, readOnly: true, source: 'fixture', authority: 'fixture-only', packageBinding: 'fixture-only', observedAt: new Date().toISOString(), factoryVersion: 'fixture', recordsCommit: 'f'.repeat(40), trunkCommit: '0'.repeat(40), prerequisites,
      summary: missing.length === 0 ? `fixture: ${story} is authorized` : `fixture: ${missing.length} prerequisite(s) unmet for ${story}` };
  }

  async requestDispatch(request: DispatchRequest, pkg: FactoryExportPackage): Promise<{ decision: DispatchDecision; entry?: DispatchLedgerEntry }> {
    const state = await this.inspect(request.story);
    const decision = evaluateDispatch({ state, pkg, request, ledger: this.ledger });
    if (!mayDispatch(decision)) return { decision, ...(decision.existing === undefined ? {} : { entry: decision.existing }) };
    const factoryRef = `fixture-run-${this.executions.length + 1}`;
    const candidate = this.world.candidate ?? 'fixture-candidate-0123456789ab';
    this.executions.push({ operationId: request.operationId, story: request.story, packageDigest: request.packageDigest, factoryRef, candidate });
    const status = this.world.result ?? 'succeeded';
    const entry: DispatchLedgerEntry = { operationId: request.operationId, packageDigest: request.packageDigest, story: request.story, requestedAt: new Date().toISOString(), status, factoryRef,
      detail: status === 'succeeded' ? `fixture run ${factoryRef} verified candidate ${candidate}` : status === 'failed' ? `fixture run ${factoryRef} failed on candidate ${candidate}` : `fixture run ${factoryRef} returned no decisive result` };
    this.ledger.push(entry);
    const outcome: FactoryOutcome = status === 'succeeded' ? 'ready' : status === 'failed' ? 'failed' : 'uncertain';
    return { decision: { outcome, blockedBy: [], reasons: [`${entry.detail}. Reported from the factory reference ${factoryRef}, not from an agent's account of it.`] }, entry };
  }
}
