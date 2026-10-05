# HYDRA Mesh — Evidence Chain

> ทุก decision สำคัญต้องย้อนตอบได้ว่า “ทำไม HYDRA ถึงทำแบบนี้”
> ไม่ใช่แค่ “เราออกแบบกันว่าแบบนี้น่าจะดี”

**รูปแบบ v0.2:**
`Finding/Trigger → Source/Rationale → Related Risk → Required Change → Safety Impact → Implementation → Test → Evidence Artifact → Version → Reviewer/Human Decision`

| | |
|---|---|
| สถานะเอกสาร | SKELETON v0.2 (2026-09-24) |
| อ้างอิง | `PHASE_2_PLAN.md` (W0/W2/W3) |
| Owner | Tor |

---

## กติกา

1. **Append-only** — ไม่ลบ/เขียนทับ entry เก่า; แก้ด้วย entry ใหม่ + `Supersedes: EC-XXX`
2. **ทุก entry ต้องมี Test** — ไม่มี test/evidence = ห้าม `verified`
3. **ห้าม silent blank** — ไม่เกี่ยวให้เขียน `N/A` + เหตุผล
4. Clinical threshold change ต้องมี official source/version ก่อนแก้ code
5. Model/provider/version change ต้องมี entry ของตัวเอง + contract test + live verification ใหม่
6. `Version` ต้องย้อนกลับได้: commit/tag + model/provider version เมื่อเกี่ยวข้อง
7. ทุก entry ที่กระทบ safety/privacy/authority ต้องใส่ `Related Risk(s)`
8. ต้องระบุ `Evidence Artifact / Log Path` เพื่อให้คนอื่นตรวจซ้ำได้
9. `Reviewer / Decision Authority / Decision Date` ต้องเป็นมนุษย์เมื่อ entry ต้องการ judgment
10. ใช้ synthetic / de-identified data เท่านั้นใน artifact ที่แชร์เพื่อ review

## Status

`open → implemented → verified | rejected(reason) | deferred(reason)`

---

## Traceability Index

| Entry | ชื่อ | Related Risk | Test ID | Version | Status |
|---|---|---|---|---|---|
| EC-000 | Phase 1 baseline freeze | RISK-001, RISK-002, RISK-003 | TBD | TBD | open |
| EC-001 | Clinical Summary model/version migration | RISK-001, RISK-007 | TBD | TBD | open |

---

## Entries

### EC-000: Phase 1 baseline freeze
- **Finding / Trigger:** ต้องมี baseline ที่พิสูจน์แล้วก่อนใช้เป็นจุดอ้างอิง Phase 2
- **Source / Rationale:** Phase 2 W0
- **Related Risk(s):** RISK-001, RISK-002, RISK-003
- **Required Change:** ปิด BLOCKER, classify known gaps, freeze commit/tag
- **Safety Impact:** ป้องกันการอ้างว่า “ผ่านแล้ว” ทั้งที่ test/build/security boundary ยังไม่ยืนยัน
- **Implementation:** baseline commit/tag: _TBD_
- **Test:** ผลรันจริง

  | Gate | ผล | Evidence | วันที่ |
  |---|---|---|---|
  | install + migrate + seed | _TBD_ | _TBD_ | _TBD_ |
  | DB integration | _TBD_ | _TBD_ | _TBD_ |
  | clinical data encryption | _TBD_ | _TBD_ | _TBD_ |
  | auth + security queue | _TBD_ | _TBD_ | _TBD_ |
  | clinician authorization + trace scoping | _TBD_ | _TBD_ | _TBD_ |
  | fallback integration | _TBD_ | _TBD_ | _TBD_ |
  | fallback storage | _TBD_ | _TBD_ | _TBD_ |
  | clinical-summary contract | _TBD_ | _TBD_ | _TBD_ |
  | clinical-summary live | _TBD_ | _TBD_ | _TBD_ |
  | typecheck | _TBD_ | _TBD_ | _TBD_ |
  | production build | _TBD_ | _TBD_ | _TBD_ |
  | environment sanity | _TBD_ | _TBD_ | _TBD_ |

