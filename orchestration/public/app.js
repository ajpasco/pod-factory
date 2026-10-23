'use strict';
const themes = new Set(['graphite', 'orca', 'clay', 'indigo']);
function applyTheme(value, save = false) {
  const theme = themes.has(value) ? value : 'graphite';
  document.documentElement.dataset.theme = theme;
  if (save) { try { localStorage.setItem('preparation-theme', theme); } catch {} }
}
try { applyTheme(localStorage.getItem('preparation-theme')); } catch { applyTheme('graphite'); }

const $ = (id) => document.getElementById(id);
let preparation = null;
let capabilities = {};
let submitting = false;
let timer;
let artifactKey = '';
let recoveryId = '';
let planningKey = '';
let preferencesId = '';
let orcaConnection = null;
let orcaTargets = [];
let orcaPreferencesLoaded = false;
let orcaStarting = false;
let viewedStep = null;
let viewedPreparationId = '';
let viewedTask = '';
let activeAction = '';
let displayedQuestion = '';
const stepNotes = ['Describe the product', 'One decision at a time', 'Draft and inspect the experience', 'Choose the approach', 'Plan checks and builder scope', 'Inspect gaps and draft handoff'];
const mutationButtons = 'form button, #interview-button, #interview-continue, #draft-button, #select-technical, #plan-button, #review-plan, #orca-start, #orca-discover, #orca-detach, #orca-resume';
function hasProductArtifacts() { return Boolean(preparation?.artifacts?.prd && preparation?.artifacts?.mockup); }
function hasTechnicalSelection() {
  const planning = preparation?.planning;
  return Boolean(planning?.technicalDecision && planning.technicalDecision.digest === planning.technical?.artifact.digest);
}
function availableSteps() {
  const answered = preparation?.interview ? preparation.interview.status === 'ready' : Boolean(preparation?.question?.answer?.trim());
  const technical = answered && hasProductArtifacts() && Boolean(capabilities.planning);
  return [true, Boolean(preparation), answered || hasProductArtifacts(), technical, technical && hasTechnicalSelection(), technical && hasTechnicalSelection() && Boolean(preparation?.planning?.plan)];
}
function defaultStep() {
  if (!preparation || preparation.task?.status === 'interrupted') return 1;
  const task = preparation.task;
  if (task && (isRunning() || task.status === 'failed')) return ({ 'product-interviewer': 2, 'product-drafter': 3, 'technical-author': 4, 'plan-author': 5, 'planning-reviewer': 6 })[task.role] || 3;
  if (preparation.interview) return preparation.interview.status === 'ready' && !preparation.planning ? 2 : preparation.interview.status !== 'ready' ? 2 : preparation.planning?.phase === 'planning-complete' ? 6 : hasTechnicalSelection() ? 5 : 4;
  const planning = preparation.planning;
  if (planning?.review) return 6;
  if (hasTechnicalSelection()) return 5;
  if (planning) return 4;
  return preparation.question?.answer?.trim() ? 3 : 2;
}
function reachableStep(step, available = availableSteps()) {
  while (step > 1 && !available[step - 1]) step--;
  return step;
}
function selectStep(step, focus = false) {
  const available = availableSteps();
  if (!available[step - 1]) return;
  viewedStep = step;
  renderRail(available);
  if (focus) document.querySelector(`[data-step="${step}"] .step-heading`).focus();
}
function renderRail(available = availableSteps()) {
  const planning = preparation?.planning;
  const complete = [Boolean(preparation), preparation?.interview ? preparation.interview.status === 'ready' : Boolean(preparation?.question?.answer?.trim()), hasProductArtifacts(), hasTechnicalSelection(), Boolean(planning?.plan), planning?.phase === 'planning-complete' && Boolean(planning?.handoff)];
  document.querySelectorAll('[data-step-target]').forEach(button => {
    const step = Number(button.dataset.stepTarget);
    button.disabled = !available[step - 1];
    button.classList.toggle('done', complete[step - 1]);
    button.dataset.complete = String(complete[step - 1]);
    button.querySelector('.step-mark').textContent = complete[step - 1] ? '✓' : String(step);
    button.querySelector('.step-note').textContent = step === viewedStep ? "You're here" : complete[step - 1] ? ['Saved', 'Answered', 'Drafts prepared', 'Selected locally', 'Plan prepared', 'Review recorded'][step - 1] : available[step - 1] ? stepNotes[step - 1] : step === 4 && hasProductArtifacts() && !capabilities.planning ? 'Planning provider unavailable' : 'Complete the preceding work';
    if (step === viewedStep) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
  document.querySelectorAll('[data-step]').forEach(panel => { panel.hidden = Number(panel.dataset.step) !== viewedStep; });
}
function selectArtifactTab(tab, focus = false) {
  document.querySelectorAll('[role="tab"]').forEach(item => {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    $(item.getAttribute('aria-controls')).hidden = !selected;
  });
  if (focus) tab.focus();
}
function toggleSession(open, restoreFocus = false) {
  $('orca-connection').hidden = !open;
  $('session-toggle').setAttribute('aria-expanded', String(open));
  if (restoreFocus) $('session-toggle').focus();
}

const busyStatuses = new Set(['queued', 'running', 'in-progress', 'pending']);
const describe = (value) => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return value.prompt || value.message || value.text || value.description || value.title || value.summary || JSON.stringify(value);
};
const row = (title, note, pill) => ({ __row: true, title, note, pill });
function list(id, values, empty) {
  const items = Array.isArray(values) ? values : values ? [values] : [];
  $(id).replaceChildren(...(items.length ? items : [empty]).map((value) => {
    const li = document.createElement('li');
    if (!value || value.__row !== true) { li.textContent = describe(value); return li; }
    li.className = 'row-item';
    const main = document.createElement('span');
    main.className = 'row-main';
    const title = document.createElement('span');
    title.className = 'row-title';
    title.textContent = value.title;
    main.append(title);
    if (value.note) {
      const note = document.createElement('span');
      note.className = 'row-note';
      note.textContent = value.note;
      main.append(note);
    }
    li.append(main);
    if (value.pill) {
      const pill = document.createElement('span');
      pill.className = 'pill';
      pill.textContent = value.pill;
      li.append(pill);
    }
    return li;
  }));
}
async function request(path, body) {
  const options = body === undefined ? {} : { method: 'POST', headers: {
    'Content-Type': 'application/json',
    'X-Preparation-Token': document.querySelector('meta[name="preparation-token"]').content,
    'X-Preparation-Client': 'browser',
  }, body: JSON.stringify(body) };
  const response = await fetch(path, { ...options, cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(describe(result.error || result.message || result));
  return result;
}
function isRunning() { return busyStatuses.has(preparation?.task?.status) || preparation?.planning?.correction?.status === 'running'; }
function renderOrca() {
  const connection = orcaConnection;
  const target = connection?.attachment?.target;
  $('orca-status').textContent = target ? `Paired with ${target.agentIdentity} · ${target.title || target.handle} · ${target.kind === 'native' ? 'native chat' : 'terminal session'}` : 'No owning Orca session is paired. Notifications are off.';
  $('orca-capability').textContent = connection?.error || (connection?.capabilities?.deliverySupported === false ? `Automatic wake-up unavailable: ${connection.capabilities.reason}` : 'A notification receipt confirms delivery to Orca only, not completed work or approval.');
  if (!orcaPreferencesLoaded && connection?.preferences) {
    $('orca-provider').value = connection.preferredProvider; loadOrcaPreset(); orcaPreferencesLoaded = true;
  }
  const project = connection?.workspace;
  if (project) $('orca-workspace-name').value = project.name;
  $('orca-workspace-name').disabled = Boolean(project) || orcaStarting;
  $('orca-workspace-status').textContent = project ? `Workspace ${project.name}: ${project.state}. ${project.reason}` : target ? 'This chat is in the existing workspace. Disconnect it first to create a named project worktree; the chat will be preserved.' : 'A named worktree will appear in Orca’s project sidebar. Setup scripts and builders will not run.';
  const savedPreset = connection?.preferences?.[connection.preferredProvider];
  if (savedPreset) $('orca-start').textContent = `Start workspace + ${connection.preferredProvider} · ${savedPreset.model} · ${savedPreset.effort}`;
  $('orca-start').disabled = submitting || isRunning() || orcaStarting || Boolean(target) || Boolean(connection?.launch && connection.launch.state !== 'paired') || project?.state === 'uncertain' || connection?.capabilities?.startSupported !== true;
  $('orca-launch').textContent = orcaStarting ? 'Creating the project workspace, then connecting the selected chat…' : connection?.launch ? `Session creation: ${connection.launch.state}. ${connection.launch.reason || 'Inspect the saved session before starting anything else.'}` : 'Name the project and save agent preferences before starting. The workspace and chat are preparation only; no build is authorized.';
  $('orca-reveal').hidden = target?.kind !== 'native' && !connection?.launch?.target;
  $('orca-detach').hidden = !target;
  const last = connection?.receipts?.at(-1);
  $('orca-receipt').textContent = last ? `Notification for revision ${last.revision}: ${last.state}. ${last.reason}` : 'No saved notifications.';
  $('orca-resume').hidden = !last || last.state !== 'pending' || connection?.capabilities?.deliverySupported === false;
}
function loadOrcaPreset() {
  const preset = orcaConnection?.preferences?.[$('orca-provider').value];
  if (preset) { $('orca-model').value = preset.model; $('orca-effort').value = preset.effort; }
}
async function refreshOrca() {
  try { orcaConnection = await request('/api/orca'); renderOrca(); }
  catch (error) { $('orca-status').textContent = `Orca connection unavailable: ${error.message}`; }
}
function render(actionStep) {
  const preparationId = preparation?.id || '';
  const taskKey = preparation?.task ? `${preparation.task.id}:${preparation.task.status}` : '';
  const newPreparation = preparationId !== viewedPreparationId;
  const taskChanged = taskKey !== viewedTask;
  if (viewedStep === null || newPreparation) viewedStep = defaultStep();
  else if (taskChanged && (isRunning() || ['failed', 'interrupted'].includes(preparation?.task?.status))) viewedStep = defaultStep();
  if (Number.isInteger(actionStep)) viewedStep = preparation?.task?.status === 'interrupted' ? 1 : actionStep;
  viewedPreparationId = preparationId;
  viewedTask = taskKey;
  viewedStep = reachableStep(viewedStep);
  renderRail();
  if (Number.isInteger(actionStep)) document.querySelector(`[data-step="${viewedStep}"] .step-heading`).focus();
  if (newPreparation) { artifactKey = ''; planningKey = ''; }
  $('theme').value = document.documentElement.dataset.theme;
  const interrupted = preparation?.task?.status === 'interrupted';
  $('intake').hidden = Boolean(preparation) && !interrupted;
  $('intake-title').textContent = interrupted ? 'Start a separate preparation' : preparation ? 'Your product idea' : 'What do you want to build?';
  $('saved-idea').hidden = !preparation;
  $('project-name').textContent = preparation?.idea || 'From your idea to a build plan.';
  $('project-name').title = preparation?.idea || '';
  $('revision').textContent = preparation ? `Revision ${preparation.revision}` : 'No preparation yet';
  document.querySelectorAll(mutationButtons).forEach(button => { button.disabled = submitting || isRunning(); });
  renderOrca();
  $('recovery-info').hidden = !interrupted;
  $('idea-form').querySelector('button').textContent = interrupted ? 'Start separate preparation' : 'Start preparation';
  if (interrupted && recoveryId !== preparation.id) {
    recoveryId = preparation.id;
    $('idea').value = preparation.idea;
  }
  $('workspace').hidden = !preparation;
  if (!preparation) {
    $('technical-button').disabled = true;
    return;
  }
  const p = preparation;
  $('stage').textContent = p.interview && p.interview.status !== 'ready' ? 'requirements interview' : describe(p.planning?.phase || p.stage).replace(/[-_]/g, ' ');
  $('revision').textContent = `Revision ${p.revision}`;
  $('next-action').textContent = describe(p.nextAction) || 'Review the current preparation.';
  $('idea-summary').textContent = describe(p.idea);
  const q = p.question;
  $('question-section').hidden = !q || Boolean(p.interview && p.interview.status !== 'asking');
  if (q) {
    if (displayedQuestion !== q.id) { displayedQuestion = q.id; $('answer').value = ''; }
    $('question-prompt').textContent = q.prompt;
    const answered = typeof q.answer === 'string' && q.answer.trim().length > 0;
    $('answer-form').hidden = answered;
    $('saved-answer').hidden = !answered;
    $('saved-answer').textContent = answered ? `Your answer: ${q.answer}` : '';
  }
  const interview = p.interview;
  $('interview-section').hidden = !capabilities.interviewing;
  $('interview-button').hidden = interview?.status === 'asking' || interview?.status === 'ready';
  $('interview-button').disabled ||= interrupted;
  $('interview-reason').textContent = interview?.reason || (interview ? 'We’ll ask only about material decisions not settled by your idea and answers.' : 'This draft used the earlier single-question flow. Review remaining requirements before treating it as complete.');
  list('interview-history', (interview?.answers || []).map(a => `${a.prompt} — ${a.answer}`), '');
  $('interview-summary').textContent = interview?.status === 'ready' ? interview.summary : '';
  $('interview-continue').hidden = interview?.status !== 'ready';
  list('scope', p.confirmedScope, 'No scope confirmed yet.');
  list('proposals', p.proposals, 'No additional proposals.');
  list('findings', p.findings, 'No findings recorded.');
  $('findings-section').hidden = !p.findings?.length;
  const planningFindings = [...(p.planning?.technical?.findings || []), ...(p.planning?.plan?.findings || []), ...(p.planning?.review?.findings || [])];
  const blockers = [...(p.blockers || []), ...(p.findings || []).filter(f => f.severity === 'blocking' && !f.resolved).map(describe), ...planningFindings.filter(f => f.severity === 'blocking' && !f.resolved).map(describe)];
  list('blockers', blockers, '');
  $('blockers-section').hidden = blockers.length === 0;
  $('workspace').dataset.attention = String(isRunning() || ['failed', 'interrupted'].includes(p.task?.status) || (blockers.length > 0 && !p.planning?.handoff));
  $('provider').textContent = capabilities.drafting === false ? 'Drafting is unavailable. Configure the drafting provider to continue.' : `Drafting provider: ${describe(capabilities.provider) || 'configured provider'}`;
  const task = p.task;
  const roles = { 'product-interviewer': [2, 'Reviewing your requirements'], 'product-drafter': [3, 'Preparing the PRD and mockup'], 'technical-author': [4, 'Preparing your blueprint'], 'plan-author': [5, 'Preparing evals and stories'], 'planning-reviewer': [6, 'Reviewing the plan'] };
  const pendingRole = ({ '/api/interview': 'product-interviewer', '/api/draft': 'product-drafter', '/api/changes': 'product-drafter', '/api/technical': 'technical-author', '/api/plan': 'plan-author', '/api/review-plan': 'planning-reviewer' })[activeAction];
  const role = submitting && pendingRole ? pendingRole : task?.role;
  const activity = roles[role];
  document.querySelectorAll('[data-task-feedback]').forEach(element => {
    element.hidden = !activity || Number(element.dataset.taskFeedback) !== activity[0];
    if (element.hidden) return;
    const elapsed = task?.startedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(task.startedAt)) / 1000)) : 0;
    element.textContent = submitting && pendingRole ? `${activity[1]}… Requesting the task.` : isRunning() ? `${activity[1]}… ${elapsed}s elapsed. This page updates automatically; no need to click again.` : task?.status === 'completed' ? `${activity[1]} — complete. Review the result below.` : `${activity[1]} — ${task?.status}. ${task?.failure || ''}`;
    element.setAttribute('aria-busy', String(isRunning()));
  });
  $('task-status').textContent = task ? `Draft task: ${describe(task.status)}${task.failure ? ` — ${describe(task.failure)}` : ''}` : '';
  const hasArtifacts = hasProductArtifacts();
  $('draft-button').classList.toggle('secondary', hasArtifacts);
  document.querySelector('[data-step="3"]').dataset.hasArtifacts = String(hasArtifacts);
  $('artifacts-section').hidden = !hasArtifacts;
  const prdRef = p.artifacts?.prd;
  const mockupRef = p.artifacts?.mockup;
  $('artifact-revision').textContent = [prdRef && `PRD revision ${prdRef.revision} · ${prdRef.digest.slice(0, 12)}`, mockupRef && `Mockup revision ${mockupRef.revision} · ${mockupRef.digest.slice(0, 12)}`].filter(Boolean).join(' / ');
  $('packet-status').textContent = p.reviewPacket ? 'Draft review packet prepared. Formal gate approval is not available in this workspace.' : 'The review packet has not been prepared yet.';
  $('draft-button').textContent = isRunning() && p.task?.role === 'product-drafter' ? 'Drafting…' : hasArtifacts ? 'Regenerate drafts' : 'Create the drafts';
  document.querySelectorAll('.next-hint').forEach(hint => { hint.textContent = `Next: ${describe(p.nextAction) || 'Review the current preparation.'}`; });
  $('continue-blueprint').disabled = !availableSteps()[3];

  $('draft-button').disabled ||= capabilities.drafting === false || !q?.answer || interrupted || Boolean(interview && interview.status !== 'ready');
  $('changes-form').querySelector('button').disabled ||= capabilities.drafting === false || interrupted;
  const planning = p.planning;
  $('technical-section').hidden = !hasArtifacts || !capabilities.planning;
  if (preferencesId !== p.id) { preferencesId = p.id; $('technical-preferences').value = planning?.preferences || ''; }
  $('technical-button').textContent = (isRunning() && task?.role === 'technical-author') || (submitting && activeAction === '/api/technical') ? 'Preparing blueprint…' : planning?.technical ? 'Revise the blueprint' : 'Prepare the blueprint';
  $('technical-button').disabled ||= interrupted || !hasArtifacts || !capabilities.planning;
  $('technical-result').hidden = !planning?.technical;
  if (planning?.technical) {
    $('technical-summary').textContent = `${planning.technical.stack} · ${planning.technical.layers} responsibility layer(s) · ${planning.technical.artifact.digest.slice(0, 12)}`;
    list('technical-decisions', planning.technical.decisions.map(d => row(describe(d.decision), describe(d.rationale), d.topic)));
    list('technical-findings', planning.technical.findings.map(f => row(describe(f.description), f.basis ? describe(f.basis) : '', f.severity)), 'No blueprint findings recorded.');
    $('technical-selection').textContent = hasTechnicalSelection() ? 'This exact blueprint is selected for local planning.' : 'Review the blueprint. Change your preferences above if needed, or select this version.';
  }
  $('select-technical').hidden = hasTechnicalSelection();
  $('select-technical').disabled ||= interrupted || !planning?.technical || planning.technical.findings.some(f => f.severity === 'blocking' && !f.resolved);
  $('plan-section').hidden = !hasTechnicalSelection();
  $('plan-button').textContent = planning?.plan ? 'Regenerate evals and stories from review feedback' : 'Prepare evals and stories';
  $('plan-button').disabled ||= interrupted || !hasTechnicalSelection() || !capabilities.planning;
  $('plan-result').hidden = !planning?.plan;
  if (planning?.plan) {
    $('stat-coverage').textContent = String(planning.plan.coverage.filter(c => c.status === 'covered').length);
    $('stat-evals').textContent = String(planning.plan.evals.length);
    $('stat-stories').textContent = String(planning.plan.stories.length);
    list('plan-coverage', planning.plan.coverage.map(c => row(describe(c.requirementId), describe(c.reason), c.status)));
    list('plan-evals', planning.plan.evals.map(e => row(`${e.id} · ${describe(e.expected)}`, `Evidence: ${e.evidence}. Requirements: ${e.requirements.join(', ')}.`, e.kind)));
    list('plan-stories', planning.plan.stories.map(s => row(`${s.id}: ${describe(s.title)}`, `Depends on: ${s.dependsOn.join(', ') || 'none'}. Scope: ${s.scope.join(', ')}.`, s.parallelGroup ? `Parallel ${s.parallelGroup}` : 'Sequential')));
  }
  $('review-plan').disabled ||= interrupted || !planning?.plan;
  $('handoff-section').hidden = !planning;
  $('planning-phase').textContent = planning ? `Planning: ${planning.phase.replace(/-/g, ' ')}` : '';
  $('handoff-title').textContent = planning?.phase === 'planning-complete' && planning?.handoff ? 'Planning complete · builder dispatch is blocked' : 'Planning review';
  list('planning-findings', [...(planning?.technical?.findings || []), ...(planning?.plan?.findings || []), ...(planning?.review?.findings || [])].map(f => row(describe(f.description), f.basis ? describe(f.basis) : '', f.severity)), 'No findings recorded for this planning step.');
  $('planning-correction').textContent = planning?.correction?.reason || '';
  $('handoff-result').hidden = !planning?.handoff;
  const nextPlanningKey = JSON.stringify([planning?.technical?.artifact, planning?.plan?.artifact, planning?.handoff]);
  if (!isRunning() && nextPlanningKey !== planningKey) {
    planningKey = nextPlanningKey;
    for (const [kind, element, ref] of [['technical', 'technical-content', planning?.technical?.artifact], ['build-plan', 'plan-content', planning?.plan?.artifact], ['handoff', 'handoff-content', planning?.handoff]]) {
      if (ref) loadPlanningArtifact(kind, element, nextPlanningKey); else $(element).textContent = '';
    }
  }
  if (hasArtifacts && !isRunning()) {
    const key = JSON.stringify(p.artifacts);
    if (key !== artifactKey) {
      artifactKey = key;
      $('mockup').src = `/api/artifacts/mockup?revision=${encodeURIComponent(p.revision)}`;
      loadProductArtifact('prd', 'prd', key);
      if (p.reviewPacket) loadProductArtifact('packet', 'packet-content', key);
    }
  }
}
async function loadPlanningArtifact(kind, element, key) {
  try {
    const response = await fetch(`/api/artifacts/${kind}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('The saved planning artifact could not be loaded.');
    const content = await response.text();
    if (planningKey === key) $(element).textContent = content;
  } catch (error) { if (planningKey === key) $(element).textContent = error.message; }
}
async function loadProductArtifact(kind, element, key) {
  try {
    const response = await fetch(`/api/artifacts/${kind}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('The saved product artifact could not be loaded.');
    const content = await response.text();
    if (artifactKey === key) $(element).textContent = content;
  } catch (error) { if (artifactKey === key) $(element).textContent = error.message; }
}
async function refresh(actionStep) {
  clearTimeout(timer);
  try {
    const result = await request('/api/preparation');
    preparation = result.preparation;
    capabilities = result.capabilities || {};
    render(actionStep);
    void refreshOrca();
    if (isRunning()) timer = setTimeout(refresh, 1200);
  } catch (error) {
    showError(error.message);
    if (isRunning()) timer = setTimeout(refresh, 3000);
  }
}
function showError(message) { $('error').textContent = message; $('error').hidden = false; }
async function mutate(path, body) {
  if (submitting || isRunning()) return;
  submitting = true;
  activeAction = path;
  $('error').hidden = true;
  $('notice').textContent = '';
  render();
  document.querySelectorAll(mutationButtons).forEach((button) => { button.disabled = true; });
  try {
    await request(path, { ...body, operationId: crypto.randomUUID(), ...(path !== '/api/preparation' && preparation ? { preparationId: preparation.id } : {}) });
    const actionStep = path === '/api/answer' && preparation?.interview ? 2 : ({ '/api/preparation': 2, '/api/interview': 2, '/api/answer': 3, '/api/draft': 3, '/api/changes': 3, '/api/technical': 4, '/api/select-technical': 5, '/api/plan': 5, '/api/review-plan': 6 })[path];
    await refresh(actionStep);
    if (path === '/api/changes') $('feedback').value = '';
    return true;
  } catch (error) {
    showError(error.message);
    await refresh();
    return false;
  } finally {
    submitting = false;
    activeAction = '';
    document.querySelectorAll(mutationButtons).forEach((button) => { button.disabled = false; });
    render();
  }
}
function initialize() {
  for (const step of [2, 3, 4, 5, 6]) {
    const activity = document.createElement('p'); activity.className = 'callout'; activity.dataset.taskFeedback = String(step); activity.hidden = true;
    activity.setAttribute('role', 'status'); activity.setAttribute('aria-live', 'polite');
    document.querySelector(`[data-step="${step}"] .lead`).after(activity);
  }
  $('theme').value = document.documentElement.dataset.theme;
  $('theme').addEventListener('change', () => applyTheme($('theme').value, true));
  $('session-toggle').addEventListener('click', () => toggleSession($('orca-connection').hidden));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !$('orca-connection').hidden) { event.preventDefault(); toggleSession(false, true); }
  });
  document.querySelectorAll('[data-step-target]').forEach(button => button.addEventListener('click', () => selectStep(Number(button.dataset.stepTarget), true)));
  $('continue-blueprint').addEventListener('click', () => selectStep(4, true));
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectArtifactTab(tab));
    tab.addEventListener('keydown', event => {
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : null;
      if (next !== null) { event.preventDefault(); selectArtifactTab(tabs[next], true); }
    });
  });
  $('idea-form').addEventListener('submit', async (event) => { event.preventDefault(); const idea = $('idea').value.trim(); if (idea && await mutate('/api/preparation', { idea }) && preparation.interview) await mutate('/api/interview', { revision: preparation.revision }); });
  $('answer-form').addEventListener('submit', async (event) => { event.preventDefault(); const answer = $('answer').value.trim(); if (answer && await mutate('/api/answer', { answer, revision: preparation.revision }) && preparation.interview) await mutate('/api/interview', { revision: preparation.revision }); });
  $('interview-button').addEventListener('click', () => mutate('/api/interview', { revision: preparation.revision }));
  $('interview-continue').addEventListener('click', () => selectStep(3, true));
  $('draft-button').addEventListener('click', () => mutate('/api/draft', { revision: preparation.revision }));
  $('changes-form').addEventListener('submit', (event) => { event.preventDefault(); const feedback = $('feedback').value.trim(); if (feedback) mutate('/api/changes', { feedback, revision: preparation.revision }); });
  $('technical-form').addEventListener('submit', (event) => { event.preventDefault(); const preferences = $('technical-preferences').value.trim(); if (preferences) mutate('/api/technical', { preferences, revision: preparation.revision }); });
  $('select-technical').addEventListener('click', async () => {
    const selected = await mutate('/api/select-technical', { digest: preparation.planning.technical.artifact.digest, revision: preparation.revision });
    if (selected) await mutate('/api/plan', { revision: preparation.revision });
  });
  $('plan-button').addEventListener('click', () => mutate('/api/plan', { revision: preparation.revision }));
  $('review-plan').addEventListener('click', () => mutate('/api/review-plan', { revision: preparation.revision }));
  $('orca-provider').addEventListener('change', loadOrcaPreset);
  $('orca-preferences-form').addEventListener('submit', async event => {
    event.preventDefault();
    try {
      orcaConnection = await request('/api/orca/preferences', { provider: $('orca-provider').value, model: $('orca-model').value.trim(), effort: $('orca-effort').value });
      $('orca-preferences-saved').textContent = `Saved: ${orcaConnection.preferredProvider} · ${$('orca-model').value.trim()} · ${$('orca-effort').value}. Existing sessions unchanged.`;
      renderOrca();
    } catch (error) { showError(error.message); }
  });
  $('orca-start').addEventListener('click', async () => {
    if (orcaStarting) return;
    const workspaceName = $('orca-workspace-name').value.trim();
    if (!workspaceName || !$('orca-workspace-name').checkValidity()) { showError('Enter a project workspace name using letters, numbers, spaces, hyphens or underscores.'); return; }
    orcaStarting = true; renderOrca();
    try { orcaConnection = await request('/api/orca/start', { workspaceName }); }
    catch (error) { showError(error.message); }
    finally { orcaStarting = false; await refreshOrca(); }
  });
  $('orca-reveal').addEventListener('click', async () => {
    try { await request('/api/orca/reveal', {}); } catch (error) { showError(error.message); }
  });
  $('orca-discover').addEventListener('click', async () => {
    try {
      const result = await request('/api/orca/targets'); orcaTargets = result.targets;
      $('orca-target').replaceChildren(...orcaTargets.map(target => {
        const option = document.createElement('option'); option.value = target.handle;
        option.textContent = `${target.agentIdentity} · ${target.title || target.handle} · ${target.kind === 'native' ? 'native chat' : 'terminal'} · ${target.worktreePath}`; return option;
      }));
      $('orca-attach-form').hidden = orcaTargets.length === 0;
      if (!orcaTargets.length) $('orca-status').textContent = 'No eligible agent sessions found in this workspace.';
    } catch (error) { showError(error.message); }
  });
  $('orca-open-selected').addEventListener('click', async () => {
    const target = orcaTargets.find(target => target.handle === $('orca-target').value);
    if (!target) { showError('Refresh the session list and choose a session.'); return; }
    try { await request('/api/orca/reveal', { target }); } catch (error) { showError(error.message); }
  });
  $('orca-attach-form').addEventListener('submit', async event => {
    event.preventDefault();
    try { await request('/api/orca/attach', { target: orcaTargets.find(target => target.handle === $('orca-target').value), directPromptOptIn: true }); await refreshOrca(); }
    catch (error) { showError(error.message); }
  });
  $('orca-detach').addEventListener('click', async () => {
    try { await request('/api/orca/detach', {}); await refreshOrca(); } catch (error) { showError(error.message); }
  });
  $('orca-resume').addEventListener('click', async () => {
    try { await request('/api/orca/resume', { notificationId: orcaConnection.receipts.at(-1).id }); await refreshOrca(); } catch (error) { showError(error.message); }
  });
  refresh();
}
document.addEventListener('DOMContentLoaded', initialize, { once: true });
