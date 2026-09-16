// ทดสอบ credential-login.ts (real auth แทน demo-login) และ security-review-queue.ts
// (คิวแยกของทีม security) — สองโมดูลใหม่ที่ wire เข้าระบบในรอบนี้
//
// ต้องรันตามลำดับนี้ก่อนถึงจะใช้ได้ (เหมือน test-db-integration.ts):
//   1. npm install
//   2. npm run db:migrate   (schema มี User และ SecurityReviewItem model ใหม่)
//   3. npm run test:auth-and-security-queue
//
// ไฟล์นี้เขียน record จริงลง dev.db — รันซ้ำได้เรื่อยๆ

import { prisma } from "../lib/db";
import { hashPassword } from "../lib/hydra-crypto";
import { verifyCredentials } from "../lib/auth/credential-login";
import {
  flagForSecurityReview,
  getSecurityReviewQueue,
  acknowledgeSecurityReviewItem,
} from "../lib/security/security-review-queue";

async function testCredentialLogin() {
  console.log("=== credential-login.ts ===");
  const username = `test-user-${Date.now()}`;
  const password = "CorrectHorseBattery9!";

  await prisma.user.create({
    data: { username, passwordHash: await hashPassword(password), role: "doctor" },
  });

  const ok = await verifyCredentials(username, password);
  console.log(`[${ok?.role === "doctor" ? "PASS" : "FAIL"}] username+password ถูกต้อง คืน role จริงจาก DB`);

  const wrongPassword = await verifyCredentials(username, "wrong-password-entirely");
  console.log(`[${wrongPassword === null ? "PASS" : "FAIL"}] password ผิด คืน null (ไม่ใช่ throw)`);

  const noSuchUser = await verifyCredentials(`does-not-exist-${Date.now()}`, password);
  console.log(`[${noSuchUser === null ? "PASS" : "FAIL"}] username ไม่มีอยู่จริง คืน null เหมือนกัน (ไม่บอกใบ้ user enumeration)`);

  // เช็คคร่าวๆ ว่า timing ไม่ต่างกันขนาดเห็นชัด (ไม่ใช่ statistical timing-attack test
  // เต็มรูปแบบ แค่ sanity check ว่า "ไม่พบ user" ไม่ได้ return ทันทีแบบข้าม verifyPassword)
  const t0 = performance.now();
  await verifyCredentials(username, "wrong-again");
  const tExistingUser = performance.now() - t0;

  const t1 = performance.now();
  await verifyCredentials(`still-does-not-exist-${Date.now()}`, "wrong-again");
  const tMissingUser = performance.now() - t1;

  const ratio = tMissingUser / tExistingUser;
  console.log(
    `[${ratio > 0.3 ? "PASS" : "FAIL"}] เวลาตอบสนองกรณี user ไม่มีอยู่จริง (${tMissingUser.toFixed(
      1
    )}ms) ใกล้เคียงกรณี user มีจริงแต่ password ผิด (${tExistingUser.toFixed(1)}ms) — ไม่ short-circuit ก่อนถึง verifyPassword`
  );
}

async function testSecurityReviewQueue() {
  console.log("\n=== security-review-queue.ts ===");
  const patientA = `test-sec-a-${Date.now()}`;
  const patientB = `test-sec-b-${Date.now()}`;

  const itemA = await flagForSecurityReview({
    patientId: patientA,
    correlationId: crypto.randomUUID(),
    riskLevel: "high",
    threatReasons: ["prompt injection pattern", "repeated system-prompt probing"],
  });
  console.log(
    `[${
      itemA.threatReasons.length === 2 && itemA.threatReasons[0] === "prompt injection pattern"
        ? "PASS"
        : "FAIL"
    }] threatReasons round-trip ผ่าน JSON.stringify/parse ได้ค่าเดิมเป๊ะ (ลำดับ+เนื้อหา)`
  );

  await acknowledgeSecurityReviewItem(itemA.id);

  // สร้างอีกรายการทีหลัง (ใหม่กว่า) แต่ยัง unacknowledged — ต้องขึ้นก่อน itemA
  // ที่เก่ากว่าแต่ acknowledged แล้ว (ดู orderBy ใน security-review-queue.ts)
  await new Promise((r) => setTimeout(r, 10));
  const itemB = await flagForSecurityReview({
    patientId: patientB,
    correlationId: crypto.randomUUID(),
    riskLevel: "critical",
    threatReasons: ["jailbreak attempt"],
  });

  const queue = await getSecurityReviewQueue();
  const bBeforeA = queue.findIndex((q) => q.id === itemB.id) < queue.findIndex((q) => q.id === itemA.id);
  console.log(
    `[${bBeforeA ? "PASS" : "FAIL"}] getSecurityReviewQueue เรียง unacknowledged ขึ้นก่อนแม้จะใหม่กว่า acknowledged ที่เก่ากว่า`
  );

  const ackOk = await acknowledgeSecurityReviewItem(itemB.id);
  console.log(`[${ackOk ? "PASS" : "FAIL"}] acknowledgeSecurityReviewItem คืน true เมื่อ id มีอยู่จริง`);

  const ackMissing = await acknowledgeSecurityReviewItem("does-not-exist");
  console.log(`[${!ackMissing ? "PASS" : "FAIL"}] acknowledgeSecurityReviewItem คืน false เมื่อ id ไม่มีอยู่จริง (ไม่ throw)`);
}

async function main() {
  await testCredentialLogin();
  await testSecurityReviewQueue();
}

main()
  .catch((err) => {
    console.error("test-auth-and-security-queue failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
