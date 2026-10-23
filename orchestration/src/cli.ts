import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const help = `Product preparation — uses the same running service as the browser.
  status
  open                         Open the shared page in the default browser
  orca-open                    Open the shared page in Orca's workspace browser
  orca-targets                 List exact agent sessions in this workspace
  orca-status                  Show pairing and notification receipts
  orca-preferences --provider claude|codex [--model ID] [--effort low|medium|high]
  orca-start [--workspace-name NAME] Create a named Orca worktree and pair a native chat
  orca-attach --terminal HANDLE Pair an explicitly chosen owning session
  orca-detach
  orca-reveal [--terminal HANDLE] Open the connected chat or an explicitly selected existing session
  orca-resume --notification ID Recheck a definitely-unsent notification
  start --text TEXT | --file PATH --operation-id ID
  answer --text TEXT | --file PATH --id PREP --revision N --operation-id ID
  interview --id PREP --revision N --operation-id ID
  draft --id PREP --revision N --operation-id ID
  revise --text TEXT | --file PATH --id PREP --revision N --operation-id ID
  technical --text PREFERENCES | --file PATH --id PREP --revision N --operation-id ID
  select-technical --digest HASH --id PREP --revision N --operation-id ID
  plan --id PREP --revision N --operation-id ID
  review-plan --id PREP --revision N --operation-id ID
  packet
  artifact --kind prd|mockup|technical|build-plan|handoff
  factory [--story story-N]     Read locally cached diagnostics for an explicit story
  factory-package               Print the exact draft export; not factory authorization
Optional for every command: --url http://127.0.0.1:4317
JSON output. Draft/revise acceptance is not completion: inspect status afterwards.
Start the service with npm start in orchestration. No approval or build commands.
factory observations are non-authoritative and unverified for the exported package. Real dispatch is blocked.
For service diagnostics, set ORCH_FACTORY_REPO and ORCH_FACTORY_HARNESS_ROOT; optional ORCH_FACTORY_REMOTE (origin) and ORCH_FACTORY_CLI_PACKAGE. No fetch is performed.`;

