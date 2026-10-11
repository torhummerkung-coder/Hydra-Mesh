// G-03 option A — เทสความเทียบเท่าของ decryptManyForPatient เทียบกับวิธีเดิม (decryptForPatient ทีละแถว)
//
// พิสูจน์ (ตาม acceptance criteria A1–A4, A6 ของเอกสารออกแบบ G-03):
//   A1 ผลถอดรหัสตรงกับ known plaintext และตรงกับวิธีเดิมทุกแถว
//   A2 จำนวน PBKDF2 ต่อการอ่าน: วิธีเดิม = 2N, A = N+1 (นับด้วย counter ไม่ใช่ประมาณ)
//   A3 ไม่เปลี่ยน format: ciphertext จาก encryptForPatient เดิมถอดได้ด้วย A (ฝั่งเข้ารหัสไม่ถูกแตะ)
//   A4 DEK ไม่ถูกเก็บข้ามการเรียก: อ่านซ้ำต้อง unwrap ใหม่ทุกครั้ง (นับได้เท่าเดิมทุกรอบ)
//   A6 ข้อผิดพลาดยัง reject ไม่คืนค่าผิดเงียบๆ (คนละผู้ป่วย / shard เสีย) และไม่เผยเนื้อหา
//   + ผู้ป่วยที่ไม่มีแถว: ไม่ unwrap และไม่สร้างคีย์ใหม่ตอนอ่าน
//
// วิธีรัน (ฐานข้อมูลสังเคราะห์เท่านั้น — เขียนแถวทดสอบลง DB ที่ .env.local ชี้):
//   cd <โฟลเดอร์ Hydra-Mesh> && set -a && . ./.env.local && set +a
//   NODE_ENV=test node --import tsx scripts/test-decrypt-many-equivalence.ts
// exit code = 1 ถ้ามี [FAIL] แม้แต่ข้อเดียว (ต่างจากเทสเก่าบางตัวที่พิมพ์ FAIL แต่ exit 0)

import { prisma } from "../lib/db";
import { getConversationHistory } from "../lib/clinical/conversation-store";
import { getScreeningHistory } from "../lib/clinical/screening-store";
import { encryptForPatient, decryptForPatient, decryptManyForPatient } from "../lib/patient-encryption";

let failures = 0;
function check(ok: boolean, label: string) {
  if (!ok) failures++;
  console.log(`[${ok ? "PASS" : "FAIL"}] ${label}`);
}

// นับ PBKDF2 (310,000 รอบ) ที่เริ่มทำงาน — ทุกการ unwrap DEK และทุกการถอดข้อความผ่าน deriveKey นี้
let pbkdf2Started = 0;
const subtle = globalThis.crypto.subtle;
const origDeriveKey = subtle.deriveKey.bind(subtle);
subtle.deriveKey = function (algo: any, ...rest: any[]) {
  if (algo && String(algo.name).toUpperCase() === "PBKDF2") pbkdf2Started++;
  return (origDeriveKey as any)(algo, ...rest);
} as typeof subtle.deriveKey;
async function counted<T>(fn: () => Promise<T>): Promise<{ value: T; pbkdf2: number }> {
  const before = pbkdf2Started;
  const value = await fn();
  return { value, pbkdf2: pbkdf2Started - before };
}

type EncRow = { encryptedShards: string };
const N = 12; // จำนวนข้อความ
const M = 4; // แถวต่อชนิดแบบสอบถาม
const msg = (i: number) => `ข้อความจำลอง #${i} ทดสอบความเทียบเท่า`;

async function seed(patientId: string) {
  // เรียงลำดับ ไม่ขนาน — การสร้าง DEK ครั้งแรกต้องไม่แข่งกัน (พฤติกรรมเดิมของโปรเจกต์)
  for (let i = 0; i < N; i++) {
    await prisma.conversationMessage.create({
      data: { patientId, role: i % 2 === 0 ? "user" : "assistant", encryptedShards: await encryptForPatient(patientId, msg(i)), createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)) },
    });
  }
  for (const q of ["9Q", "8Q"] as const) {
    for (let i = 0; i < M; i++) {
      const body = { resourceType: "QuestionnaireResponse", id: `eq-${q}-${i}`, questionnaire: q, totalScore: i, synthetic: true };
      await prisma.screeningResponse.create({
        data: { patientId, questionnaire: q, encryptedShards: await encryptForPatient(patientId, JSON.stringify(body)), createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)) },
      });
    }
  }
}

