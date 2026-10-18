import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, lstatSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyReport } from './report-contract.mjs';
const web = fileURLToPath(new URL('../', import.meta.url));
const reports = path.resolve(web, '../../../../.factory/work/reports');
mkdirSync(reports, { recursive: true });
const report = path.join(reports, `browser-trial-${Date.now()}-${process.pid}.json`);
const dependencies = path.join(web, 'node_modules');
if (existsSync(dependencies) && lstatSync(dependencies).isSymbolicLink()) unlinkSync(dependencies);
const install = spawnSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', path.join(reports, 'npm-cache')], { cwd: web, stdio: 'inherit' });
if (install.error || install.status !== 0) {
  console.error('Protected trial rejected: dependency installation failed');
  process.exit(1);
}
const browserArgs = [path.join(web, 'node_modules/@playwright/test/cli.js'), 'install', 'chromium'];
if (process.platform === 'linux') browserArgs.push('--with-deps');
const browser = spawnSync(process.execPath, browserArgs, { cwd: web, stdio: 'inherit' });
if (browser.error || browser.status !== 0) {
  console.error('Protected trial rejected: Chromium provisioning failed');
  process.exit(1);
}
const run = spawnSync(process.execPath, [path.join(web, 'node_modules/@playwright/test/cli.js'), 'test', '--config', path.join(web, 'playwright.config.ts')], {
  cwd: web, stdio: 'inherit', env: { ...process.env, TRIAL_REPORT_FILE: report },
});
try {
  if (run.error || run.status !== 0) throw new Error(`Playwright exited ${run.status}: ${run.error || ''}`);
  verifyReport(JSON.parse(readFileSync(report, 'utf8')));
  console.log(`Protected trial passed: 38 tests. Fresh report: ${report}`);
} catch (error) {
  console.error(`Protected trial rejected: ${error.message}. Report: ${report}`);
  process.exitCode = 1;
}
