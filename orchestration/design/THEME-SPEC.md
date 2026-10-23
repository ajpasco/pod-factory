# Theme and layout spec for the preparation workspace

For Codex. **Presentation only.** No route, request, response, state field, gate, wording of a safety statement, or workflow step changes. Every action, its order and its gating stay exactly as they are today; this spec covers tokens, layout, navigation and wording of *labels*.

Default theme: **Graphite & Signal**. Three alternates ship with it and are switchable at runtime.

Reference mockups, openable with no build step:

| File | What it is |
| --- | --- |
| `design/mockups/workspace.html` | The full six-step journey, all four themes, working theme switcher. The layout this spec describes. |
| `design/mockups/tokens.html` | Every token in every theme, with the contrast ratio of each text pair. |

---

## 1. The token set

One flat set of CSS custom properties on `:root`. Nothing in the app may hard-code a colour, radius or font family once this lands.

| Token | Role |
| --- | --- |
| `--ground` | Page background behind cards |
| `--surface` | Card, header and input background |
| `--ink` | Primary text and headings |
| `--ink-body` | Body copy inside a card (slightly lighter than `--ink`) |
| `--muted` | Secondary text: hints, captions, "next step" lines, rail notes |
| `--line` | Every 1px border and divider |
| `--soft` | Quiet fill: step marks, chips, callouts, `--ground` substitute inside a card |
| `--soft-line` | Border of a `--soft` fill |
| `--accent` | Primary button fill, completed step mark, active tab underline, logo square |
| `--accent-ink` | Accent as *text*: active tab label, eyebrow, links, current-step note |
| `--on-accent` | Text on `--accent` |
| `--notice-bg` / `--notice-ink` | The drafting-only pill and the pre-builder warning panel. **Reserved** — never used decoratively |
| `--radius` | Buttons, inputs, chips, rail items. Cards are fixed at 14px |
| `--font-sans` / `--font-mono` | Text; mono is for revisions, digests and file names only |

Two tokens exist so the accent can be near-black: `--accent` is a *fill*, `--accent-ink` is *text*. In Graphite and Orca they are the same value; in Clay and Indigo `--accent-ink` is darker so small text keeps 4.5:1.

## 2. The four themes

```css
:root,
[data-theme="graphite"] {           /* default */
  --ground: #F2F3F2;  --surface: #FFFFFF;  --ink: #16191A;  --ink-body: #3C4346;
  --muted: #5E6568;   --line: #E0E3E2;     --soft: #E6E9E8; --soft-line: #DCE0DF;
  --accent: #23282A;  --accent-ink: #23282A; --on-accent: #FFFFFF;
  --notice-bg: #FCE9DC; --notice-ink: #8A3609;
  --radius: 9px;
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

[data-theme="orca"] {               /* Orca's own light tokens */
  --ground: #FAFAFA;  --surface: #FFFFFF;  --ink: #0A0A0A;  --ink-body: #333333;
  --muted: #737373;   --line: #E5E5E5;     --soft: #F5F5F5; --soft-line: #E5E5E5;
  --accent: #171717;  --accent-ink: #171717; --on-accent: #FAFAFA;
  --notice-bg: #FEF3C7; --notice-ink: #7A5200;
  --radius: 10px;
  --font-sans: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;
}

[data-theme="clay"] {
  --ground: #FAF8F4;  --surface: #FFFFFF;  --ink: #1C1B19;  --ink-body: #3E3A34;
  --muted: #6A635A;   --line: #E6E1D8;     --soft: #F6E8DF; --soft-line: #EADBD0;
  --accent: #B4531F;  --accent-ink: #9A4417; --on-accent: #FFFFFF;
  --notice-bg: #F6E8DF; --notice-ink: #8A4015;
  --radius: 10px;
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

[data-theme="indigo"] {
  --ground: #F3F4F8;  --surface: #FFFFFF;  --ink: #15182B;  --ink-body: #3A3F55;
  --muted: #5C617A;   --line: #E0E2EC;     --soft: #E7E9FB; --soft-line: #DDE0F0;
  --accent: #3A46C9;  --accent-ink: #2F39A8; --on-accent: #FFFFFF;
  --notice-bg: #FBEEDC; --notice-ink: #7A4E00;
  --radius: 9px;
  --font-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}
```

Orca's values were read from the installed app's renderer stylesheet (`--background`, `--foreground`, `--primary`, `--muted-foreground`, `--border`, `--sidebar`, `--radius`, `--app-font-family`), so the workspace sits inside Orca without looking like a different product. `--notice-bg` / `--notice-ink` are the one pair **not** from Orca: its light set has no notice colour, and the drafting-only pill must not be the same grey as everything else. If that is unacceptable, make the pill a neutral chip with a bold label rather than inventing a different hue.

