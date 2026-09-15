// ทดสอบ conversation-store.ts และ screening-store.ts — สอง store ใหม่ที่ wire
// encryption เข้า DB จริงในรอบนี้ (v2 Phase 1: "เข้ารหัส DB จริง — conversation
// history + 9Q/8Q")
//
// ต้องรันตามลำดับนี้ก่อนถึงจะใช้ได้ (เหมือน test-db-integration.ts):
//   1. npm install
//   2. npm run db:migrate      (สร้าง/อัพเดต prisma/dev.db ให้มี ConversationMessage
//                                และ ScreeningResponse ตาม schema.prisma ใหม่)
//   3. ตั้งค่า PATIENT_DATA_MASTER_KEY ใน .env.local (ดู .env.example)
//   4. npm run test:clinical-data-encryption
//
// ไฟล์นี้เขียน record จริงลง dev.db ของเครื่องที่รัน — รันซ้ำได้เรื่อยๆ (ข้อมูล
// ทดสอบสะสมได้ ลบ dev.db เองได้ถ้าอยากเริ่มใหม่)

import { saveMessage, saveTurn, getConversationHistory } from "../lib/clinical/conversation-store";
import { saveScreeningResponse, getScreeningHistory } from "../lib/clinical/screening-store";
import { buildNineQResponse } from "../lib/clinical/screening-9q";
import { buildEightQResponse } from "../lib/clinical/screening-8q";
import { decryptForPatient } from "../lib/patient-encryption";
import { prisma } from "../lib/db";

async function testConversationRoundTrip() {
  console.log("=== ConversationMessage: บันทึกแบบเข้ารหัส แล้วอ่านกลับได้ข้อความเดิมเป๊ะ ===");
  const patientId = `test-convo-${Date.now()}`;

  await saveTurn(patientId, "วันนี้รู้สึกเหนื่อยมาก อยากคุยด้วย", "ฟังดูเหนื่อยเลยนะ เล่าให้ฟังได้ไหมว่าเหนื่อยเรื่องอะไร");
  await saveMessage(patientId, "user", "เรื่องงานเป็นหลัก");

  const history = await getConversationHistory(patientId);
  const roles = history.map((m) => m.role).join(",");
  const contentsMatch =
    history[0]?.content === "วันนี้รู้สึกเหนื่อยมาก อยากคุยด้วย" &&
    history[1]?.content === "ฟังดูเหนื่อยเลยนะ เล่าให้ฟังได้ไหมว่าเหนื่อยเรื่องอะไร" &&
    history[2]?.content === "เรื่องงานเป็นหลัก";

  console.log(`[${history.length === 3 ? "PASS" : "FAIL"}] ได้ 3 ข้อความกลับมาตามที่บันทึกไว้ (มี ${history.length})`);
  console.log(`[${roles === "user,assistant,user" ? "PASS" : "FAIL"}] เรียงลำดับเก่า→ใหม่ถูกต้อง (${roles})`);
  console.log(`[${contentsMatch ? "PASS" : "FAIL"}] เนื้อหาทุกข้อความตรงกับต้นฉบับเป๊ะหลัง decrypt กลับมา`);

  // เช็คว่า DB เก็บเป็น ciphertext จริง ไม่ใช่ plaintext แอบหลงเหลืออยู่
  const rawRow = await prisma.conversationMessage.findFirst({ where: { patientId, role: "user" } });
  const looksEncrypted =
    !!rawRow && !rawRow.encryptedShards.includes("เหนื่อยมาก") && rawRow.encryptedShards.includes("ciphertext");
  console.log(`[${looksEncrypted ? "PASS" : "FAIL"}] แถวใน DB ไม่มี plaintext หลงเหลือ (เป็น HydraShard JSON จริง)`);
}

async function testConversationHistoryLimit() {
  console.log("\n=== ConversationMessage: limit คืนแค่ N ข้อความล่าสุด (ไม่ใช่ N ข้อความเก่าสุด) ===");
  const patientId = `test-convo-limit-${Date.now()}`;

  for (let i = 1; i <= 5; i++) {
    await saveMessage(patientId, i % 2 === 1 ? "user" : "assistant", `ข้อความที่ ${i}`);
  }

  const last2 = await getConversationHistory(patientId, 2);
  const correct = last2.length === 2 && last2[0].content === "ข้อความที่ 4" && last2[1].content === "ข้อความที่ 5";
  console.log(
    `[${correct ? "PASS" : "FAIL"}] limit=2 คืนข้อความที่ 4,5 (ล่าสุด) ไม่ใช่ 1,2 (เก่าสุด) — ได้: ${last2
      .map((m) => m.content)
      .join(" | ")}`
  );
}