- **Known Gaps:** แยก `BLOCKER / ACCEPTED GAP / DEFERRED`
- **Evidence Artifact / Log Path:** _TBD_
- **Version:** _TBD_
- **Reviewer / Decision Authority:** Tor
- **Decision Date:** _TBD_
- **Supersedes:** none
- **Status:** open

### EC-001: Clinical Summary model/version migration
- **Finding / Trigger:** มีการเปลี่ยน model/version ของ Clinical Summary หลัง live verification เดิม; ต้อง reconcile runtime ปัจจุบันกับ evidence เดิม
- **Source / Rationale:** รายงาน live เดิมผูกกับ model/version เดิม; Phase 2 กำหนด model/provider change control
- **Related Risk(s):** RISK-001, RISK-007
- **Required Change:** ระบุ current runtime model → rerun contract test → rerun live verification → update identity/config docs
- **Safety Impact:** model drift อาจเปลี่ยน format, refusal, empty-output, hallucination profile หรือ disclaimer behavior
- **Implementation:** _TBD_
- **Test:** _TBD_
- **Evidence Artifact / Log Path:** _TBD_
- **Version:** runtime model/provider + commit/tag _TBD_
- **Reviewer / Decision Authority:** Tor
- **Decision Date:** _TBD_
- **Supersedes:** none
- **Status:** open

---

## Template

```markdown
### EC-XXX: <ชื่อสั้น>
- **Finding / Trigger:** <พบอะไร / dependency อะไรเปลี่ยน>
- **Source / Rationale:** <source/version/reason>
- **Related Risk(s):** <RISK-XXX หรือ none>
- **Required Change:** <ทำอะไร / ไม่ทำพร้อมเหตุผล>
- **Safety Impact:** <safety/privacy/authority impact>
- **Implementation:** <file/commit>
- **Test:** <test ID + result>
- **Evidence Artifact / Log Path:** <report/log/trace>
- **Version:** <commit/tag/model/provider>
- **Reviewer / Decision Authority:** <human>
- **Decision Date:** <YYYY-MM-DD>
- **Supersedes:** <EC-XXX หรือ none>
- **Status:** open | implemented | verified | rejected(reason) | deferred(reason)
```

## Reconciliation additions — 2026-10-04

| Added Entry | Related Risk | Status |
|---|---|---|
| EC-002 | Clinical instrument risk review pending | open |
| EC-003 | RISK-001, RISK-007, RISK-008, RISK-009 | implemented, engineering only |

Original EC-000/EC-001 remain open; their TBD fields are not silently overwritten. See `ID_MIGRATION.md` for historical identities.

### EC-002: Historical clinical instrument cross-check
- **Finding / Trigger:** Legacy corrective EC-001 has a different meaning from canonical EC-001.
- **Source / Rationale:** `history/corrective-source/EVIDENCE_CHAIN.md` legacy EC-001.
- **Related Risk(s):** none in current register for clinical instrument validity; requires clinician risk review (not implied closed).
- **Required Change:** Preserve cross-check evidence; verify official instrument/version and clinical interpretation with clinician.
- **Safety Impact:** AI cross-check and arithmetic tests do not establish clinical validity.
- **Implementation:** Historical source; no clinical thresholds changed in this patch.
- **Test:** Existing scoring regression; clinical verification pending.
- **Evidence Artifact / Log Path:** Historical source; `../W0_CORRECTIVE_VERIFICATION.md`.
- **Version:** Source ZIP SHA in ID_MIGRATION; actual baseline commit/tag unknown.
- **Reviewer / Decision Authority:** Tor / clinician review pending.
- **Decision Date:** TBD.
- **Supersedes:** none; remaps source-qualified legacy EC-001.
- **Status:** open.

