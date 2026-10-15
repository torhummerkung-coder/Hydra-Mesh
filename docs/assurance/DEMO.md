# HYDRA-Mesh — Demo — สถานะและเกณฑ์รับ

Revision: R2 · 2026-10-15 · Asia/Bangkok
Ledger SHA-256: `485a3a32f280291a321b7a189e159536d6a65d0ff79b5d2540526727ec326b58`

**Overall: PREPARATION / NOT_ACCEPTED**

Coverage: Inspected main base + supplied D05/G03 evidence; open PR code not merged or audited by this docs change

Inspected GitHub base: 295893a7e4cc6f32839eb8a90d1ced5cae963866

Gates: G03=OPEN · RISK008=OPEN · W0=OPEN

ข้อเท็จจริงร่วมทุกแถวมาจากทะเบียนเดียวกัน ผลรับงานแต่ละขอบเขตแสดงแยกไว้ด้านล่าง

## เกณฑ์รับขอบเขตนี้

- กำหนด walkthrough, exact source/environment, synthetic inputs, expected outcomes และ mock boundaries ก่อนรัน
- ฟังก์ชันที่สาธิตต้องทำงานตามเกณฑ์จริง รวม deny/fallback/timeout ที่อยู่ในขอบเขต
- เก็บ failures และ UNKNOWN; accounting/isolation/admission prerequisites ต้องตรง operation
- Owner review/freeze ตาม demo lane; independent review DEFERRED ไม่ใช่ PASS
- Owner รับผลตามเกณฑ์ demo; ไม่สืบทอดเป็น production หรือ D05 operational attestation

## H-01 — Canonical identity

**สถานะ: HOLD**

ข้อเท็จจริง: 24 methods ยังไม่มี canonical_case ที่ adjudicate แล้ว

หลักฐาน: `E-ACCOUNTING`

เกณฑ์จบ: Owner ตัดสิน semantic crosswalk พร้อมประวัติ

## H-02 — Group retry budget

**สถานะ: HOLD**

ข้อเท็จจริง: verified_group_balance ยัง null; prior starts สำหรับงานนี้เป็น Owner-reported เท่านั้น

หลักฐาน: `E-ACCOUNTING`

เกณฑ์จบ: กระทบยอด case/group/reservation/unknown ก่อนเริ่ม

## H-03 — Freeze and independence

**สถานะ: DEFERRED_REVIEW_OWNER_FREEZE_PENDING**

ข้อเท็จจริง: Independent review เลื่อนสำหรับ demo; ยังไม่มี actual Owner freeze ของ tranche

หลักฐาน: `E-AMENDMENT`

เกณฑ์จบ: Owner freeze หลัง source/env/accounting/route ครบ

## H-04 — Target environment and containment

**สถานะ: PARTIAL**

ข้อเท็จจริง: Setup artifact มี crypto 47 อยู่ในช่วง; target isolation/exclusive control ยังไม่พิสูจน์

หลักฐาน: `E-INSTALL`

เกณฑ์จบ: หลักฐาน effective host/network/exclusive controls + pin

## H-05 — Runner authority / admission

**สถานะ: HOLD_ROUTE_DECISION_PENDING**

ข้อเท็จจริง: local documentary controller; Popen ก่อน START; candidate runner hard-HOLD

หลักฐาน: `E-RUNNER`

เกณฑ์จบ: เลือก/grant reviewed route แบบเจาะจง; รักษา UNKNOWN accounting

## H-06 — Project gate invariants

**สถานะ: INVARIANT_OPEN**

ข้อเท็จจริง: G03 / RISK008 / W0 คง OPEN; ข้อนี้ไม่ใช่เหตุให้หยุดการจัดทำเอกสาร

หลักฐาน: `E-AMENDMENT`

เกณฑ์จบ: แสดง gate ตามจริงตลอด demo

## D05-TESTS — 24-method bootstrap suite

**สถานะ: NOT_RUN**

ข้อเท็จจริง: มี test source และ static review; ยังไม่มี D05 execution results

หลักฐาน: `E-MANIFEST`

เกณฑ์จบ: authorized bounded run ตาม prerequisites และรายงานผลจริง

## G03-R3 — Historical four original regressions

**สถานะ: HISTORICAL_PASS_BOUNDED**

ข้อเท็จจริง: Supplied r3 review ระบุ security/fallback/fallback-integration/clinical 4/4 PASS; ไม่ใช่ independent runtime attestation

หลักฐาน: `E-G03-REVIEW`

เกณฑ์จบ: ตรวจ applicability กับ source ที่จะ demo ก่อน reuse

## G03-CAPACITY — Historical HTTP/heavy coverage and capacity

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: r4 correctness targets 10/10 PASS ใน supplied review; v1/S100 timeout และ c4 busy 75%; ไม่ใช่ performance SLA. r3 clinical continuation ใหม่กว่าแก้ blocker สี่ originals แต่ไม่ปิด capacity gap

หลักฐาน: `E-G03-HEAVY`

เกณฑ์จบ: กำหนด workload demo และเปิดเผย legacy/concurrency limits; ไม่ใช้ fail-closed PASS แทน availability

