/**
 * The protected runner for the equipment-checkout API rows. Frozen at the S1 freeze and
 * read-only to every builder, S1's own included.
 *
 * Why a runner exists at all. The lock stores test commands as independent strings and
 * `verify` runs each one in its own `sh -c`, so nothing survives between them: no virtual
 * environment, no PYTHONPATH, no database URL. Eval plan section 7 is a single sequence
 * whose later steps depend on earlier ones (C2 builds the environment C3 and C5 run in; C4
 * exports the URL C5 reads), with a readiness wait, conditional steps and teardown that has
 * to run after a failure. One command invoking one runner is the only shape the lock can
 * hold; it is the same shape the meeting reminder's browser trial uses, and section 4 calls
 * that an application adapter.
 *
 * What it runs: C0 to C5 and C7 of section 7.2, which are the U and D rows, S1's own.
 * C6 (I rows), C8 and C9 (web) and C10 to C13 (stack and journey) belong to S2 to S4 and
 * join this runner when the trees they need exist.
 *
 * Two deliberate departures from section 7.2, both narrowing what can go wrong:
 *
 *   1. The database port is allocated by the kernel, not fixed at 55432. C1's port check
 *      exists because a container that fails to bind leaves someone else's database
 *      listening there and the D rows then run against the wrong store. An unpredictable
 *      port per run cannot collide, so the hazard is removed rather than detected. The
 *      container name carries the process id for the same reason.
 *   2. The URL the D rows read is computed here and passed to that one child process. It is
 *      never read from the ambient environment, so no setting a builder could arrange on a
 *      developer machine can point its own exam at a store it controls.
 *
 * Absent application, exit 0. On the trunk the application does not exist yet, and this
 * command is pinned on every pull request from the next lock onwards. A missing `api/app`
 * is reported as `skipped` and passes: the frozen tests are a standard for a candidate that
 * offers an implementation, not a reason to fail pod-factory's own work. The moment a
 * candidate adds `api/app`, every case below has to pass or this command fails. Deleting
 * `api/app` to reach that exit 0 deletes the deliverable with it.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const harnessApi = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(harnessApi, '../../../..');
const project = path.resolve(harnessApi, '../..');
const relative = (absolute) => path.relative(repoRoot, absolute);

const apiDir = path.join(project, 'api');
const reportsDir = path.join(repoRoot, '.factory/work/reports');
const junitDir = path.join(apiDir, 'reports');
const venv = path.join(project, '.eval-venv');
const container = `eval-pg-${process.pid}`;

const steps = [];
let database = null;

/** One child process, logged as a step, with the command line the report will carry. */
function run(label, command, argv, options = {}) {
  const shown = [command, ...argv].join(' ');
  console.log(`[${label}] ${shown}`);
  const result = spawnSync(command, argv, {
    cwd: options.cwd ?? repoRoot,
    stdio: options.capture === true ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: options.env ?? process.env,
    encoding: 'utf8',
  });
  const exitCode = result.error ? null : (result.status ?? null);
  steps.push({ step: label, command: shown, exitCode });
  if (result.error) {
    throw new Error(`${label} could not start ${command}: ${result.error.message}`);
  }
  if (exitCode !== 0 && options.tolerate !== true) {
    throw new Error(`${label} exited ${exitCode}: ${shown}`);
  }
  return { exitCode, stdout: (result.stdout ?? '').trim() };
}

/** The report is the evidence, so it is written whatever happened. */
function finish(outcome, detail) {
  mkdirSync(reportsDir, { recursive: true });
  const report = {
    runner: 'equipment-checkout/harness/api',
    evalPlan: 'docs/projects/equipment-checkout/prep/eval-plan.md section 7.2, C0-C5 and C7',
    rows: 'U and D',
    outcome,
    ...detail,
    steps,
    createdAt: new Date().toISOString(),
  };
  const file = path.join(reportsDir, `equipment-api-eval-${Date.now()}-${process.pid}.json`);
  writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`\nReport: ${relative(file)}`);
  return report;
}

/**
 * Cases and their outcomes from a JUnit file, by the row id conftest.py records as a
 * property.
 *
 * A module that fails to import is not a case. pytest writes it as a testcase with an empty
 * classname, a name that is the module's dotted path and an `<error message="collection
 * failure">` (eval plan 1.2: "an error entry named after the module, and no case per row"),
 * and it counts in the suite's `errors` and `tests` attributes like anything else. Counting
 * those as errored cases would be a lie in the dangerous direction: on the baseline, where
 * every module fails to import, the report would read as cases that merely erred rather than
 * as a tree that never ran. They are counted as collection errors and kept out of the case
 * list. pytest also abandons the run when any module fails to collect, so the cases of the
 * modules that did import are absent from the report; `collectionErrors` is what says so.
 */
