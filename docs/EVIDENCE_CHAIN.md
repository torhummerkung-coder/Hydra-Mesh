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
