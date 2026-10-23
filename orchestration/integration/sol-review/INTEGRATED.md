# D7 read-only connection integrated

Codex reviewed and applied `factory-connection-corrected.patch` directly to the shared orchestration tree after verifying all nine destination baselines. All resulting file hashes match `CHANGE-MANIFEST.json`. The archival Claude patch was not applied first.

Independent checks on the integrated tree:

- `npm test`: 66 passed, zero failed/skipped. See `evidence/integrated-unit.txt`.
- `npm run test:browser`: all three existing journeys passed. See `evidence/integrated-browser.txt`.
- `node test/equipment-connections.mjs`: CON-01–07 pass; FACTORY-01 remains BLOCKED and APP-01 NOT RUN. See `evidence/integrated-connections.txt`. Fixture providers and fake Orca transport; no real app build.
- Every changed file matches the candidate's reviewed hash; all public UI/font files are unchanged from Sol's baseline.

The live idle preview was restarted with explicit read-only configuration for this checkout and `docs/projects/equipment-checkout`. The full `/api/preparation` response before and after was identical: preparation `prep-dea230ef77de390e6b0ad005`, revision 6, completed task, same provider/capabilities. `/api/factory?story=story-4` now reports configured diagnostics, blocked, non-authoritative, package binding unverified and real dispatch unimplemented. Evidence: `evidence/integrated-live-diagnostics.json`. Opening this endpoint is not approval or dispatch.

The two demonstrated false-ready cases are fixed and regression-tested. The broader original claim has been narrowed correctly: record/path observations are not an authority verdict. The exporter remains a draft with artifact references and planned evals; no executable equipment tests or gate chain is implied.

The presentation baseline is historical and deliberately not silently re-pinned for this backend increment. Its only changed protected entries are `src/server.ts` and `src/cli.ts`; this integration manifest records their before/after hashes and reason. All other protected entries still match. `PREBUILD-STATUS.md` now records this slice.

No live factory record, lock, repository protection or approval changed. No builder launched. The equipment onboarding prerequisite is documented separately in `EQUIPMENT-NEXT-STEP.md`; the running diagnostics remain explicit about locally cached refs.