function readJunit(file, tree) {
  if (!existsSync(file))
    return { tree, cases: [], collectionErrors: 1, collectionFailures: [], missing: true };
  const xml = readFileSync(file, 'utf8');
  const cases = [];
  const collectionFailures = [];
  for (const [, attributes, body] of xml.matchAll(
    /<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g,
  )) {
    const name = /\bname="([^"]*)"/.exec(attributes)?.[1] ?? '';
    const classname = /\bclassname="([^"]*)"/.exec(attributes)?.[1] ?? '';
    const inner = body ?? '';
    if (classname === '' && /<error\b[^>]*message="collection failure"/.test(inner)) {
      collectionFailures.push(name);
      continue;
    }
    const row = /<property name="row" value="([^"]*)"/.exec(inner)?.[1] ?? null;
    const status = /<failure\b/.test(inner)
      ? 'failed'
      : /<error\b/.test(inner)
        ? 'errored'
        : /<skipped\b/.test(inner)
          ? 'skipped'
          : 'passed';
    cases.push({ row, name, classname, status });
  }
  // A suite that reports errors it did not attribute to anything is still a tree that did not
  // run, so the count never falls below what the suite attribute claims.
  let attributed = 0;
  for (const [, attributes] of xml.matchAll(/<testsuite\b([^>]*?)>/g)) {
    attributed += Number(/\berrors="(\d+)"/.exec(attributes)?.[1] ?? 0);
  }
  const errored = cases.filter((one) => one.status === 'errored').length;
  const collectionErrors = Math.max(
    collectionFailures.length,
    attributed - errored,
    cases.length === 0 && attributed === 0 ? 1 : 0,
  );
  return { tree, cases, collectionErrors, collectionFailures, missing: false };
}

