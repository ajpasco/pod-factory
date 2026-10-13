import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Every test, and every process a test starts, sees the same plain git: no system or user
// configuration (signing, hooks paths, default branches), one known identity.
const home = mkdtempSync(join(tmpdir(), 'pod-factory-git-home-'));
const config = join(home, 'gitconfig');
writeFileSync(
  config,
  [
    '[user]',
    '\tname = Test Human',
    '\temail = human@example.test',
    '[init]',
    '\tdefaultBranch = main',
    '[advice]',
    '\tdetachedHead = false',
    '',
  ].join('\n'),
);
process.env.GIT_CONFIG_GLOBAL = config;
process.env.GIT_CONFIG_NOSYSTEM = '1';
delete process.env.POD_FACTORY_TEST_KILL_AT;