### EC-003: Corrective gate reconciliation
- **Finding / Trigger:** Contract pins 3.8 but expects 3.7; scoring failures previously did not propagate nonzero status; source docs conflict.
- **Source / Rationale:** Supplied corrective ZIP plus Phase2 v0.2; ID_MIGRATION.md.
- **Related Risk(s):** RISK-001, RISK-007, RISK-008, RISK-009.
- **Required Change:** Fix contract assertion, preserve scoring failure counter, use canonical docs with history/mapping, record effective model in live log.
- **Safety Impact:** Avoid false test pass and invalid freeze/model claims.
- **Implementation:** This overlay; 15s clinical data-read deadline is present in supplied corrective code; auth retains 3s.
- **Test:** Local reconstructed-source regression and deliberate scoring failure; see report. Live and real-repository gates pending.
- **Evidence Artifact / Log Path:** `../W0_CORRECTIVE_VERIFICATION.md`, `../evidence/results.json`.
- **Version:** Patched source manifest; actual commit/tag TBD.
- **Reviewer / Decision Authority:** Tor.
- **Decision Date:** TBD.
- **Supersedes:** none; adds implementation evidence to EC-000/EC-001 without changing their status.
- **Status:** implemented (engineering only; not verified/frozen).


## Current-repository evidence update — 2026-10-05 (Asia/Bangkok)

**W0 OPEN — engineering evidence only; no freeze or Human Decision.** This appended update supersedes earlier statements that actual-repository non-live collection and all Gemini live verification are still pending. Earlier results remain historical and are not overwritten.

Candidate: `3f6d45ba7b28cee703d16c2eba6143cea7d5197d`, branch `fix/w0-reconciliation`. Non-live collector on Ubuntu Node v22.23.2/npm 10.9.8 passed 16 gates, with clean/stable tracked source. Tracked-source SHA-256 `5301d431d7704efaabbdf75d89fa49cc47a16b1a1016a00a77c15eb2f48a27f6`; lockfile SHA-256 `83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0`.

Gemini model `gemini-3.8-flash`: live collector failed at its live gate (exit 1; whole test-process duration 14.428s; cause unknown). Subsequent ordinary live test passed (`GEMINI_EXIT=0`, verification time 2026-10-04T21:27:45.291Z). These are separate runs, not one 17-gate live suite PASS. Diagnostic server separately observed HTTP 200 / STOP / 9.936s. UI showed source-data fallback and later available AI summary; screenshot 1000018374 shows generation 2026-10-05 06:12:32 Bangkok, disclaimer and complete section 4 displaying human-review count 0. That screenshot does not bind its request to the earlier diagnostic metadata or independently prove normal startup.

JSON evidence binds the tested code candidate above. This documentation-only patch creates a different tracked-source hash/commit; do not relabel the JSON as evidence collected on the later documentation commit. Review Git diff to establish unchanged executable source/config/lockfile. Tag/push and baseline decision still require actual evidence.

### EC-004: Summary deadlines and unfinished-generation containment
- **Finding / Trigger:** Browser could abort before the provider response/fallback; nonempty MAX_TOKENS output previously passed the live script despite incomplete text.
- **Source / Rationale:** Actual patch commits and synthetic contract/authorization tests; generation metadata from separate earlier diagnostic run. No clinical thresholds changed.
- **Related Risk(s):** RISK-001, RISK-007, RISK-008, RISK-009.
- **Required Change:** Bound provider at 30s/browser at 60s; require first candidate finishReason STOP; reject unfinished/blocked/unconfirmed generations into existing authorized source-data fallback.
- **Safety Impact:** Prevent partial AI text being presented as an available summary; preserve authorization and source-data continuity. STOP does not certify content or clinical accuracy.
- **Implementation:** `0b59ec5` changes agent/dashboard deadlines; `3f6d45b` raises maxOutputTokens 800→4096 and checks STOP; adds contract and clinician authorization regressions. Auth checks remain 3s and four clinical reads 15s. No automatic retry/model/prompt/critical-path changes.
- **Test:** `test:clinical-summary-contract` PASS for multi-part/empty/truncated/blocked/missing finish reason; `test:clinician-authorization` PASS including MAX_TOKENS fallback restricted to authorized source without partial AI text; typecheck/build and remaining collector gates PASS on candidate 3f6d45b.
- **Evidence Artifact / Log Path:** `../evidence/w0/2026-10-05/hydra-w0-nonlive-2026-10-05.json`; supplemental evidence report in the same directory, including screenshot references 1000018354/8355. Screenshot binaries are not included in this package.
- **Version:** Candidate commit 3f6d45ba7b28cee703d16c2eba6143cea7d5197d; Google / gemini-3.8-flash; no baseline tag evidenced.
- **Reviewer / Decision Authority:** Codex technical review; Tor human decision pending.
- **Decision Date:** Pending human decision; technical compilation 2026-10-05.
- **Supersedes:** none; supplements EC-001/EC-003 with distinct fixes, without closing them.
- **Status:** implemented (engineering only).