async function main() {
  const A = `test-equiv-A-${Date.now()}`;
  const B = `test-equiv-B-${Date.now()}`;
  const EMPTY = `test-equiv-empty-${Date.now()}`;
  await seed(A);
  await prisma.conversationMessage.create({ data: { patientId: B, role: "user", encryptedShards: await encryptForPatient(B, "ข้อมูลของ B"), createdAt: new Date() } });

  console.log("=== A1: ผลตรงกับ known plaintext และตรงกับวิธีเดิมทีละแถว ===");
  const rows = await prisma.conversationMessage.findMany({ where: { patientId: A }, orderBy: { createdAt: "asc" } });
  const legacy = await Promise.all(rows.map((r: EncRow) => decryptForPatient(A, r.encryptedShards)));
  const viaMany = await decryptManyForPatient(A, rows.map((r: EncRow) => r.encryptedShards));
  check(JSON.stringify(viaMany) === JSON.stringify(legacy), "decryptManyForPatient ตรงกับ decryptForPatient ทีละแถว (ลำดับเดียวกัน)");
  check(JSON.stringify(viaMany) === JSON.stringify(Array.from({ length: N }, (_, i) => msg(i))), "ผลตรงกับ known plaintext ทุกแถว");
  const hist = await getConversationHistory(A);
  check(hist.length === N && hist.every((m, i) => m.content === msg(i) && m.role === (i % 2 === 0 ? "user" : "assistant")), "getConversationHistory คืนเนื้อหา/role/ลำดับเดิมครบ");
  const last3 = await getConversationHistory(A, 3);
  check(last3.length === 3 && last3.map((m) => m.content).join("|") === [N - 3, N - 2, N - 1].map(msg).join("|"), "limit=3 คืน 3 ข้อความล่าสุดเรียงเก่า→ใหม่ (พฤติกรรมเดิม)");
  const nine = await getScreeningHistory(A, "9Q");
  const eight = await getScreeningHistory(A, "8Q");
  const nineLegacy = await Promise.all((await prisma.screeningResponse.findMany({ where: { patientId: A, questionnaire: "9Q" }, orderBy: { createdAt: "asc" } })).map(async (r: EncRow) => JSON.parse(await decryptForPatient(A, r.encryptedShards))));
  check(nine.length === M && JSON.stringify(nine) === JSON.stringify(nineLegacy) && eight.length === M && eight.every((r) => r.questionnaire === "8Q"), "getScreeningHistory 9Q/8Q ตรงกับวิธีเดิม ไม่ปนชนิด");

  console.log("\n=== A2: จำนวน PBKDF2 ต่อการอ่าน (นับจริง) ===");
  const legacyCost = await counted(() => Promise.all(rows.map((r: EncRow) => decryptForPatient(A, r.encryptedShards))));
  const newCost = await counted(() => getConversationHistory(A));
  console.log(`   วิธีเดิม ${legacyCost.pbkdf2} ครั้ง · A ${newCost.pbkdf2} ครั้ง (N=${N})`);
  check(legacyCost.pbkdf2 === 2 * N, `วิธีเดิม = 2N = ${2 * N}`);
  check(newCost.pbkdf2 === N + 1, `A = N+1 = ${N + 1}`);
  const scrCost = await counted(() => getScreeningHistory(A, "9Q"));
  check(scrCost.pbkdf2 === M + 1, `getScreeningHistory = M+1 = ${M + 1}`);

  console.log("\n=== A4: DEK ไม่ถูกเก็บข้ามการเรียก ===");
  const again1 = await counted(() => getConversationHistory(A));
  const again2 = await counted(() => getConversationHistory(A));
  check(again1.pbkdf2 === N + 1 && again2.pbkdf2 === N + 1, `อ่านซ้ำสองครั้งต้อง unwrap ใหม่ทุกครั้ง (ได้ ${again1.pbkdf2} และ ${again2.pbkdf2} ต้องเท่ากับ ${N + 1} ทั้งคู่ ไม่ใช่ ${N})`);

  console.log("\n=== ผู้ป่วยที่ไม่มีแถว: ไม่ unwrap และไม่สร้างคีย์ตอนอ่าน ===");
  const empty = await counted(() => getConversationHistory(EMPTY));
  const keyAfter = await prisma.patientDataKey.findUnique({ where: { patientId: EMPTY } });
  check(empty.value.length === 0 && empty.pbkdf2 === 0 && keyAfter === null, "ไม่มีแถว → [] , PBKDF2 = 0, ไม่สร้าง PatientDataKey");

  console.log("\n=== A6: ข้อผิดพลาดต้อง reject ไม่คืนค่าผิดเงียบๆ ===");
  const rowA = rows[0];
  let crossRejected = false;
  try { await decryptManyForPatient(B, [rowA.encryptedShards]); } catch { crossRejected = true; }
  check(crossRejected, "decryptManyForPatient(B, ciphertext-ของ-A) ต้อง throw (DEK คนละอัน)");
  let corruptRejected = false; let leaked = false;
  try { await decryptManyForPatient(A, [rowA.encryptedShards, "{not-json"]); } catch (e) { corruptRejected = true; leaked = String((e as Error)?.message ?? "").includes(msg(0)); }
  check(corruptRejected && !leaked, "shard เสียหนึ่งแถว → ทั้งก้อน reject และข้อความ error ไม่มีเนื้อหาผู้ป่วย");

  console.log(`\nสรุป: ${failures === 0 ? "ผ่านทุกข้อ" : `ล้ม ${failures} ข้อ`}`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("test-decrypt-many-equivalence failed:", err && err.name);
  try { await prisma.$disconnect(); } catch { /* ignore */ }
  process.exit(1);
});