## G03-LEGACY — Legacy test contract and failure coverage

**สถานะ: OPEN**

ข้อเท็จจริง: Historical review มี legacy contract/coverage ที่ต้องทบทวน; ยังไม่ยืนยัน current Repo

หลักฐาน: `E-G03-HEAVY`

เกณฑ์จบ: กำหนด compatibility ของ flow ที่ demo และเก็บ failed outcomes

## G03-CRYPTO-OPS — Crypto/dependencies/observability/integrity follow-up

**สถานะ: OPEN_SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Historical review มีข้อค้าง crypto/dependencies/OBS-1/D2/source identity; ไม่ใช่ scan ปัจจุบัน

หลักฐาน: `E-G03-HEAVY`

เกณฑ์จบ: ประเมินผลต่อสิ่งสาธิตและตัดขอบเขต/แก้ตามหลักฐาน; ไม่ suppress findings

## PROJECT-DEMO — End-to-end demo completeness

**สถานะ: NOT_ACCEPTED_SCOPE_PENDING**

ข้อเท็จจริง: main README identifies bootcamp capstone demo. Current tree has login/index, companion and clinician dashboard; a separate four-role UI prototype is not evidenced as merged here. End-to-end acceptance not performed.

หลักฐาน: `E-REMOTE-README-MD`, `E-SNAPSHOT`

เกณฑ์จบ: ยืนยัน flows/mock boundaries และรับผลตามเกณฑ์ก่อนรัน

## GITHUB — Repository delivery

**สถานะ: DRAFT_PR_OPEN**

ข้อเท็จจริง: Published documentation branch and opened Draft PR #3. Initial content commit 0a9a0183eaff12d9dbe55cb1ad0972db7121845f; main is unchanged. Production and runtime code remain outside this change.

หลักฐาน: `E-REMOTE-README-MD`, `E-REMOTE--GITHUB-WORKFLOWS-HYDRA-LIVE-TEST-YML`

เกณฑ์จบ: Owner reviews/accepts the documentation; demo runtime acceptance is tracked separately.

## D05-G01 — External D02 issuer/verifier operational trust

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G02 — Runner attestation and fencing operational trust

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G03 — Authorized PostgreSQL provisioning and transaction evidence

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G04 — Canonical semantic registry / aliases

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G05 — Privileged reviewed UNKNOWN reconciliation

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G06 — Administrator-resistant audit storage

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G07 — Guarded integration at every runner / CI entrypoint

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G08 — Installed Skill identity and invocation evidence

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G09 — Global D04 history and capacity reconciliation

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G10 — Qualified security / privacy / clinical reviews

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G11 — Scope for DB / credentials / networking provisioning

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## D05-G12 — Verifier object provenance / service trust boundary

**สถานะ: SCOPE_ASSESSMENT_PENDING**

ข้อเท็จจริง: Known outstanding boundary in supplied D05 architecture; current deployed state not inspected.

หลักฐาน: `E-D05-ARCH`

เกณฑ์จบ: Assess whether selected demo exercises this boundary; disclose mock/deferred behavior and any blocker.

## BASELINE-RECONCILIATION — Historical Phase 1 baseline versus later W0 evidence

**สถานะ: OPEN_APPLICABILITY_RECONCILIATION**

ข้อเท็จจริง: main EC-000 records Phase 1 baseline verified in September. Later supplied reconciliation requires G03/RISK008/W0 OPEN. Preserve original entry; do not infer current W0 closure or reclassify historical results.

หลักฐาน: `E-REMOTE-DOCS-EVIDENCE_CHAIN-MD`, `E-AMENDMENT`

เกณฑ์จบ: Bind demo to exact source version and assess historical evidence applicability.

## Evidence index