Orca also ships a dark set (`--background #0a0a0a`, `--card #171717`, `--primary #e5e5e5`, `--muted-foreground #a1a1a1`, `--border #ffffff12`). Out of scope here; add it as `[data-theme="orca-dark"]` only if asked.

## 3. Switching

- `<html data-theme="graphite">` is the default, written into `index.html` so the first paint is themed.
- The switch is a `<select>` in the Session drawer, not in the main flow.
- Persist to `localStorage` under `preparation-theme`, wrapped in `try/catch`: a private window or blocked storage must fall back to graphite, not break the page.
- Read on load before first paint; set `document.documentElement.dataset.theme`.
- **No server involvement.** The theme is not preparation state, is never written to the data directory, never enters a record or packet, and is not sent on any request.
- Fonts: `<link>` both families once. If the network is unavailable the stacks fall back to system fonts; no layout depends on the webfont metrics.

## 4. Layout and navigation

The current page stacks intake, status, two columns of cards, blueprint, plan and handoff on one scroll, with the Orca connection panel above the work. The spec replaces that arrangement — **not** the steps themselves.

1. **Header bar** (`--surface`, 1px `--line` bottom): project name, revision in `--font-mono`, the drafting-only pill, and a **Session** button. Sticky is optional.
2. **Session drawer**: everything currently in the "Orca session connection" `<details>`, plus the theme switcher. Collapsed by default. Same controls, same wording about granting no authority.
3. **Two columns** under a 1180px max width: a progress rail (248–300px) and the step panel (`flex: 999 1 560px`). Below ~900px they stack, rail first.
4. **Progress rail**: the six steps, always all six visible. Completed steps show `✓` on `--accent` and are clickable to revisit; the current step is a `--surface` card with a `--soft-line` border; later steps are dimmed to 0.6 opacity and `disabled`. The rail is navigation only — it must not let anyone reach a step the existing gating would refuse.
5. **One step panel at a time**, in a 14px-radius `--surface` card: eyebrow "Step N of 6", one `h1`, one lead paragraph, the step's own controls, then a single primary button with a `--muted` "Next: …" line beside it.
6. **Step 3** splits the current artifact card into tabs — **Experience / PRD / Review packet** — with the revision request below the tabs, not beside them.
7. **Footer line** keeps the existing sentence about factory records being the authority.

What moves out of the main flow: the Orca connection panel (into the drawer), the status card (revision to the header, `nextAction` to the line beside each primary button), the standalone boundary paragraph (into the header pill, with the full sentence kept in step 6's warning panel).

## 5. Wording

Keep every safety sentence verbatim — draft-only authority, approval-channel-not-implemented, the four unperformed reviews, "this is not a trusted factory approval and cannot authorise builders", and the pre-builder warning. Those are the point of the product.

Change only action labels and headings, to name the user's intent rather than the machine's job:

| Now | Becomes |
| --- | --- |
| Create drafts | Create the drafts |
| Revise drafts | Revise the drafts |
| (no equivalent) | These look right — continue |
| Prepare technical blueprint | Prepare the blueprint |
| Use this blueprint and prepare evals & stories | Use this blueprint |
| Prepare evals & stories | Prepare evals and stories |
| Review the complete package for gaps | Review the package for gaps |

Each primary button gets a `--muted` sentence beside it naming what happens next, sourced from the existing `nextAction`.

## 6. Accessibility, non-negotiable

- Every control is a real `<button>`, `<a href>`, `<select>` or `<input>` with a `<label>`. No click handler on a `div`.
- Body text ≥ 4.5:1 against its background; `--muted` on `--surface` and on `--ground` both pass in all four themes (see `tokens.html`).
- Focus ring visible in every theme: 2px `--accent-ink` outline with 2px offset.
- Tabs: `role="tablist"` / `role="tab"` with `aria-selected`; arrow keys move between them.
- Rail buttons for later steps are `disabled`, not merely dimmed.
- Icon-only controls carry `aria-label`; decorative SVG is `aria-hidden="true"`.
- The layout works at 390px wide with no horizontal scroll.

## 7. Out of scope

No new endpoint, capability, persisted field or dependency. No framework, build step or CSS library. No dark mode yet. No autosave indicator, context drawer or interrupted-state banner — those were logged as optional in the earlier review and stay optional.

## 8. Acceptance

1. Each of the four themes renders every one of the six steps with no hard-coded colour left in `public/*`.
2. Switching theme repaints without a reload and survives a reload; with `localStorage` blocked it falls back to graphite and still works.
3. `npm test` and `npm run test:browser` pass unchanged — the browser journey asserts the existing flow, so a passing run is the evidence that behaviour did not move.
4. Every string in §5's left column is gone from `public/`, and every safety sentence in §5's first paragraph is still present verbatim.
5. Keyboard: tab through step 3 and reach the tabs, the textarea and both buttons, with a visible focus ring in all four themes.
