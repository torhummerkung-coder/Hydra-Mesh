// เก็บบทสนทนาระหว่างผู้ป่วยกับ Companion agent แบบเข้ารหัสเสมอ (envelope
// encryption ผ่าน lib/patient-encryption.ts — DEK เฉพาะของผู้ป่วยแต่ละคน)
// เก็บทีละข้อความ ไม่ใช่ blob รวมทั้ง conversation เพราะ append ข้อความใหม่ต้อง
// ไม่ต้อง decrypt-all-แล้ว-encrypt-ใหม่ทุกครั้ง (จะแพงขึ้นเรื่อยๆ ตามความยาวบทสนทนา)
//
// getConversationHistory() คือ "audited temporary-decrypt zone" ตาม hybrid model
// ที่วางไว้ใน PRODUCTION_ROADMAP.md — เรียกได้จาก 2 จุดตอนนี้: (1) หน้าแชทของ
// ผู้ป่วยเองตอนโหลดประวัติตัวเอง (ไม่ต้อง log เพราะเป็นข้อมูลของตัวเอง) และ
// (2) Clinical Summary Agent ฝั่งแพทย์ ซึ่ง log การ decrypt ไว้ที่ call site
// (pages/api/doctor/patient-summary.ts) เพราะเป็นการเปิดดูข้อมูล sensitive ของ
// ผู้ป่วยโดยบุคคลอื่น

import { prisma } from "../db";
import { encryptForPatient, decryptForPatient } from "../patient-encryption";

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: string; // ISO string
}

export async function saveMessage(
  patientId: string,
  role: "user" | "assistant",
  content: string
): Promise<void> {
  const encryptedShards = await encryptForPatient(patientId, content);
  await prisma.conversationMessage.create({
    data: { patientId, role, encryptedShards },
  });
}

// บันทึกข้อความของผู้ป่วยและคำตอบของ Companion พร้อมกัน — ใช้ตอนจบหนึ่งรอบสนทนา
// เข้ารหัสสองข้อความแบบขนาน (encryptForPatient เรียก getOrCreatePatientKey ซึ่ง
// cache ไม่ได้ในฟังก์ชันนี้ แต่ query DB ครั้งที่สองเร็วกว่าที่จะเสียเวลา cache เอง)
export async function saveTurn(
  patientId: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  await Promise.all([
    saveMessage(patientId, "user", userMessage),
    saveMessage(patientId, "assistant", assistantReply),
  ]);
}

// คืนบทสนทนา "limit" ข้อความล่าสุด เรียงเก่า→ใหม่ (ตรงกับ shape ที่ orchestrator/
// companion-agent ใช้เป็น context) — query desc+take แล้ว reverse กลับ เพราะ
// อยากได้ "ล่าสุด N ข้อความ" ไม่ใช่ "เก่าสุด N ข้อความ"
export async function getConversationHistory(
  patientId: string,
  limit = 100
): Promise<StoredMessage[]> {
  const rows = await prisma.conversationMessage.findMany({
    where: { patientId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const chronological = rows.reverse();
  return Promise.all(
    chronological.map(async (row) => ({
      role: row.role as "user" | "assistant",
      content: await decryptForPatient(patientId, row.encryptedShards),
      createdAt: row.createdAt.toISOString(),
    }))
  );
}
