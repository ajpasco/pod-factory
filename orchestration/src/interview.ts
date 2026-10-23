import { DraftProvider, InterviewInput, InterviewOutput, WorkflowError } from './types.js';

export const interviewInstructions = `Interview the user to establish a small product's requirements before drafting its PRD.
Use the idea, confirmedScope and previous answers as authority. Findings are unapproved draft observations, not user decisions. Never turn a suggestion or a previous mockup choice into a requirement.
Check the primary journey, roles and permissions, important business rules, data/integrations, applicable failure states, and what observable outcome means done. Do not ask a checklist mechanically: skip what is already clear, ask only what changes product behavior or makes the journey testable. Technical implementation choices belong in the blueprint.
Return ONE concise question at a time, with a brief reason explaining the decision it resolves. Offer concrete alternatives in the question when helpful, but do not choose for the user. Do not repeat answered questions; if an answer is ambiguous, explain exactly what remains unclear. Optional improvements stay out of scope and never delay the interview.
When the supplied scope and answers settle the material decisions, return question: null and a concise summary of confirmed scope and exclusions for the user to review before requesting drafts. Do not invent requirements to fill the summary. This is a product interview, not gate approval. You have no tools.`;

export const interviewSchema = {
  type: 'object', additionalProperties: false, required: ['question', 'reason', 'summary'],
  properties: { question: { type: ['string', 'null'] }, reason: { type: 'string' }, summary: { type: 'string' } },
};

export function validateInterview(output: InterviewOutput, input: InterviewInput): void {
  if (!output || typeof output.reason !== 'string' || !output.reason.trim() || output.reason.length > 4000 ||
      typeof output.summary !== 'string' || output.summary.length > 12000 ||
      (output.question !== null && (typeof output.question !== 'string' || !output.question.trim() || output.question.length > 4000)) ||
      (output.question === null && !output.summary.trim())) throw new WorkflowError('INVALID_INTERVIEW', 'The interviewer did not return a question or a scope summary. Nothing was accepted.');
  const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();
  if (output.question && input.answers.some(answer => normalize(answer.prompt) === normalize(output.question!))) {
    throw new WorkflowError('REPEATED_QUESTION', 'The interviewer repeated an answered question. Your answers are saved; no question was accepted.');
  }
}

export async function runInterview(provider: DraftProvider, input: InterviewInput): Promise<InterviewOutput> {
  if (!provider.interview) throw new WorkflowError('INTERVIEW_UNAVAILABLE', 'The configured provider does not support requirements interviews.', 503);
  const controller = new AbortController(); let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const output = await Promise.race([
      Promise.resolve().then(() => provider.interview!(structuredClone(input), controller.signal)),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new WorkflowError('DRAFT_TIMEOUT', 'Interview timed out; outcome unresolved.')); }, input.executionLimitMs); }),
    ]);
    validateInterview(output, input); return output;
  } finally { if (timer) clearTimeout(timer); }
}
