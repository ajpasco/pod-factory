# Preparation workspace presentation — technical spec

Status: build-ready local UI contract. Authorizes preparation of this bounded change, not a factory gate, live agent dispatch, merge or deployment. Target builders: `gpt-6.1-sol`, reasoning `high`.

## 1. Outcome and authority

Make the existing preparation journey understandable through the six-step layout in [THEME-SPEC.md](THEME-SPEC.md) and [workspace mockup](mockups/workspace.html). Preserve the real workflow, saved work, technical choice and factory boundary. The user's accepted review corrections are incorporated below; this spec resolves conflicts with the illustrative mockup and original theme spec. Existing backend contracts remain authoritative for business behavior.

| ID | Required outcome | Authority |
| --- | --- | --- |
| UI-01 | Six focused panels, accurate progress rail, header revision and collapsed Session drawer | Theme spec §§4–5 |
| UI-02 | Navigation is read-only; progress comes from saved work, and revisiting a panel highlights that panel | Accepted review corrections 1–3 |
| UI-03 | Generate and inspect the blueprint, then explicitly select its exact digest before generating evals/stories | Existing workflow; accepted correction 1 |
| UI-04 | Running work, errors, blocking findings and interrupted-work recovery remain visible and usable | Existing behavior; accepted correction 2 |
| UI-05 | Four themes, Graphite default, browser-only preference and functional storage/network fallback | Theme spec §§1–3; accepted correction 5 |
| UI-06 | Keyboard-operable tabs/drawer/rail, visible focus and usable 390px layout | Theme spec §6 |
| UI-07 | All existing Orca settings/actions/receipts remain available with unchanged effects | Theme spec §4; existing integration |
| UI-08 | No added product capability, authority or external network dependency; retain test meaning. Only the approved local-font route may change the backend | Theme scope; accepted corrections 4–5 |
| UI-09 | Preserve warnings and distinguish proposals, draft plans and review evidence from approvals/results | Theme spec §5; accepted wording correction |

This is not the whole pre-build orchestration backlog. Trusted human approvals, executable app-test generation, factory onboarding/dispatch, automatic continuation, model comparisons and production deployment stay out of scope.

## 2. Architecture and edit boundary

Keep the existing Node/TypeScript service, plain HTML/CSS/browser JavaScript and Playwright tests. Presentation ownership transferred to Claude by Jay: `public/index.html`, `public/style.css` and presentation-only `public/app.js`, relative to `orchestration/`. Sol and Codex leave these files to Claude during refinement. Jay subsequently chose self-hosted IBM Plex fonts; the narrow exception below records that decision.

- HTML owns semantic regions and controls; CSS owns layout/tokens; JavaScript projects existing saved state into those regions and invokes the existing actions.
- A few named view helpers in `app.js` are sufficient: derive available/default panels, select a panel, render the rail, select an artifact tab and apply a theme. Do not add a router, component framework, state library, event bus, generic wizard engine or extra service layer.
- Preserve existing action IDs, input IDs, request bodies, endpoints, operation IDs, digest binding, polling/reconciliation and provider behavior. Reorganize DOM placement and presentational labels only.
- Packages/lockfiles, CLI behavior, factory records/settings/workflows, mockup sandbox and CSP remain unchanged. The sole backend exception is `GET /fonts/<name>.woff2` in `src/server.ts`: binary same-origin assets, restricted filenames, missing or invalid names return 404.
- Self-host the three IBM Plex Sans/Mono WOFF2 assets under `public/fonts/`. Retain fallbacks; Geist remains a local/system fallback in the Orca theme. No Google Fonts link, external request, new dependency, `.env` entry, Docker service or secret. This supersedes the original no-bundled-font rule; it does not permit other backend changes. Verify real font loading, not merely a CSS family declaration or geometry. Preserve the original baseline in `evidence/theme-font-review/baseline-before.json` when refreshing the local manifest.

Tests may adapt existing browser selectors and explicit navigation, as described in the build plan. Acceptance assertions and backend tests are not builder-editable merely to make the UI pass.

