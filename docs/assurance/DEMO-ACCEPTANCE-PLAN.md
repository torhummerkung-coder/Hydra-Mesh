# Demo acceptance plan — documentation R4

สถานะ: PROPOSED_ACCEPTANCE / NOT_RUN. นี่เป็นแผน ไม่ใช่ preregistration หรือสิทธิ์เริ่มทดสอบ
Source ที่อ่าน: main `295893a7e4cc6f32839eb8a90d1ced5cae963866` ไม่รวม code ใน Draft PR #1/#2

## สิ่งที่พบใน source ปัจจุบัน

- `pages/index.tsx`: credential login และ opt-in demo login; patient -> companion, doctor/staff -> dashboard, security -> security
- Source ระบุ admin ยังไม่มี destination page; ไม่อ้างว่ามี Admin UI ครบใน main
- `pages/companion.tsx`: patient conversation view, screening navigation และ logout; runtime behavior ยังไม่ได้ตรวจรอบนี้
- `pages/dashboard.tsx`: assigned patient list, review queue, health และ patient summary requests; test scope ต้องตรวจ cross-patient/stale response
- `package.json`: มีคำสั่ง `demo:tier1` อยู่แล้ว การมี script ไม่เท่ากับเคยรันหรือผ่าน และไม่ได้เรียกจากรอบเอกสารนี้
- Four-role UI prototype ที่ Owner เลือกเป็น foundation เป็นอีก artifact; ต้องยืนยัน exact source ก่อน integrate โดยรักษา UI เดิม ไม่ redesign โดยพลการ

## เกณฑ์ที่เสนอสำหรับ demo ภายใน

ทุกแถวด้านล่างเป็น scenario label ของแผน ไม่ใช่ canonical case ID ใหม่ และผลปัจจุบัน NOT_RUN ทั้งหมด
ก่อนรันต้องผูก historical canonical lineage, budget, source/env, selected controller/admission route และ Owner scope ที่ใช้จริง

| Scenario label | สิ่งที่จะสาธิต / negative path | เกณฑ์รับที่เสนอ | หลักฐานที่ต้องเก็บ |
|---|---|---|---|
| DEMO-LOGIN | Credential และ opt-in demo login | บัญชี synthetic เข้าหน้าตาม role; invalid credentials ไม่ได้ session; demo disabled ไม่เปิดทางลัด | source/env identity, observed route/status, redacted evidence |
| DEMO-SESSION | Logout / unauthenticated access | Logout แล้ว protected access ถูกปฏิเสธตาม current contract; ไม่เห็นข้อมูลเก่าจาก session อื่น | status/redirect + state observations |
| DEMO-PATIENT | Synthetic conversation | แสดงข้อความและผลตอบกลับตาม contract; ผูก context ของผู้ป่วยปัจจุบัน; ประกาศ mock/provider path ตามจริง | input/outcome provenance, no real PHI |
| DEMO-FALLBACK | Provider unavailable / timeout | มี bounded fallback ตาม contract; ไม่อ้าง provider response หรือ handoff ที่ยังไม่เกิด | actual mode/status/events, failure retained |
| DEMO-RETRY | Reconnect / repeated message | รักษา message identity และไม่สร้าง duplicate effect ตาม contract ที่เลือก | event IDs/receipt/state before-after |
| DEMO-SCREENING | Synthetic screening input/boundary | ค่าตรง scoring contract ที่มีอยู่; invalid input ถูกปฏิเสธ; ไม่อ้าง diagnosis/clinical certification | fixtures + expected/observed + exact scoring version |
| DEMO-CLINICIAN | Assigned versus unassigned patient | แสดงและอ่านได้เฉพาะสิทธิ์ที่มีจริง; denial ไม่คืนข้อมูลอีกผู้ป่วย | assignment setup, authorized/denied responses |
| DEMO-SUMMARY | Summary and source/fallback | ผูก summary กับ patient ที่เลือก พร้อม source/disclaimer และ unavailable state ที่ตรงจริง | source IDs + observed summary status |
| DEMO-CONTEXT-SWITCH | เปลี่ยน patient / ปิด modal ขณะ request ค้าง | Response เก่าไม่แสดงทับ patient ใหม่หรือ modal ที่ปิด; ถ้าไม่ผ่านให้เก็บ defect เป็น demo blocker | ordered request/response/UI observations |
| DEMO-ACK | Review queue / acknowledgement | รับทราบโดย role/assignment ที่มีสิทธิ์เท่านั้น; ห้ามแสดง acknowledged ก่อนมีหลักฐาน | transition/actor/receipt refs |
| DEMO-HEALTH | Degraded/unknown component state | UI ไม่แสดง healthy จากข้อมูลที่ขาด/ล้มเหลว; อธิบายขอบเขต per-process ตาม source | observed UI + component state |
| DEMO-ADMIN-BOUNDARY | Admin prototype versus main | เปิดเผยว่า main ยังไม่มี Admin destination; ถ้าเลือกสาธิต prototype ต้องติด label และไม่อ้าง backend integration | selected artifact identity + walkthrough scope |

## Definition of Done

1. เลือก exact demo artifact และ flow ที่รวมจริง; รับรอง checklist ก่อนเห็นผลรัน
2. ทุก selected flow มี expected/observed และผล PASS/FAIL/INCONCLUSIVE พร้อม evidence refs; ไม่ปิดภาพรวมด้วย unit tests อย่างเดียว
3. Failures ที่กระทบ privacy, patient isolation, authority, clinical claims หรือ selected flow ต้องแก้และทวนตาม budget หรือยกเลิก flow อย่างชัดเจนก่อน acceptance
4. Preserve source/oracle/env/controller/run logs และการเปลี่ยน scope; hash mismatch/unknown start ไม่ rerun อัตโนมัติ
5. Owner รับผล internal demo โดยระบุข้อจำกัด; production report ได้ events เดียวกันแต่ยังเก็บ deferred reviews/real-integration gaps

## ขอบเขตที่ไม่ขยายจากแผนนี้

ไม่เปลี่ยน clinical thresholds, auth/revocation, crypto/ciphertext, deadlines หรือ UI foundation เพื่อทำให้ demo ผ่าน
Admin implementation, source integration, provider credentials, provisioning และ actual dispatch ยังต้องตรง work package/สิทธิ์ที่ระบุ
Independent review เลื่อนสำหรับ demo ได้ตาม direction; ไม่ทำให้ unknown budget หรือ missing isolation/admission ผ่านเอง

## R5 priority clarification

ใช้ [Demo closeout](DEMO-CLOSEOUT.md) กำหนดลำดับ และ [defect design](DEMO-DEFECTS.md) สำหรับ context-switch work
ก่อน workload ที่มี accounting/admission บังคับ ต้องทำตามเงื่อนไขของ workload นั้น; ไม่ใช้ prerequisites ของ D05 เป็นข้อห้ามจัดทำ Demo ทุกส่วน
Scenario เดิมยัง NOT_RUN; ไม่ลดขอบเขตเงียบ ๆ และไม่ใช้ demo:tier1 CLI simulation แทนการรับงาน UI
