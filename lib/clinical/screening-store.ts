// เก็บผลตอบแบบสอบถาม 9Q/8Q แบบเข้ารหัสเสมอ (envelope encryption ผ่าน
// lib/patient-encryption.ts) — เก็บทั้ง QuestionnaireResponse เป็น JSON ก้อนเดียว
// เพราะทุกจุดที่อ่านกลับ (trend chart ในอนาคต, Clinical Summary Agent) ใช้ทั้งก้อน
// เสมอ ไม่มี query filter รายข้อย่อย
//
// totalScore ที่ใช้ตัดสิน urgent referral (8Q >= 17) คำนวณจาก plaintext answers
// ที่ API route (pages/api/screening/8q.ts) ก่อนเรียกไฟล์นี้เรียบร้อยแล้ว — ไม่ต้อง
// เก็บ totalScore ซ้ำเป็น plaintext แยกใน DB เพื่อลด attack surface

import { prisma } from "../db";
import { encryptForPatient, decryptManyForPatient } from "../patient-encryption";
import type { QuestionnaireResponse } from "./screening-schema";

export async function saveScreeningResponse(
  patientId: string,
  response: QuestionnaireResponse,
  id?: string
): Promise<void> {
  const encryptedShards = await encryptForPatient(patientId, JSON.stringify(response));
  const data = { patientId, questionnaire: response.questionnaire, encryptedShards };
  if (id) await prisma.screeningResponse.upsert({ where: { id }, create: { id, ...data }, update: {} });
  else await prisma.screeningResponse.create({ data });
}

// คืนประวัติทั้งหมดของแบบสอบถามชนิดหนึ่ง เรียงเก่า→ใหม่ (ใช้ทำ trend chart ต่อได้
// ตรงๆ ใน roadmap ข้อถัดไป)
export async function getScreeningHistory(
  patientId: string,
  questionnaire: "9Q" | "8Q"
): Promise<QuestionnaireResponse[]> {
  const rows = await prisma.screeningResponse.findMany({
    where: { patientId, questionnaire },
    orderBy: { createdAt: "asc" },
  });
  // G-03 A: unwrap DEK ครั้งเดียวต่อการอ่าน (ไม่ใช่ทุกแถว) — ดู decryptManyForPatient
  const plaintexts = await decryptManyForPatient(patientId, rows.map((row) => row.encryptedShards));
  return plaintexts.map((plaintext) => JSON.parse(plaintext) as QuestionnaireResponse);
}