export async function runCli(args: string[]): Promise<unknown> {
  if (args.length === 0 || args[0] === '--help' || args[0] === 'help') return { help };
  const [command, ...rest] = args;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const name = rest[i]; const value = rest[i + 1];
    if (!name.startsWith('--') || value === undefined || value.startsWith('--') || name in flags) throw new Error('Supply each named option once with its value. Use --file for text beginning with --.');
    flags[name] = value;
  }
  const allowed: Record<string, string[]> = {
    status: [], open: [], start: ['--text', '--file', '--operation-id'],
    'orca-open': [], 'orca-targets': [], 'orca-status': [], 'orca-attach': ['--terminal'],
    'orca-detach': [], 'orca-reveal': ['--terminal'], 'orca-resume': ['--notification'],
    'orca-preferences': ['--provider', '--model', '--effort'], 'orca-start': ['--workspace-name'],
    answer: ['--text', '--file', '--id', '--revision', '--operation-id'],
    interview: ['--id', '--revision', '--operation-id'],
    draft: ['--id', '--revision', '--operation-id'],
    revise: ['--text', '--file', '--id', '--revision', '--operation-id'],
    technical: ['--text', '--file', '--id', '--revision', '--operation-id'],
    'select-technical': ['--digest', '--id', '--revision', '--operation-id'],
    plan: ['--id', '--revision', '--operation-id'],
    'review-plan': ['--id', '--revision', '--operation-id'],
    packet: [], artifact: ['--kind'], factory: ['--story'], 'factory-package': [],
  };
  if (!allowed[command]) throw new Error(`Unknown command ${command}. No approval or dispatch commands exist. Use --help.`);
  for (const name of Object.keys(flags)) if (name !== '--url' && !allowed[command].includes(name)) throw new Error(`Unknown option ${name} for ${command}.`);
  const url = new URL(flags['--url'] ?? 'http://127.0.0.1:4317');
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use the local service origin http://127.0.0.1:PORT.');
  const request = async (path: string, options?: RequestInit) => {
    const response = await fetch(url.origin + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(path === '/api/orca/start' ? 180_000 : 15_000) });
    const text = await response.text();
    if (!response.ok) {
      let message = text;
      try { message = JSON.parse(text).error ?? text; } catch { /* non-JSON transport error */ }
      throw new Error(`HTTP ${response.status}: ${message}`);
    }
    return text;
  };
  if (command === 'status') return JSON.parse(await request('/api/preparation'));
  if (command === 'orca-status') return JSON.parse(await request('/api/orca'));
  if (command === 'orca-targets') return JSON.parse(await request('/api/orca/targets'));
  if (command === 'orca-open') {
    const connection = JSON.parse(await request('/api/orca'));
    const result = await promisify(execFile)('orca', ['tab', 'create', '--url', url.origin, '--worktree', `path:${connection.workspacePath}`, '--json'], { timeout: 15_000, maxBuffer: 1_000_000 });
    const receipt = JSON.parse(result.stdout);
    if (!receipt.ok) throw new Error('Orca did not confirm opening the preparation page.');
    return { url: url.origin, browserLaunchRequested: true, receipt, nextAction: 'Use the same saved preparation inside Orca. Opening is not approval or session pairing.' };
  }
  if (command === 'open') {
    await request('/api/preparation'); // Do not open a dead or different service silently.
    const launcher = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
    await promisify(execFile)(launcher, [url.origin], { timeout: 10_000 });
    return { url: url.origin, browserLaunchRequested: true, nextAction: 'The user can review or answer on the shared page. Read status to see saved changes; opening is not an approval.' };
  }
  if (command === 'packet') return JSON.parse(await request('/api/artifacts/packet'));
  if (command === 'factory') {
    const story = flags['--story'];
    if (story !== undefined && !/^story-[1-9][0-9]*$/.test(story)) throw new Error('Name the story as story-N.');
    return JSON.parse(await request('/api/factory' + (story === undefined ? '' : `?story=${story}`)));
  }
  if (command === 'factory-package') return JSON.parse(await request('/api/factory?include=package'));
  if (command === 'artifact') {
    if (!['prd', 'mockup', 'technical', 'build-plan', 'handoff'].includes(flags['--kind'])) throw new Error('Select --kind prd, mockup, technical, build-plan or handoff.');
    return { kind: flags['--kind'], content: await request('/api/artifacts/' + flags['--kind']) };
  }
  if (['orca-attach', 'orca-detach', 'orca-resume', 'orca-preferences', 'orca-start', 'orca-reveal'].includes(command)) {
    let body: object = command === 'orca-start' && flags['--workspace-name'] !== undefined ? { workspaceName: flags['--workspace-name'] } : {};
    if (command === 'orca-preferences') {
      const provider = flags['--provider'];
      if (!['claude', 'codex'].includes(provider)) throw new Error('Choose --provider claude or codex.');
      const saved = JSON.parse(await request('/api/orca')).preferences[provider];
      body = { provider, model: flags['--model'] ?? saved.model, effort: flags['--effort'] ?? saved.effort };
    }
    if (command === 'orca-attach') {
      if (!flags['--terminal']) throw new Error('Select an explicit --terminal handle from orca-targets.');
      const { targets } = JSON.parse(await request('/api/orca/targets'));
      const target = targets.find((candidate: { handle: string }) => candidate.handle === flags['--terminal']);
      if (!target) throw new Error('The chosen session is not present in this workspace.');
      body = { target, directPromptOptIn: true };
    }
    if (command === 'orca-reveal' && flags['--terminal']) {
      const { targets } = JSON.parse(await request('/api/orca/targets'));
      const target = targets.find((candidate: { handle: string }) => candidate.handle === flags['--terminal']);
      if (!target) throw new Error('The selected session is not present in this workspace.');
      body = { target };
    }
    if (command === 'orca-resume') {
      if (!flags['--notification']) throw new Error('Supply --notification with the saved receipt ID.');
      body = { notificationId: flags['--notification'] };
    }
    const page = await request('/');
    const token = /name="preparation-token" content="([a-f0-9]+)"/.exec(page)?.[1];
    if (!token) throw new Error('The preparation service did not supply its request token.');
    return JSON.parse(await request('/api/orca/' + command.slice(5), { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Preparation-Token': token, 'X-Preparation-Client': 'cli' }, body: JSON.stringify(body) }));
  }
  if (!flags['--operation-id']?.trim()) throw new Error('Supply --operation-id with a stable identifier. After uncertain delivery, inspect status before retrying.');
  const input: Record<string, unknown> = { operationId: flags['--operation-id'] };
  if (command !== 'start') {
    if (!flags['--id'] || !/^[1-9][0-9]*$/.test(flags['--revision'] ?? '') || !Number.isSafeInteger(Number(flags['--revision']))) throw new Error('Supply --id and --revision from the status you reviewed.');
    input.preparationId = flags['--id']; input.revision = Number(flags['--revision']);
  }
  if (['start', 'answer', 'revise', 'technical'].includes(command)) {
    if (('--text' in flags) === ('--file' in flags)) throw new Error('Supply exactly one of --text or --file.');
    input[command === 'start' ? 'idea' : command === 'answer' ? 'answer' : command === 'technical' ? 'preferences' : 'feedback'] = '--file' in flags ? await readFile(flags['--file'], 'utf8') : flags['--text'];
  }
  if (command === 'select-technical') {
    if (!/^[a-f0-9]{64}$/.test(flags['--digest'] ?? '')) throw new Error('Supply the exact --digest of the technical blueprint the user selected. This is a local selection, not a factory approval.');
    input.digest = flags['--digest'];
  }
  // The same local token used by the browser protects requests from foreign websites.
  // It is not a human approval credential. The CLI has no authority endpoints.
  const page = await request('/');
  const token = /name="preparation-token" content="([a-f0-9]+)"/.exec(page)?.[1];
  if (!token) throw new Error('The local preparation service did not supply its request token.');
  const route = command === 'start' ? 'preparation' : command === 'revise' ? 'changes' : command;
  return JSON.parse(await request('/api/' + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Preparation-Token': token, 'X-Preparation-Client': 'cli' }, body: JSON.stringify(input) }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const result = await runCli(process.argv.slice(2));
    console.log(JSON.stringify(result, null, 2));
    const state = (result as { preparation?: { stage: string } })?.preparation;
    if (state && ['failed', 'interrupted'].includes(state.stage)) process.exitCode = 1;
    const launch = (result as { launch?: { state: string } })?.launch;
    if (process.argv[2] === 'orca-start' && (launch?.state !== 'paired' || (result as { workspace?: { state: string } })?.workspace?.state === 'uncertain')) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error), nextAction: 'Inspect status to reconcile saved work. Do not blindly retry a mutation.' }));
    process.exitCode = 1;
  }
}
