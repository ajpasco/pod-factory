#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { processIO } from './commands/common.js';
import { run } from './run.js';

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return await rl.question(question);
  } finally {
    rl.close();
  }
}

process.exitCode = await run(process.argv.slice(2), processIO(process.cwd(), ask));
