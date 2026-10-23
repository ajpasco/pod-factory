import { DraftInput, DraftOutput, DraftProvider, WorkflowError } from './types.js';
export type { DraftInput, DraftOutput, DraftProvider } from './types.js';

/** The provider authors content; this adapter only bounds and validates its result. */
export async function runBoundedDraft(provider: DraftProvider, input: DraftInput): Promise<DraftOutput> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const output = await Promise.race([
      Promise.resolve().then(() => provider.draft(structuredClone(input), controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new WorkflowError('DRAFT_TIMEOUT', 'Draft execution limit reached; outcome unresolved.')); }, input.executionLimitMs);
      }),
    ]);
    if (!output || typeof output.prdMarkdown !== 'string' || !output.prdMarkdown.trim() || typeof output.mockupHtml !== 'string' || !output.mockupHtml.trim() ||
      output.prdMarkdown.length > 500_000 || output.mockupHtml.length > 1_000_000 || !Array.isArray(output.proposals) || !Array.isArray(output.findings) ||
      output.proposals.some(p => !p || typeof p.id !== 'string' || typeof p.description !== 'string') ||
      output.findings.some(f => !f || typeof f.id !== 'string' || typeof f.description !== 'string' || !['blocking', 'advisory'].includes(f.severity) || (f.resolved !== undefined && typeof f.resolved !== 'boolean'))) {
      throw new WorkflowError('INVALID_DRAFT', 'Provider must return a complete PRD, separate mockup, proposals and concrete findings.');
    }
    return output;
  } finally { if (timer) clearTimeout(timer); }
}
