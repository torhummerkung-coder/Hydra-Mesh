// Patient data envelope encryption — เลือก "แบบ 3" จากคำถามเปิดเรื่อง encryption
// key management ใน PRODUCTION_ROADMAP.md แล้ว เพราะโปรเจกต์นี้มีคนจริงทดลองใช้
// ตั้งแต่ demo และมี production จริงรออยู่แน่นอน (ไม่ใช่ synthetic data ล้วนๆ)
//
// หลักการ: ผู้ป่วยแต่ละคนมี DEK (data encryption key) เป็นของตัวเอง สุ่มขึ้นมา
// อิสระ ไม่ได้ derive จากสูตรใดๆ — DEK นี้ถูก "ห่อ" (encrypt ซ้ำ) ด้วย master
// key จาก env ก่อนเก็บลง DB เสมอ ไม่เคยเก็บ DEK แบบ plaintext ที่ไหนเลย
//
// ทำไมดีกว่า derive-จาก-สูตรเดียว (แบบ 2 ที่เคยเสนอ): ถ้า DEK ของผู้ป่วยคนหนึ่ง
// หลุดหรือต้องหมุนกุญแจ (rotate) ทำได้อิสระทีละคน ไม่กระทบคนอื่น และย้าย master
// key ไปเป็นอันใหม่ได้โดยแค่ unwrap ด้วยของเก่าแล้ว wrap ใหม่ด้วยของใหม่ ไม่ต้อง
// แตะ ciphertext ของบทสนทนาจริงเลยสักตัวอักษร
//
// ยังป้องกันไม่ได้ (ต้องบอกตรงๆ ไม่ over-claim): ถ้า attacker เข้าถึง process ที่
// รันอยู่ได้จริง (เช่น RCE) master key อยู่ใน env ของ process เดียวกัน — ไม่มี
// scheme ไหนใน 3 แบบที่เสนอป้องกันเคสนี้ได้ ต้องมี HSM/KMS ภายนอกจริงถึงจะกันได้
// ซึ่งเกินสโคปของ SQLite demo นี้ (เก็บไว้ใน Phase 3 roadmap — KMS/HSM adapter)

import { prisma } from "./db";
import { hydraEncrypt, hydraDecrypt, type HydraShard } from "./hydra-crypto";

function getMasterKey(): string {
  const key = process.env.PATIENT_DATA_MASTER_KEY;
  if (!key) {
    throw new Error(
      "PATIENT_DATA_MASTER_KEY ไม่ได้ตั้งค่าใน .env — ต้องมีก่อนเข้ารหัส/ถอดรหัสข้อมูลผู้ป่วยได้ " +
        "(ดู .env.example วิธีสร้าง)"
    );
  }
  return key;
}

// 32 byte สุ่มอิสระจริง แปลงเป็น base64 — ใช้เป็น "password" ของ hydraEncrypt/
// hydraDecrypt สำหรับผู้ป่วยคนนี้โดยเฉพาะ ไม่ได้ derive จากสูตรใดๆ ทั้งสิ้น
function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64");
}

// คืน DEK (plaintext) ของผู้ป่วยคนนี้ — ถ้ายังไม่มีจะสุ่มสร้างใหม่แล้ว wrap เก็บ
// ถ้ามีอยู่แล้วจะ unwrap คืนมา ไม่เคย log หรือ return ค่านี้ไปที่อื่นนอกจากฟังก์ชัน
// encryptForPatient/decryptForPatient ด้านล่าง
export async function getOrCreatePatientKey(patientId: string): Promise<string> {
  const existing = await prisma.patientDataKey.findUnique({ where: { patientId } });

  if (existing) {
    const shards = JSON.parse(existing.wrappedKeyJson) as HydraShard[];
    const { plaintext } = await hydraDecrypt(shards, getMasterKey());
    return plaintext;
  }

  const dek = randomSecret();
  // 2 shards พอสำหรับห่อกุญแจสั้นๆ (ไม่ใช่ patient conversation ยาวๆ ที่ใช้ 3)
  const wrapped = await hydraEncrypt(dek, getMasterKey(), 2);
  const stored = await prisma.patientDataKey.upsert({ where: { patientId }, update: {},
    create: { patientId, wrappedKeyJson: JSON.stringify(wrapped.shards) } });
  // Concurrent first writes must all use the winning key, never an unpersisted DEK.
  return (await hydraDecrypt(JSON.parse(stored.wrappedKeyJson) as HydraShard[], getMasterKey())).plaintext;
}

// สอง helper นี้คือจุดที่ conversation history / 9Q/8Q จะเรียกใช้ตอนอ่าน/เขียน DB
// จริง (ยังไม่ wire เข้า chat.ts ในรอบนี้ — เป็นงานถัดไป ตัวนี้แค่วางฐานให้พร้อม)
export async function encryptForPatient(patientId: string, plaintext: string): Promise<string> {
  const dek = await getOrCreatePatientKey(patientId);
  const result = await hydraEncrypt(plaintext, dek, 3);
  return JSON.stringify(result.shards);
}

export async function decryptForPatient(patientId: string, shardsJson: string): Promise<string> {
  const dek = await getOrCreatePatientKey(patientId);
  const shards = JSON.parse(shardsJson) as HydraShard[];
  const { plaintext } = await hydraDecrypt(shards, dek);
  return plaintext;
}
