// ตรวจสอบ username/password กับ DB จริง (แทน demo-login ที่ไม่เช็คอะไรเลย) — ใช้
// hashPassword/verifyPassword จาก lib/hydra-crypto.ts (PBKDF2-SHA512, 310,000
// iterations) ซึ่งสร้างไว้รอตั้งแต่ก่อนหน้านี้แต่ยังไม่มีจุดไหนเรียกใช้จริงเลย
// จนถึงตอนนี้
//
// ป้องกัน timing attack แบบเรียบง่าย: ไม่ว่า username จะมีอยู่จริงในระบบหรือไม่
// ก็ยังเรียก verifyPassword() แบบเต็มรูปแบบเสมอ (เทียบกับ "dummy hash" ที่คำนวณ
// ไว้ล่วงหน้าถ้าไม่เจอ user จริง) เพื่อไม่ให้ความเร็วตอบสนองของ endpoint บอกใบ้
// ว่า username นั้นมีอยู่จริงหรือไม่ (การเช็ค "if (!user) return null" ทันทีโดย
// ไม่เรียก verifyPassword เลยจะเร็วกว่าเคสที่ user มีจริงอย่างสังเกตได้)

import { prisma } from "../db";
import { hashPassword, verifyPassword } from "../hydra-crypto";

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("timing-safety-dummy-value-never-matches-a-real-password");
  }
  return dummyHashPromise;
}

export interface LoginResult {
  userId: string;
  role: string;
}

export async function verifyCredentials(username: string, password: string): Promise<LoginResult | null> {
  const user = await prisma.user.findUnique({ where: { username } });
  const dummyHash = await getDummyHash();
  // ต้องเรียก verifyPassword เสมอไม่ว่า user จะมีจริงหรือไม่ — ดู comment ด้านบน
  const passwordValid = await verifyPassword(password, user?.passwordHash ?? dummyHash);

  if (!user || !passwordValid) return null;
  return { userId: user.id, role: user.role };
}
