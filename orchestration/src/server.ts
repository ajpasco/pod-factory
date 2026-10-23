import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WorkflowService, WorkflowError, type DraftProvider, type PlanningProvider } from './workflow.js';
import { ClaudeDraftProvider } from './claude-provider.js';
import { ClaudePlanningProvider } from './claude-planning-provider.js';
import { PreparationStore } from './store.js';
import { OrcaBridge, type OrcaTransport } from './orca-bridge.js';
import { buildExportPackage, configureFactoryDiagnostics, factoryDiagnosticsConfigFromEnv, type FactoryDiagnosticsConfig, type FactoryRoute, type FactoryRouteState } from './factory.js';
import type { Preparation } from './types.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const publicRoot = resolve(packageRoot, 'public');
const shellCsp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
const mockupCsp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; sandbox allow-scripts";

export async function createPreparationServer(options: { dataDir: string; provider: DraftProvider; planningProvider?: PlanningProvider; providerLabel?: string; executionLimitMs?: number; orcaTransport?: OrcaTransport; workspacePath?: string; factoryRoute?: FactoryRoute; factoryDiagnostics?: FactoryDiagnosticsConfig }) {
  const diagnostics = configureFactoryDiagnostics(options.factoryDiagnostics);
  const factoryRoute = options.factoryRoute ?? diagnostics.route;
  const factoryConfiguration = options.factoryRoute ? { status: 'configured', summary: 'Explicitly injected read-only route; fixture routes carry no real authority.' } : diagnostics.configuration;
  const dataDir = resolve(options.dataDir);
  await mkdir(dataDir, { recursive: true });
  const service = new WorkflowService({ dataDir, provider: options.provider, planningProvider: options.planningProvider, executionLimitMs: options.executionLimitMs ?? 180_000 });
  const workspacePath = resolve(options.workspacePath ?? dirname(packageRoot));
  const bridge = new OrcaBridge({ store: new PreparationStore(dataDir), transport: options.orcaTransport, workspacePath });
  let notificationError: string | undefined;
  function notifyBrowser(req: IncomingMessage, preparation: Preparation, event: 'answer-saved' | 'task-finished', origin: string) {
    // Client provenance prevents notification loops; it is not human identity or approval.
    if (req.headers['x-preparation-client'] !== 'browser') return;
    void bridge.notify(preparation, event, origin).then(() => { notificationError = undefined; }, () => {
      notificationError = 'Preparation saved, but its Orca notification could not be recorded. Check the local bridge state before retrying.';
      console.error(notificationError);
    });
  }
  const token = randomBytes(32).toString('hex');
  const pointer = resolve(dataDir, 'active.json');
  let creating = false;
  // This first slice supports one service process per data directory.
  async function currentId(): Promise<string | null> {
    try {
      const active = JSON.parse(await readFile(pointer, 'utf8'));
      if (typeof active.id !== 'string') throw new Error('Invalid active preparation pointer.');
      return active.id;
    } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  }
  function send(res: ServerResponse, code: number, content: string, type = 'application/json; charset=utf-8') {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': type.startsWith('text/html') ? shellCsp : "default-src 'none'; frame-ancestors 'none'" });
    res.end(content);
  }
  async function body(req: IncomingMessage): Promise<Record<string, unknown>> {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new WorkflowError('CONTENT_TYPE', 'Send JSON for preparation actions.', 415);
    let raw = '';
    for await (const chunk of req) { raw += chunk.toString(); if (raw.length > 64_000) throw new WorkflowError('BODY_TOO_LARGE', 'This action is too large.', 413); }
    try { const value = JSON.parse(raw); if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(); return value; }
    catch { throw new WorkflowError('INVALID_JSON', 'The action is not a JSON object.', 400); }
  }
  const server = createServer(async (req, res) => {
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Server is not listening.');
      const host = `127.0.0.1:${address.port}`;
      if (req.headers.host !== host) throw new WorkflowError('HOST', `Open this preparation at http://${host}.`, 403);
      const origin = `http://${host}`;
      if (req.headers.origin && req.headers.origin !== origin) throw new WorkflowError('ORIGIN', 'Cross-origin preparation requests are refused.', 403);
      if (req.headers['sec-fetch-site'] === 'cross-site') throw new WorkflowError('ORIGIN', 'Cross-site preparation requests are refused.', 403);
      const url = new URL(req.url ?? '/', origin);
      if (req.method === 'GET') {
        if (url.pathname === '/api/orca') {
          send(res, 200, JSON.stringify({ ...await bridge.status(), ...(notificationError ? { error: notificationError } : {}) })); return;
        }
        if (url.pathname === '/api/orca/targets') {
          send(res, 200, JSON.stringify({ targets: await bridge.targets(), workspacePath: (await bridge.status()).workspacePath })); return;
        }
        if (url.pathname === '/walkthrough') {
          const content = await readFile(resolve(packageRoot, 'examples/orca-prebuild-walkthrough.html'), 'utf8');
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': mockupCsp,
            'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }); res.end(content); return;
        }
        if (url.pathname === '/api/preparation') {
          const id = await currentId();
          send(res, 200, JSON.stringify({ preparation: id ? await service.get(id) : null, capabilities: { drafting: true, interviewing: Boolean(options.provider.interview), planning: Boolean(options.planningProvider), provider: options.providerLabel ?? 'configured provider' } })); return;
        }
        if (url.pathname === '/api/factory') {
          const id = await currentId(); if (!id) throw new WorkflowError('NOT_FOUND', 'Start a preparation first.', 404);
          const state = await service.get(id);
          let exported: { manifestDigest: string; stories: string[]; preparationRevision: number } | null = null;
          let exportRefusal: string | undefined;
          try { const pkg = buildExportPackage(state); exported = { manifestDigest: pkg.manifestDigest, stories: pkg.stories.map(story => story.id), preparationRevision: pkg.preparationRevision }; }
          catch (error) { exportRefusal = error instanceof WorkflowError ? error.message : 'The reviewed package could not be exported.'; }
          if (url.searchParams.get('include') === 'package') { send(res, 200, JSON.stringify(buildExportPackage(state), null, 2) + '\n'); return; }
          const story = url.searchParams.get('story');
          if (story !== null && !/^story-[1-9][0-9]*$/.test(story)) throw new WorkflowError('FACTORY_STORY', 'Name an explicit story as story-N.', 400);
          const route: FactoryRouteState = story !== null && factoryRoute !== undefined ? await factoryRoute.inspect(story) : {
            outcome: 'blocked', readOnly: true, source: 'none', authority: 'non-authoritative', packageBinding: 'unverified', observedAt: new Date().toISOString(),
            summary: factoryRoute === undefined ? factoryConfiguration.summary : 'Select an explicit story-N for locally cached diagnostics; no story is selected automatically.',
            prerequisites: [], observations: [], factoryVersion: null, recordsCommit: null, trunkCommit: null,
          };
          send(res, 200, JSON.stringify({ story, package: exported, ...(exportRefusal === undefined ? {} : { exportRefusal }), configuration: factoryConfiguration, route,
            dispatch: { implemented: false, note: 'Read-only diagnostics and draft export only. Cached observations do not authorize this package; real dispatch is blocked.' } })); return;
        }
        if (['/api/artifacts/prd', '/api/artifacts/mockup', '/api/artifacts/packet', '/api/artifacts/technical', '/api/artifacts/build-plan', '/api/artifacts/handoff'].includes(url.pathname)) {
          const id = await currentId(); if (!id) throw new WorkflowError('NOT_FOUND', 'Start a preparation first.', 404);
          const kind = url.pathname.split('/').at(-1) as 'prd' | 'mockup' | 'packet' | 'technical' | 'build-plan' | 'handoff';
          const content = await service.readArtifact(id, kind);
          if (kind === 'mockup') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': mockupCsp,
              'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' }); res.end(content);
          } else send(res, 200, content, ['packet', 'handoff'].includes(kind) ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8');
          return;
        }
        // Self-hosted woff2 only: one directory, one extension, no path segments, read as bytes.
        if (url.pathname.startsWith('/fonts/')) {
          const name = url.pathname.slice('/fonts/'.length);
          if (!/^[A-Za-z0-9-]+\.woff2$/.test(name)) throw new WorkflowError('NOT_FOUND', 'This preparation route does not exist.', 404);
          const font = await readFile(resolve(publicRoot, 'fonts', name)).catch((error: NodeJS.ErrnoException) => {
            if (error.code === 'ENOENT') throw new WorkflowError('NOT_FOUND', 'This preparation route does not exist.', 404);
            throw error;
          });
          res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" });
          res.end(font); return;
        }
        const staticFiles: Record<string, [string, string]> = { '/': ['index.html', 'text/html; charset=utf-8'], '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };
        const file = staticFiles[url.pathname];
        if (file) {
          let content = await readFile(resolve(publicRoot, file[0]), 'utf8');
          if (url.pathname === '/') content = content.replace('<meta name="preparation-token" content="">', `<meta name="preparation-token" content="${token}">`);
          send(res, 200, content, file[1]); return;
        }
        throw new WorkflowError('NOT_FOUND', 'This preparation route does not exist.', 404);
      }
      if (req.method !== 'POST') throw new WorkflowError('METHOD', 'Method not supported.', 405);
      if (req.headers['x-preparation-token'] !== token) throw new WorkflowError('TOKEN', 'Reload the preparation page before submitting this action.', 403);
      if (!['/api/preparation', '/api/answer', '/api/interview', '/api/draft', '/api/changes', '/api/technical', '/api/select-technical', '/api/plan', '/api/review-plan', '/api/orca/attach', '/api/orca/detach', '/api/orca/resume', '/api/orca/preferences', '/api/orca/start', '/api/orca/reveal'].includes(url.pathname)) throw new WorkflowError('NOT_FOUND', 'No approval or dispatch action is available here.', 404);
      const input = await body(req);
      if (url.pathname === '/api/orca/preferences') {
        send(res, 200, JSON.stringify(await bridge.setPreferences(input as unknown as Parameters<OrcaBridge['setPreferences']>[0]))); return;
      }
      if (url.pathname === '/api/orca/reveal') { send(res, 200, JSON.stringify(await bridge.reveal(input.target as Parameters<OrcaBridge['reveal']>[0]))); return; }
      if (url.pathname === '/api/orca/start') { send(res, 200, JSON.stringify(await bridge.startSession({ workspaceName: input.workspaceName as string | undefined }))); return; }
      if (url.pathname === '/api/orca/attach') {
        send(res, 200, JSON.stringify(await bridge.attach({ target: input.target as Parameters<OrcaBridge['attach']>[0]['target'], directPromptOptIn: input.directPromptOptIn as true }))); return;
      }
      if (url.pathname === '/api/orca/detach') { send(res, 200, JSON.stringify(await bridge.detach())); return; }
      if (url.pathname === '/api/orca/resume') { send(res, 200, JSON.stringify(await bridge.resume(input.notificationId as string))); return; }
      const operationId = typeof input.operationId === 'string' ? input.operationId : randomUUID();
      if (url.pathname === '/api/preparation') {
        if (creating) throw new WorkflowError('ALREADY_EXISTS', 'A preparation is already being created. Refresh to resume it.');
        creating = true;
        try {
          const existingId = await currentId();
          if (existingId && (await service.get(existingId)).task?.status !== 'interrupted') {
            throw new WorkflowError('ALREADY_EXISTS', 'A saved preparation already exists. Resume it rather than replacing its answers.');
          }
          const preparation = await service.create({ idea: input.idea as string, operationId });
          const temporary = `${pointer}.${randomUUID()}.tmp`;
          await writeFile(temporary, JSON.stringify({ id: preparation.id }), { mode: 0o600 }); await rename(temporary, pointer);
          send(res, 201, JSON.stringify({ preparation }));
        } finally { creating = false; }
        return;
      }
      const id = await currentId(); if (!id) throw new WorkflowError('NOT_FOUND', 'Start a preparation first.', 404);
      if (input.preparationId !== undefined && input.preparationId !== id) throw new WorkflowError('PREPARATION_CHANGED', 'The active preparation changed. Read status before submitting to it.');
      if (!Number.isInteger(input.revision)) throw new WorkflowError('REVISION', 'Supply the saved preparation revision.', 400);
      const mutation = { expectedRevision: input.revision as number, operationId };
      if (url.pathname === '/api/answer') {
        const preparation = await service.answer(id, { ...mutation, answer: input.answer as string });
        notifyBrowser(req, preparation, 'answer-saved', origin);
        send(res, 200, JSON.stringify({ preparation })); return;
      }
      if (url.pathname === '/api/select-technical') {
        send(res, 200, JSON.stringify({ preparation: await service.acceptTechnical(id, { ...mutation, digest: input.digest as string }) })); return;
      }
      // Validate synchronously visible prerequisites; workflow repeats them under its per-project queue.
      const before = await service.get(id);
      if (before.revision !== mutation.expectedRevision || before.task?.status === 'running' || before.task?.status === 'interrupted') throw new WorkflowError('STALE_OR_BUSY', 'Refresh the saved preparation; it changed or has an unresolved task.');
      if (url.pathname !== '/api/interview' && !before.question.answer) throw new WorkflowError('ANSWER_REQUIRED', 'Answer the product question before drafting.');
      if (url.pathname === '/api/changes' && (typeof input.feedback !== 'string' || !input.feedback.trim() || !before.artifacts.prd)) throw new WorkflowError('CHANGE_REQUIRED', 'Review the initial draft and describe the requested change.', 400);
      const work = url.pathname === '/api/interview' ? service.interview(id, mutation)
        : url.pathname === '/api/technical' ? service.technical(id, { ...mutation, preferences: input.preferences as string })
        : url.pathname === '/api/plan' ? service.plan(id, mutation)
        : url.pathname === '/api/review-plan' ? service.reviewPlan(id, mutation)
        : url.pathname === '/api/draft' ? service.draft(id, mutation) : service.requestChanges(id, { ...mutation, feedback: input.feedback as string });
      // Wait until the workflow has durably started, without holding the request for the model.
      let finished = false, failure: unknown;
      void work.then(state => { finished = true; notifyBrowser(req, state, 'task-finished', origin); }, error => { finished = true; failure = error; });
      for (let n = 0; n < 100; n++) {
        const state = await service.get(id);
        if (failure) throw failure;
        if (state.task?.operationId === operationId || finished) { send(res, 202, JSON.stringify({ preparation: state })); return; }
        await new Promise(done => setTimeout(done, 10));
      }
      send(res, 202, JSON.stringify({ message: 'Draft requested. Refresh to reconcile its saved status.' }));
    } catch (error) {
      const known = error instanceof WorkflowError;
      send(res, known ? error.status : 500, JSON.stringify({ error: known ? error.message : 'Preparation could not be read or saved. Check the local server log; no completion is claimed.' }));
      if (!known) console.error(error instanceof Error ? error.message : error);
    }
  });
  return { server, service };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dataDir = resolve(process.env.ORCH_DATA_DIR ?? resolve(packageRoot, '.preparation'));
  const port = Number(process.env.ORCH_PORT ?? 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('ORCH_PORT must be between 1024 and 65535.');
  const provider = new ClaudeDraftProvider({ workingRoot: resolve(dataDir, 'provider-work'), model: process.env.ORCH_MODEL });
  const planningProvider = new ClaudePlanningProvider({ workingRoot: resolve(dataDir, 'provider-work'), model: process.env.ORCH_MODEL });
  const { server } = await createPreparationServer({ dataDir, provider, planningProvider, providerLabel: `Claude CLI (${process.env.ORCH_MODEL ?? 'sonnet'})`, factoryDiagnostics: factoryDiagnosticsConfigFromEnv(process.env) });
  server.listen(port, '127.0.0.1', () => console.log(`Preparation: http://127.0.0.1:${port}\nData: ${dataDir}\nDrafting and review only; trusted approvals and dispatch are not implemented.`));
}
