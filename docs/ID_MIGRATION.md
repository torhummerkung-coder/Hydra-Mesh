# Evidence/Risk ID reconciliation — 2026-10-04

Current schema is the supplied Phase2 v0.2 package (2026-09-24). Original corrective documents are preserved byte-for-byte under `history/corrective-source/`. Canonical original entries are preserved in meaning; additions below record engineering findings only. IDs in historical sources must always be qualified by source.

| Historical corrective ID | Current reference | Meaning / treatment |
|---|---|---|
| EC-000 | EC-000 plus EC-003 | Baseline freeze remains open; local implementation does not prove freeze |
| EC-001 | EC-002 | 8Q/9Q AI cross-check; implementation history, clinician verification pending |
| RISK-001 | RISK-001 / RISK-007 | Summary integration and model drift; old live claims require original logs |
| RISK-002 | RISK-002 | Trace visibility boundary; manual UI evidence pending |
| RISK-003 | RISK-003 | Historical source records Tor acceptance dated 2026-09-22 for MVP/Portfolio Demo only; this is not Phase2 closure or approval of proposed fail-safe policy |
| RISK-004 | RISK-008 | Missing scoped 15s clinical-read deadline; supplied code now contains the fix |
| RISK-005 | RISK-001 / RISK-007 | Model/config drift; contract corrected, current live evidence pending |
| N/A | EC-003 / RISK-009 | Engineering gate correction: contract mismatch and scoring false-green exit status |

Canonical EC-001 continues to mean model/version migration. Canonical RISK-004 is delivery truth, RISK-005 telemetry privacy. They do not supersede legacy deadline/model findings.

History is source-reported evidence, not independently authenticated human approval. Archive provenance: `hydra-phase1-corrective-fixes.zip`, SHA256 `69a4217cd1cf780e06f305ed999cb8a1d1cedcdefa33bae49d5eb7f9a7656fa2`. A missing `.git` inside a ZIP proves only that Git metadata was not supplied; repository/tag existence remains unknown.
