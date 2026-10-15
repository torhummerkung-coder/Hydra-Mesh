# Host evidence collection plan — NOT_EXECUTED

เป้าหมาย: พิสูจน์ target environment และข้อจำกัดที่ใช้จริงก่อน workload เริ่ม
ไม่มีคำสั่งติดตั้งหรือปรับ firewall อัตโนมัติในชุดนี้

| Control | หลักฐานที่ต้องเก็บ | เกณฑ์รับ | ข้อจำกัด |
|---|---|---|---|
| Exact pin | Python/executable hash, distribution metadata/file hashes, preflight algorithm/version | ตรง selected manifest/decision ก่อน dispatch | metadata ไม่พิสูจน์การใช้งาน crypto จริง |
| Data isolation | mount/storage inventory และ synthetic input manifest | ไม่มี production data/PHI/secrets mounts ที่ workload เข้าถึงได้ | Owner statement อย่างเดียวไม่เท่ากับตรวจ access |
| Network | effective OS-level rule/namespace/route และ scoped probe evidence | outbound/ingress ตรง deny/allowlist ที่กำหนดก่อนรัน | เปิด airplane mode หรือ audit hook อย่างเดียวไม่พิสูจน์ทั้ง boundary |
| File access | user/permissions/read-only source และ output allowlist | workload เขียนได้เฉพาะ run output ที่กำหนด | privileged/native code อาจข้าม Python hook |
| Exclusive control | operator/host identity, lock/fencing evidence, active runner inventory | ไม่มี competing authorized runner ใน accounting scope; stale owner ถูกกัน | local lock ไม่พิสูจน์ cross-host exclusion |
| Resource containment | effective CPU/memory/wall/output/process limits และ cleanup observations | ตรง frozen bounds; crash/timeout ไม่มี orphan ที่ไม่ติดตาม | coded limits ยังไม่ใช่ observed enforcement |
| Recovery | durable reservation/journal และ previous-run inspection | unknown ไม่ rerun/refund; previous processes ถูกตรวจ | absence of END ไม่พิสูจน์ never-started |

existing setup reports: Python 3.14.4, cryptography 47.0.0, cffi 2.1.1, pycparser 3.11
หลักฐาน setup เป็น supplied target-host artifact; ไม่ใช่ inventory ปัจจุบันของเครื่องที่จัดทำเอกสารนี้
ถ้าเลือก Linux VM ใหม่ ต้องออก exact pin ใหม่; ไม่เอา hash ของเครื่องเก่ามาใช้
บันทึกทุก probe ว่าเป็น host-control verification และนับตาม policy ที่ใช้ ห้ามรัน probe แฝงใน document build