## 3. Six views over the existing workflow

The rail is `nav[aria-label="Preparation steps"]`. Its six real buttons have `data-step-target="1"` through `"6"`. Each panel wrapper has matching `data-step="1"` through `"6"`. Exactly one step panel is visible. Global status, errors and recovery context are outside those wrappers. Existing nested section/control IDs remain available within them.

| Panel | Reachable when | Content and permitted existing actions |
| --- | --- | --- |
| 1 — Your idea | Always | New idea form before a preparation exists. Afterwards show the saved idea read-only; only the existing interrupted-work recovery can create a separate preparation. No new reset/restart feature. |
| 2 — Clarify the scope | A preparation exists | Existing question, answer form or saved answer; confirmed scope and unaccepted suggestions stay inspectable. Saving an answer does not generate drafts. |
| 3 — PRD and mockup | An answer is saved | Before artifacts: explicit **Create the drafts** action. Afterwards: Experience / PRD / Review packet tabs, findings, revision requests and existing regenerate action. **These look right — continue** only opens panel 4; it records no acceptance and starts no task. |
| 4 — Technical blueprint | PRD and mockup exist and planning capability is available | Existing required stack-preference input, generation/revision action, generated blueprint/decisions/findings and explicit **Use this blueprint** action. Generation alone cannot unlock panel 5. Keep input required; the mockup's “optional” label is not a behavior change. |
| 5 — Evals and stories | Current blueprint has an existing digest-bound local selection | Existing plan generation/regeneration, requirement coverage, correctness/restraint/production evals, ordered stories and scope/dependencies. **Review the package for gaps** starts the existing review. |
| 6 — Planning review | Current plan exists | Existing review status, blockers/advisories and, only when present, exact-content handoff. “Planning complete” requires the saved completed phase and handoff; merely visiting this panel cannot claim completion. |

`Use this blueprint` preserves the existing two-request sequence: successful `/api/select-technical` for the displayed digest, then `/api/plan` using the refreshed revision. A failed selection starts no plan. Do not automatically select a newly generated blueprint, or change this local choice into a trusted approval.

### Initial view and refresh

On load derive the view from existing state: no preparation → 1; unanswered question → 2; saved answer/product artifacts without planning → 3; technical draft/unselected blueprint → 4; selected blueprint or plan without a review → 5; existing review or planning-reviewer task → 6. A running/failed task selects its owning panel (product 3, technical 4, plan 5, review 6). Interrupted work selects panel 1 for the existing explicit recovery form, while retaining global task context and access to saved artifacts.

Keep the viewed panel separate from completed progress. Back navigation changes only the viewed panel and `aria-current="step"`; it cannot erase completion, unlock future work, modify records or submit a request. On ordinary refresh retain an explicitly viewed reachable panel. After an explicit action, open its result/work panel. After upstream invalidation, stop showing invalid downstream content and return to its nearest still-valid prerequisite. A reload reconstructs everything from saved state rather than persisted UI progress.

A completed rail mark means the relevant saved output exists (idea, answer, artifact pair, selected blueprint, plan, completed review/handoff), not that a gate was approved. Availability and completion are separate: panel 3 is usable before drafts; panel 6 is usable before review completion. Derive both from current artifacts/state, never the highest panel ever clicked.

### Failure and recovery

Keep `#stage`, `#task-status`, `#next-action`, `#error`, blockers/findings and `#recovery-info` available in the new layout. Task failure/interruption must be understandable without hunting another panel. Detailed findings may live with their artifact but a blocking summary remains visible globally.

Do not introduce retries on reload, navigation or theme changes. Mutations retain current busy/interrupted/capability guards; read-only navigation, tabs and theme controls must never enable an otherwise disabled mutation. Interrupted work retains the old preparation and offers only the existing explicit separate-preparation path. Provider absence is a named unavailable state, not a hidden or misleading success.

## 4. Layout, theme and interactions