### EC-005: Actual-repository baseline evidence reconciliation
- **Finding / Trigger:** Earlier docs describe real-checkout/live gates as pending; new evidence must retain both failure and success history.
- **Source / Rationale:** Uploaded collector JSONs and synthetic phone screenshots; W0 reconciliation exit criteria.
- **Related Risk(s):** RISK-001, RISK-002, RISK-003, RISK-004, RISK-005, RISK-007, RISK-008, RISK-009.
- **Required Change:** Record current evidence with exact provenance and bounds; reconcile remaining UI/human/Git gaps before freeze.
- **Safety Impact:** Avoid false-green promotion, clinical validation claims and mixing incompatible runs.
- **Implementation:** Append-only documentation plus two byte-preserved JSONs and supplemental report; no executable source/config changes.
- **Test:** Non-live collector 16 ordered gates PASS (install, migrate, seed, 11 suites, typecheck, build). Separate live collector FAIL and subsequent ordinary Gemini live PASS retained. Automated clinician authorization PASS; paired manual allow/deny trace evidence is older and is not claimed as rerun on the latest build. UI fallback/available states observed separately.
- **Evidence Artifact / Log Path:** `../evidence/w0/2026-10-05/` and `W0_CLOSEOUT_WORKSHEET.md` appended update; report records both JSON hashes and exact image references.
- **Version:** Tested code candidate 3f6d45ba7b28cee703d16c2eba6143cea7d5197d; source/lock hashes above; documentation commit/tag to be recorded after review, not invented here.
- **Reviewer / Decision Authority:** Codex technical review; Tor baseline/risk decisions pending.
- **Decision Date:** Pending; technical compilation 2026-10-05.
- **Supersedes:** EC-000 and EC-001 pending-evidence statements only. Their open status, human decisions and freeze criteria remain unchanged.
- **Status:** open (evidence recorded; W0 not closed).


## Human model-selection decision — 2026-10-05

### EC-006: Human selection of Gemini 3.8 for the W0 demo baseline
- **Finding / Trigger:** Configured 3.8 candidate had current contract/live evidence; explicit human model selection was still pending.
- **Source / Rationale:** Tor explicitly selected 3.8 instead of 3.7 on 2026-10-05 07:57:53 Asia/Bangkok because 3.7 had problems and could not run in his environment (owner report, not a global provider diagnosis).
- **Related Risk(s):** RISK-001, RISK-007.
- **Required Change:** Record the confirmed model selection and reason; retain current Google/gemini-3.8-flash configuration and evidence provenance.
- **Safety Impact:** Remove ambiguity about the selected behavioral dependency without widening clinical authority or accepting unrelated gaps.
- **Implementation:** Append-only docs; `decisions/W0_MODEL_DECISION_2026-10-05.md`. No runtime source/config change.
- **Test:** Existing 3.8 contract/non-live PASS and separate live/UI observations in EC-004/EC-005. Earlier failed live collector remains FAIL; no test repeated for this docs record. Installer guard verification is packaged separately.
- **Evidence Artifact / Log Path:** `decisions/W0_MODEL_DECISION_2026-10-05.md`; `../evidence/w0/2026-10-05/`.
- **Version:** Tested code 3f6d45ba7b28cee703d16c2eba6143cea7d5197d; evidence docs c18dd26; Google/gemini-3.8-flash; this later decision commit to be recorded after application, not invented here.
- **Reviewer / Decision Authority:** Tor (human model choice); Codex transcribes the decision.
- **Decision Date:** 2026-10-05 (Asia/Bangkok).
- **Supersedes:** Model-selection-pending statements in EC-001/EC-004/EC-005 only. Existing open baseline/risk statuses and remaining review requirements persist.
- **Status:** implemented (model selection recorded; engineering evidence as bounded above; W0 remains OPEN).
