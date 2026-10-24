// Frozen configuration for mechanism C (eval plan 7.4). Read-only to every builder.
//
// Command C8 runs it from the project root as
//   harness/web/node_modules/.bin/vitest run --root web --config <this file>
//   --reporter=junit --outputFile=web/reports/component.xml
// so Vite's root is the client's own folder (`web/`) while every test tool is installed
// here, in `harness/web`. The branch's own scripts and the builder's `web/vite.config.js`
// test block are never used (eval plan 7.2).
//
// That split is the whole reason this file is as long as it is. `web/` is not a descendant
// of `harness/web`, so Node's own resolution from a file under `web/tests/component/`
// never reaches `harness/web/node_modules`: a bare `import ... from 'react'` or
// `'@testing-library/react'` in a frozen test fails to resolve, and Vite reports it as a
// file that does not exist. Eval plan section 2, item 4 records this as the
// harness-construction detail to settle when the harness is built. It is settled here, by
// aliasing each tool specifier to the copy installed in this folder.

import { createRequire } from 'node:module';
import path from 'node:path';

import { defineConfig } from 'vitest/config';

const here = import.meta.dirname;
const projectRoot = path.resolve(here, '..', '..');
const require = createRequire(import.meta.url);

const packageNameOf = (specifier) => {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

/** The first file an exports entry offers for an ESM importer. */
const esmEntry = (node) => {
  if (typeof node === 'string') return node;
  if (node !== null && typeof node === 'object') {
    for (const condition of ['import', 'module', 'default']) {
      if (condition in node) {
        const found = esmEntry(node[condition]);
        if (found !== null) return found;
      }
    }
  }
  return null;
};

/**
 * The file a specifier resolves to inside this folder's own node_modules, taking the
 * package's ESM entry where it has one.
 *
 * Reading the `exports` map is required, not fussiness: `require.resolve` honours the
 * `require` condition, and some of these tools ship a CommonJS build there that calls
 * `require('vitest')`, which Vitest refuses with "cannot be imported in a CommonJS module".
 * A package with no `exports` map falls back to plain resolution.
 */
const toolFile = (specifier) => {
  const name = packageNameOf(specifier);
  const subpath = specifier === name ? '.' : `.${specifier.slice(name.length)}`;
  // Not every package exports its own package.json, so the folder is found by resolving
  // the package and walking up to the directory `node_modules/<name>`.
  const marker = path.join('node_modules', ...name.split('/'));
  let folder = path.dirname(require.resolve(name, { paths: [here] }));
  while (!folder.endsWith(marker)) {
    const parent = path.dirname(folder);
    if (parent === folder) {
      return require.resolve(specifier, { paths: [here] });
    }
    folder = parent;
  }
  const manifestPath = path.join(folder, 'package.json');
  const manifest = require(manifestPath);
  const entry = manifest.exports === undefined ? null : esmEntry(manifest.exports[subpath] ?? null);
  if (entry !== null) return path.join(path.dirname(manifestPath), entry);
  return require.resolve(specifier, { paths: [here] });
};

/** An alias that pins one exact specifier to the copy installed here. */
const pin = (specifier) => ({
  find: new RegExp(`^${specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  replacement: toolFile(specifier),
});

export default defineConfig({
  resolve: {
    // Pinning React to one file is load-bearing, not hygiene. Two copies of React in one
    // module graph make every hook in the rendered page throw "Invalid hook call", and the
    // message names neither copy. Eval plan 7.4 pins "one copy of React 18.3" for this.
    // The client's own `src/App.jsx` and the test tools both land on these files.
    dedupe: ['react', 'react-dom'],
    alias: [
      pin('react'),
      pin('react/jsx-runtime'),
      pin('react/jsx-dev-runtime'),
      pin('react-dom'),
      pin('react-dom/client'),
      pin('react-dom/test-utils'),
      pin('@testing-library/react'),
      pin('@testing-library/dom'),
      pin('@testing-library/user-event'),
      pin('@testing-library/jest-dom/vitest'),
    ],
  },

  // Vite refuses to serve a file outside the workspace root it detects, and with
  // `--root web` that detection does not cover the sibling `harness/web`. Both folders are
  // named so that a frozen test and the tools it loads can be read.
  server: { fs: { allow: [projectRoot] } },

  // The client is JavaScript with the automatic JSX runtime (blueprint 12.10: no
  // TypeScript, blueprint 12.7: `src/App.jsx`). Vite's own default for a `.jsx` file is the
  // classic transform, which needs `React` in scope; the blueprint does not require the
  // builder to import it, so the transform is pinned here rather than inherited from the
  // builder's Vite configuration, which these commands never read.
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },

  test: {
    // jsdom has no layout engine. That is why a C row applies only checks (1) and (2) of
    // the inline-message placement (eval plan 1.1); checks (3) and (4) are the B rows'.
    environment: 'jsdom',
    globals: false,
    include: ['tests/component/**/*.test.js'],
    // `tests/browser/**` holds the B rows, which Playwright runs under C9, and `web/dist`
    // is a build output. Neither may ever be collected here.
    exclude: ['**/node_modules/**', 'tests/browser/**', 'dist/**'],
    setupFiles: [path.join(projectRoot, 'web', 'tests', 'component', '_setup.js')],
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    // The client reads its base from `import.meta.env.VITE_API_BASE_URL`, falling back to
    // `/api` (blueprint 12.7). The frozen value is pinned here so that the fake server sees
    // one base whatever the builder's `.env` files say.
    env: { VITE_API_BASE_URL: '/api' },
    reporters: ['default', 'junit'],
    outputFile: {
      junit: path.join(projectRoot, 'web', 'reports', 'component.xml'),
    },
  },
});
