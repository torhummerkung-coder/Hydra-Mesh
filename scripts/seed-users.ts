// สร้างบัญชีทดสอบไว้ลอง login จริง (แทน demo-login) — รันครั้งเดียวหลัง
// db:migrate ผ่าน `npm run db:seed` เท่านั้น ไม่ได้รันอัตโนมัติตอน migrate เพราะ
// production ต้องสร้าง user ผ่านกระบวนการที่มี HR/แอดมินยืนยันตัวตนจริง ไม่ใช่
// seed สุ่มแบบนี้ — ไฟล์นี้มีไว้ให้ dev/demo เท่านั้น ห้ามรันใน production
//
// ใช้ upsert เพื่อรันซ้ำได้เรื่อยๆ โดยไม่ error (reset password กลับเป็นค่าเดิม
// ทุกครั้งที่รัน สะดวกตอน dev ลืม password ที่เปลี่ยนไปเอง)

import { prisma } from "../lib/db";
import { hashPassword } from "../lib/hydra-crypto";

const SEED_USERS = [
  { username: "patient1", password: "Patient123!", role: "patient", displayName: "ผู้ป่วยทดสอบ" },
  { username: "doctor1", password: "Doctor123!", role: "doctor", displayName: "หมอทดสอบ" },
  { username: "security1", password: "Security123!", role: "security", displayName: "ทีม Security ทดสอบ" },
];

async function main() {
  for (const u of SEED_USERS) {
    const passwordHash = await hashPassword(u.password);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, role: u.role, displayName: u.displayName },
      create: { username: u.username, passwordHash, role: u.role, displayName: u.displayName },
    });
    console.log(`seeded: ${u.username} (${u.role})`);
  }

  console.log("\nรหัสผ่านสำหรับทดสอบ (เปลี่ยนก่อนใช้งานจริงเด็ดขาด — ห้ามรัน script นี้บน production):");
  for (const u of SEED_USERS) console.log(`  ${u.username} / ${u.password}`);
}

main()
  .catch((err) => {
    console.error("seed-users failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