async function testCrossPatientIsolation() {
  console.log("\n=== ConversationMessage: ผู้ป่วยคนหนึ่งต้องถอดรหัสข้อมูลของอีกคนไม่ได้ ===");
  const patientA = `test-isolation-a-${Date.now()}`;
  const patientB = `test-isolation-b-${Date.now()}`;

  await saveMessage(patientA, "user", "ความลับของผู้ป่วย A");
  const rowA = await prisma.conversationMessage.findFirst({ where: { patientId: patientA } });

  let blocked = false;
  try {
    // จงใจเอา ciphertext ของ A มา decrypt ด้วย DEK ของ B (คนละคน คนละ DEK)
    await decryptForPatient(patientB, rowA!.encryptedShards);
  } catch {
    blocked = true;
  }
  console.log(
    `[${blocked ? "PASS" : "FAIL"}] decryptForPatient(B, ciphertext-ของ-A) ต้อง throw ไม่ใช่คืนค่าผิดเงียบๆ (DEK คนละอันกัน)`
  );
}

async function testScreeningRoundTrip() {
  console.log("\n=== ScreeningResponse: 9Q/8Q บันทึกแบบเข้ารหัส แล้วอ่านกลับได้ totalScore ตรงเป๊ะ ===");
  const patientId = `test-screening-${Date.now()}`;

  const nineQAnswers = [2, 2, 1, 1, 0, 1, 0, 0, 0]; // total = 7 → requires8Q
  const nineQResponse = buildNineQResponse(patientId, nineQAnswers);
  await saveScreeningResponse(patientId, nineQResponse);

  const eightQAnswers = {
    item1: 1 as const,
    item2: 1 as const,
    item3: 1 as const,
    item3Control: 1 as const, // คุมไม่ได้ = +8
    item4: 1 as const,
    item5: 0 as const,
    item6: 0 as const,
    item7: 0 as const,
    item8: 0 as const,
  };
  // 1+2+6+8+8 = 25 → >= 17 (urgent)
  const eightQResponse = buildEightQResponse(patientId, eightQAnswers);
  await saveScreeningResponse(patientId, eightQResponse);

  const nineQHistory = await getScreeningHistory(patientId, "9Q");
  const eightQHistory = await getScreeningHistory(patientId, "8Q");

  console.log(
    `[${nineQHistory.length === 1 && nineQHistory[0].totalScore === 7 ? "PASS" : "FAIL"}] 9Q อ่านกลับมาได้ 1 รายการ totalScore=7 ตรงกับที่คำนวณไว้`
  );
  console.log(
    `[${
      eightQHistory.length === 1 && eightQHistory[0].totalScore === 25 ? "PASS" : "FAIL"
    }] 8Q อ่านกลับมาได้ 1 รายการ totalScore=25 ตรงกับที่คำนวณไว้ (>= 17 เกณฑ์ urgent)`
  );

  // เช็คว่าแยกชนิดคำถามถูกต้อง — ขอ 9Q ต้องไม่ได้ผลของ 8Q ปนมา
  const noCrossContamination = nineQHistory.every((r) => r.questionnaire === "9Q");
  console.log(`[${noCrossContamination ? "PASS" : "FAIL"}] getScreeningHistory(patientId, "9Q") ไม่ปนผล 8Q มาด้วย`);
}

async function main() {
  await testConversationRoundTrip();
  await testConversationHistoryLimit();
  await testCrossPatientIsolation();
  await testScreeningRoundTrip();
  console.log(
    "\nหมายเหตุ: ต้องรัน npm run db:migrate หลังอัพเดต schema.prisma รอบนี้ก่อน " +
      "(เพิ่ม model ConversationMessage/ScreeningResponse) ไม่งั้น prisma.conversationMessage " +
      "จะไม่มีอยู่จริงและ error ทันที"
  );
}

main().catch((err) => {
  console.error("test-clinical-data-encryption failed:", err);
  process.exit(1);
});