| ID | Artifact | SHA-256 | Bytes |
|---|---|---|---:|
| E-AOC | 18-HYDRA_Agent_Operating_Contract_v0.4_OWNER_SIGNED_2026-10-12.md | `848cbd16ab1626ccd1046d174c786054df14620fbe1bb18c21332e26164d34a4` | 115456 |
| E-ACCEPTANCE | TEST-ACCEPTANCE-PLAN.md | `2c17502060bc073432e0e1abe995fc45fc6ff74a22e6e7540e2bb0e94201d6d6` | 3826 |
| E-MANIFEST | manifest.json | `9c3958de8e89c57eb9c734cd809c339e99cf269783f0919def57cf1939bf715d` | 23636 |
| E-AMENDMENT | HOLD-REVIEW-AMENDMENT.json | `71ae4d9cb5081d75424ca48607fb7512c664d9e6b4002ecf5d9d455ef6eb55e3` | 11376 |
| E-ACCOUNTING | ACCOUNTING-REVIEW.json | `9bab5db0c2f22f5c6412b210b4a600980b383c901aa596c9f90097e8dcce4326` | 19957 |
| E-REVIEW | REVIEW-RESPONSE.json | `698f53a121b65382f0089573ec65d5e91091180397d008b933bb9945702a575a` | 12692 |
| E-INSTALL | D05_PACKAGE_SETUP_RESULT_20261015T001837967196Z.zip | `598fb41a0e44397eee6109c87d35435516a2dc4e359544cc46e370448c648f6e` | 33196 |
| E-G03-RAW | G03_CLINICAL_NFKC_RESULT_20261014T225727290052Z.zip | `01f7baa8c77929aba67723a4e29e68677d0b73ce4b463c9548614b4f26fe1514` | 3779917 |
| E-G03-REVIEW | G03_CLINICAL_R3_VERIFIED_RESULT_TH_2026-10-15.md | `f94ded325ceb8a964ff9dcc67a0fcdfa2d3c1a82171e6f082f1b6232c4046d81` | 5483 |
| E-G03-HEAVY | G03_R4_VERIFIED_REVIEW_PACKET_TH_2026-10-14.md | `8acd179c35dbc49c2eb55ea1564ef4bf83e0424174298b7be5127fe8aa3650fe` | 21438 |
| E-RUNNER | run_bootstrap.py | `65f3e89c22d44a9cf74acf1d949ec01c58045deb440032273b065672ede0f83e` | 6539 |
| E-CHILD | child.py | `3ea5a68416fc4b2e6bb83a0d917b0665f6ca28b24e45c6fc7ab531fb5fe89783` | 2218 |
| E-CANDIDATE-RUNNER | runner.py | `7a85a0d2cbd8eabc49535901e17a55f1722b75b46ea3c34b3da9aa90570f1d89` | 541 |
| E-D05-ARCH | ARCHITECTURE-AND-GAPS.md | `9e7f24b547d71826cb808d0819b84a3b35b218ee5735f44d326de7b778f7b687` | 7201 |
| E-SNAPSHOT | 15-HYDRA-MESH-CURRENT-SNAPSHOT-2026-10-11.zip | `4f36a091155786de46c175f48b6e9ba20daae08eb10f75f0563215e53ae87370` | 4025271 |
| E-REMOTE-README-MD | README.md | `718c9d419388db11915dc2b28754657ed0c8f79973e83fd352ff587b5cebbe5a` | 17173 |
| E-REMOTE--GITHUB-WORKFLOWS-HYDRA-LIVE-TEST-YML | .github/workflows/hydra-live-test.yml | `a84deaa35bb32d9cb8f3bfd0ba0773884f3c57ddd0e5e73a9f681ef6ac308ea8` | 185 |
| E-REMOTE-DOCS-RISK_REGISTER-MD | docs/RISK_REGISTER.md | `9589c766a86d711fbfa3183445eb0e038877984f7b66833ff04e1550f9e9f352` | 8936 |
| E-REMOTE-DOCS-PHASE_2_PLAN-MD | docs/PHASE_2_PLAN.md | `0ad4be6450480875c04b90f54c2f8c0e87a9d7c5a51cb2b7515cbd0d6ac52a0c` | 24651 |
| E-REMOTE-DOCS-EVIDENCE_CHAIN-MD | docs/EVIDENCE_CHAIN.md | `cc114631fe820cb07cf5941d2aab26e5b28e494d101cf9816ebfe87f026ff024` | 5255 |
| E-REMOTE-PHASE1_FREEZE_RUNBOOK-MD | PHASE1_FREEZE_RUNBOOK.md | `b7a5a662c56fbc8579bc87824f3b9d6bf3157e722835f91b7e5c2addbfcf6a5a` | 2585 |
| E-REMOTE-PRODUCTION_ROADMAP-MD | PRODUCTION_ROADMAP.md | `dcf40728b5144d01d771e1d8a8e97e63ea3e858f52e23ba30e259c0ab78ca9c5` | 98635 |

Artifacts อ้างถึง supplied project files; raw/private evidence ไม่ถูกคัดลอกเข้า Repo โดยแพ็กนี้
Hash ระบุ bytes ไม่ใช่ identity proof และไม่ได้รับรอง current GitHub HEAD

## Shared change events

- **EV-OWNER-DIRECTION**: Owner delegated dual-track plans/documents and GitHub documentation update.
  ผลต่อขอบเขตนี้: Create demo-specific acceptance/status with shared facts.
- **EV-R1-BASELINE**: Read supplied review/source documents; normalized known findings without D05 runtime execution.
  ผลต่อขอบเขตนี้: No demo acceptance claimed; review deferral recorded and actual execution blockers retained.
- **EV-R2-REMOTE-INSPECTION**: Inspected main HEAD/tree, seven pinned files and two open Draft PR metadata records; no AGENTS.md in complete inspected main tree; docs/assurance path absent; one manual-only workflow.
  ผลต่อขอบเขตนี้: Scope based on actual main tree; document delivery can proceed without auto-dispatching inspected workflow.
- **EV-R2-GITHUB-PUBLISHED**: Draft PR #3 created from docs/demo-production-readiness-20261015 into main; 19 changed files; not merged. Initial tree contents checked against local Git blob identities.
  ผลต่อขอบเขตนี้: Documents available for Owner review; no demo runtime PASS implied.
