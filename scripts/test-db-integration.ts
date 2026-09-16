// ทดสอบ human-review-queue.ts ตัวจริงที่คุยกับ SQLite ผ่าน Prisma
//
// ต้องรันตามลำดับนี้ก่อนถึงจะใช้ได้ (sandbox ที่ Claude สร้างไฟล์นี้ไม่มี network
// เลยรันให้ดูตอนเขียนโค้ดไม่ได้ — ต้องรันเองในเครื่อง):
//   1. npm install
//   2. npm run db:migrate      (สร้าง prisma/dev.db + apply schema.prisma)
//   3. npm run test:db
//
// ไฟล์นี้เขียน record จริงลง dev.db ของเครื่องที่รัน — ไม่ใช่ unit test ที่ isolate
// เต็มรูปแบบ รันซ้ำได้เรื่อยๆ (ข้อมูลทดสอบจะสะสม ลบ dev.db เองได้ถ้าอยากเริ่มใหม่)

import { flagForHumanReview, getReviewQueue, acknowledgeReviewItem } from "../lib/clinical/human-review-queue";
import { getOrCreatePatientKey, encryptForPatient, decryptForPatient } from "../lib/patient-encryption";

async function testPatientEncryptionWithDb() {
  console.log("\n=== Patient encryption envelope (ต้องมี PATIENT_DATA_MASTER_KEY ใน .env) ===");
  const patientId = `test-patient-${Date.now()}`;

  const key1 = await getOrCreatePatientKey(patientId);
  const key2 = await getOrCreatePatientKey(patientId); // เรียกซ้ำ ต้องได้ DEK เดิม ไม่สร้างใหม่
  console.log(`[${key1 === key2 ? "PASS" : "FAIL"}] getOrCreatePatientKey คืน DEK เดิมทุกครั้งที่เรียกซ้ำ (ไม่สร้างใหม่)`);

  const original = "ทดสอบเข้ารหัสบทสนทนาจริงผ่าน DB";
  const encrypted = await encryptForPatient(patientId, original);
  const decrypted = await decryptForPatient(patientId, encrypted);
  console.log(`[${decrypted === original ? "PASS" : "FAIL"}] encryptForPatient → decryptForPatient ได้ข้อความเดิมเป๊ะ ผ่าน DB จริง`);
}

async function main() {
  console.log("=== human-review-queue.ts (Prisma + SQLite จริง) ===");

  const critical = await flagForHumanReview({
    patientId: `test-patient-critical-${Date.now()}`,
    source: "screening_8q",
    reason: "ทดสอบ 8Q",
    riskLevel: "critical",
  });
  console.log(
    `[${
      critical.severity === "critical" && critical.notifyImmediately ? "PASS" : "FAIL"
    }] flagForHumanReview คำนวณ severity จาก riskLevel ให้อัตโนมัติ (ไม่ต้องส่ง severity มาเอง)`
  );

  // สร้างรายการ medium ตามหลัง critical เพื่อเช็คว่า sort ทำงานถูก (ใหม่กว่าแต่ severity ต่ำกว่า)
  await new Promise((r) => setTimeout(r, 10));
  const medium = await flagForHumanReview({
    patientId: `test-patient-medium-${Date.now()}`,
    source: "chat_risk_engine",
    reason: "ทดสอบ chat",
    riskLevel: "moderate",
  });

  const queue = await getReviewQueue();
  const criticalFirst = queue[0]?.id === critical.id;
  console.log(
    `[${criticalFirst ? "PASS" : "FAIL"}] getReviewQueue เรียง critical (notifyImmediately) ขึ้นก่อนแม้จะเก่ากว่า medium ที่สร้างทีหลัง`
  );

  const ackOk = await acknowledgeReviewItem(medium.id);
  console.log(`[${ackOk ? "PASS" : "FAIL"}] acknowledgeReviewItem คืน true เมื่อ id มีอยู่จริง`);

  const ackMissing = await acknowledgeReviewItem("does-not-exist");
  console.log(`[${!ackMissing ? "PASS" : "FAIL"}] acknowledgeReviewItem คืน false เมื่อ id ไม่มีอยู่จริง`);

  console.log(`\nรวม ${queue.length} record ใน dev.db ตอนนี้ (สะสมจากทุกครั้งที่เคยรัน test นี้)`);

  await testPatientEncryptionWithDb();
}

main().catch((err) => {
  console.error("test-db-integration failed:", err);
  process.exit(1);
});