function main() {
  // C0. The JUnit directory is git-ignored output; the JSON report is the evidence verify collects.
  mkdirSync(junitDir, { recursive: true });

  if (!existsSync(path.join(apiDir, 'app'))) {
    finish('skipped', {
      reason: `${relative(path.join(apiDir, 'app'))} does not exist, so there is no implementation to judge. The frozen cases stand; nothing ran.`,
      cases: { total: 0, passed: 0, failed: 0, errored: 0, skipped: 0 },
    });
    console.log('Equipment API eval skipped: no application in this tree. Nothing to judge.');
    return 0;
  }

  // C1. Preconditions. Python 3.12 is the interpreter the pinned tool hashes were resolved
  // on; a different minor version is refused rather than quietly used.
  const python = ['python3.12', 'python3', 'python'].find((candidate) => {
    const probe = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
    return probe.status === 0 && /^Python 3\.12\./.test((probe.stdout || probe.stderr).trim());
  });
  if (python === undefined) {
    throw new Error(
      'C1: no Python 3.12 on PATH. Section 7.1 requires it and does not install it. The pinned test tools in harness/api/requirements-eval.txt were resolved on python:3.12-slim.',
    );
  }
  run('C1 python', python, ['--version']);
  run('C1 docker', 'docker', ['version', '--format', '{{.Server.Version}}'], { capture: true });

  // C2. A clean environment: the builder's own packages when it has a list, then the frozen
  // tools with --require-hashes AND --force-reinstall. Both flags are load-bearing; see
  // harness/api/requirements-eval.txt for why either alone is not enough.
  run('C2 venv', python, ['-m', 'venv', '--clear', venv]);
  const pip = path.join(venv, 'bin/python');
  const builderRequirements = path.join(apiDir, 'requirements.txt');
  if (existsSync(builderRequirements)) {
    run('C2 app deps', pip, ['-m', 'pip', 'install', '--quiet', '-r', builderRequirements]);
  }
  run('C2 frozen tools', pip, [
    '-m',
    'pip',
    'install',
    '--quiet',
    '--require-hashes',
    '--force-reinstall',
    '-r',
    path.join(harnessApi, 'requirements-eval.txt'),
  ]);

  // Plugin autoload is off for every pytest run below: a package the builder adds, carrying a
  // pytest11 entry point, is loaded however the pinned tools were installed, and one hook in
  // it can swallow every failure. A plugin a tree needs is named with -p instead.
  const pytestEnv = { ...process.env, PYTEST_DISABLE_PLUGIN_AUTOLOAD: '1', PYTHONPATH: apiDir };
  const pytest = (argv) => [
    '-m',
    'pytest',
    '-c',
    path.join(harnessApi, 'pytest.ini'),
    '--rootdir',
    apiDir,
    ...argv,
  ];

  // C3. U: the unit tree, with no database setting in the environment at all. The unit rows
  // must hold without one, so the two names are removed rather than left to chance.
  const unitEnv = { ...pytestEnv };
  delete unitEnv.DATABASE_URL;
  delete unitEnv.TEST_DATABASE_URL;
  const unitXml = path.join(junitDir, 'unit.xml');
  run('C3 unit', pip, pytest([path.join(apiDir, 'tests/unit'), '-q', `--junitxml=${unitXml}`]), {
    env: unitEnv,
    tolerate: true,
  });

  // C4. A real PostgreSQL 16 on a kernel-allocated port, waited for properly: the server
  // logs "ready to accept connections" once while initialising and again when it is actually
  // listening, so the second line is the one that means ready.
  run('C4 database', 'docker', [
    'run',
    '-d',
    '--name',
    container,
    '-e',
    'POSTGRES_USER=eval',
    '-e',
    'POSTGRES_PASSWORD=eval-only',
    '-e',
    'POSTGRES_DB=equipment_eval',
    '-p',
    '127.0.0.1::5432',
    'postgres:16',
  ]);
  database = container;
  const published = run('C4 port', 'docker', ['port', container, '5432/tcp'], { capture: true });
  const port = /:(\d+)\s*$/.exec(published.stdout.split('\n')[0] ?? '')?.[1];
  if (port === undefined) {
    throw new Error(`C4: could not read the published port from "${published.stdout}"`);
  }
  const deadline = Date.now() + 120_000;
  for (;;) {
    const logs = spawnSync('docker', ['logs', container], { encoding: 'utf8' });
    const ready =
      `${logs.stdout ?? ''}${logs.stderr ?? ''}`.split('ready to accept connections').length - 1;
    if (ready >= 2) break;
    if (Date.now() > deadline) throw new Error('C4: PostgreSQL was not ready within 120s');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
  }
  steps.push({ step: 'C4 ready', command: `docker logs ${container}`, exitCode: 0 });

  // C5. D: the store written to directly. The URL is computed and handed to this one child.
  const dbXml = path.join(junitDir, 'db.xml');
  run('C5 db', pip, pytest([path.join(apiDir, 'tests/db'), '-q', `--junitxml=${dbXml}`]), {
    env: {
      ...pytestEnv,
      TEST_DATABASE_URL: `postgresql+psycopg://eval:eval-only@127.0.0.1:${port}/equipment_eval`,
    },
    tolerate: true,
  });

  const trees = [readJunit(unitXml, 'unit'), readJunit(dbXml, 'db')];
  const cases = trees.flatMap((tree) => tree.cases.map((one) => ({ ...one, tree: tree.tree })));
  const count = (status) => cases.filter((one) => one.status === status).length;
  const collectionErrors = trees.reduce((total, tree) => total + tree.collectionErrors, 0);
  const totals = {
    total: cases.length,
    passed: count('passed'),
    failed: count('failed'),
    errored: count('errored'),
    skipped: count('skipped'),
    collectionErrors,
  };
  const green = collectionErrors === 0 && totals.total > 0 && totals.passed === totals.total;

  finish(green ? 'pass' : 'fail', {
    cases: totals,
    rowsPassed: cases
      .filter((one) => one.status === 'passed' && one.row !== null)
      .map((one) => one.row)
      .sort(),
    notPassed: cases
      .filter((one) => one.status !== 'passed')
      .map((one) => ({ row: one.row, tree: one.tree, name: one.name, status: one.status })),
    trees: trees.map((tree) => ({
      tree: tree.tree,
      cases: tree.cases.length,
      collectionErrors: tree.collectionErrors,
      collectionFailures: tree.collectionFailures,
      reportMissing: tree.missing,
    })),
    ...(collectionErrors > 0
      ? {
          note: 'A module that fails to import is a collection error, not a case, and pytest abandons the run when one occurs: the cases of modules that did import are absent from this report rather than passing.',
        }
      : {}),
  });

  if (!green) {
    console.error(
      `\nEquipment API eval failed: ${totals.passed}/${totals.total} cases passed, ` +
        `${totals.failed} failed, ${totals.errored} errored, ${collectionErrors} collection error(s).`,
    );
    return 1;
  }
  console.log(`\nEquipment API eval passed: ${totals.total} cases, every frozen row green.`);
  return 0;
}

let code = 1;
try {
  code = main();
} catch (error) {
  console.error(`\nEquipment API eval rejected: ${error.message}`);
  finish('error', { reason: error.message });
  code = 1;
} finally {
  // C7. Teardown runs whatever happened above, because verify stops at the first non-zero
  // command and would never reach a separate teardown step.
  if (database !== null) {
    spawnSync('docker', ['rm', '-f', database], { stdio: 'inherit' });
  }
}
process.exit(code);