Use the approved tokens and four palettes unchanged. Add a named card-radius token for 14px if useful; fixed circle/pill geometry is not a new theming system. Literal color values belong only in palette declarations; `transparent`, `currentColor` and inheritance are valid structural uses. Do not theme generated mockup content or rewrite its HTML.

Keep header/project context, the full six-step rail, one panel, and Session drawer as illustrated. Derive project context from the existing idea; do not introduce a project-name state field. A bounded visual truncation must retain an accessible/full saved idea. On narrow screens rail precedes the panel. Make ordinary content wrap and avoid horizontal page scrolling, including long identifiers and error text.

`#session-toggle` is a button with `aria-controls="orca-connection"` and accurate `aria-expanded`; the existing connection section becomes the collapsed, non-modal drawer. Opening it does not start, pair, detach or reconfigure a session. Move all existing controls, warnings, capabilities and receipts; the shortened mockup is not permission to omit model/start/discovery/resume controls. Escape closes the drawer and returns focus to its opener; a non-modal drawer does not trap focus.

`#theme` is a labeled select in that drawer: `graphite`, `orca`, `clay`, `indigo`. Only `localStorage['preparation-theme']` is written by this new presentation logic. Missing/invalid/unreadable stored values resolve to graphite; catch storage exceptions. Choosing a theme can still repaint for the current visit if saving is unavailable. Never send theme/view/tab choices to the server or add them to a preparation/packet.

Avoid a new theme script/route or inline-script CSP exception. Load existing `/app.js` synchronously in the head for its small safe theme initialization, then initialize DOM-dependent handlers/rendering on `DOMContentLoaded`. Apply the saved theme before rendering the page; a slow script must not cause actions to execute before the DOM exists. Keep the existing local CSP exactly as shipped.

Artifact tabs use `tablist`, labeled `tab`/`tabpanel` relationships, one `aria-selected` tab and roving `tabindex` (only the selected tab is in the Tab sequence). Left/Right and Home/End select/focus tabs; normal Tab leaves the tablist. Show the real PRD/packet from existing artifact routes. Keep the Experience iframe sandbox and source behavior; render textual artifacts with `textContent`, never unsanitized `innerHTML`. Switching tabs must not regenerate artifacts.

Use 2px visible focus outlines with offset in all themes. A panel change moves focus to its heading when the user navigates or finishes an explicit action; background polling must not steal focus. Disabled future-step controls are real `disabled` buttons. Respect reduced-motion preference if smooth scrolling/animation is used; no animation is required.

## 5. Wording and preservation

Use the action-label replacements in the theme spec, including dynamic regenerate/revise labels. They change labels, not action semantics. Next-step context comes from saved `nextAction`; do not promise success while a task is running or blocked. Keep the current required preferences label **Stack preferences and technical constraints**.

Copy existing application boundary text verbatim from `public/index.html` at the baseline, rather than the mockup's paraphrases. In particular retain the visible draft-only warning, local-choice-not-trusted-approval sentence, proposal distinction, pre-builder warning, four unperformed reviews and footer authority sentence. Moving text is allowed; deleting, hiding all access to it, or changing its meaning is not. A compact drafting-only pill stays visible in the header, with its full existing boundary sentence reachable before any continuation, not only after the final panel.

Replace the mockup's “so they never disagree” with “so they stay aligned for review.” The saved pair remains subject to review. Do not copy sample counts, names, revision numbers, fake checkmarks or `href="#"` placeholders into production output. The mockup's restart button is navigation-only illustration, not permission for a new application-reset action.

## 6. Completion evidence

Follow [THEME-EVALS.md](THEME-EVALS.md) and [THEME-BUILD-PLAN.md](THEME-BUILD-PLAN.md). Pass existing backend/CLI tests without edits, preserve the existing browser journey's assertions while adapting its approved labels/navigation, and pass the new presentation harness. Capture screenshots and one keyboard/recovery walkthrough. Review the actual diff against the frozen input manifest.

Passing this UI package does not mean the factory built it, all app requirements are tested, every accessibility property is proven, or a production application is ready. State the exact local test/review evidence and outstanding factory capabilities.
