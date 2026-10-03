// ทดสอบ clinical-summary-agent.ts หลังย้าย Clinical Summary → Gemini 3.8 Flash
//
// ⚠️ ต้องมี GEMINI_API_KEY จริงใน .env.local ก่อนรัน การ compile หรือ mock test
// ไม่ถือเป็น live verification รันสคริปต์นี้เพื่อยืนยัน integration path จริง:
//   npm run test:clinical-summary-gemini
//
// ถ้า FAIL ที่ "เรียก Gemini API สำเร็จ" ให้เช็คตามลำดับนี้ก่อน:
//   1. GEMINI_API_KEY ตั้งค่าถูกและเปิด Gemini API แล้วหรือไม่
//   2. บัญชีมีสิทธิ์ใช้ GEMINI_MODEL (ค่าเริ่มต้น gemini-3.8-flash) หรือไม่
//   3. quota/rate limit ของ Google AI Studio ยังเหลือหรือไม่

import { loadEnvConfig } from "@next/env";

// Standalone tsx scripts do not automatically load Next.js environment files.
// Load .env.local with the same precedence as the application before importing
// the agent, so the documented command is reproducible.
loadEnvConfig(process.cwd());

async function main() {
  const { generateClinicalSummary } = await import("../lib/agents/clinical-summary-agent");

  console.log(`=== Clinical Summary Agent (Google / ${process.env.GEMINI_MODEL || "gemini-3.8-flash"}) ===`);
  console.log(`Verification time: ${new Date().toISOString()}`);

  if (!process.env.GEMINI_API_KEY) {
    console.log("[FAIL] ไม่มี GEMINI_API_KEY ใน environment — ตั้งค่าใน .env.local ก่อนรันสคริปต์นี้");
    process.exit(1);
  }

  const result = await generateClinicalSummary({
    patientId: "test-patient-gemini-verify",
    conversationHistory: [
      { role: "user", content: "ช่วงนี้นอนไม่ค่อยหลับ รู้สึกเหนื่อยตลอดเวลา" },
      { role: "assistant", content: "ฟังดูเหนื่อยมากเลยนะ เล่าให้ฟังได้ไหมว่าเป็นแบบนี้มานานแค่ไหนแล้ว" },
      { role: "user", content: "ประมาณ 2 สัปดาห์แล้ว งานก็เยอะด้วย" },
    ],
    nineQHistory: [{ authored: "2026-09-01", totalScore: 8 }],
    eightQHistory: [],
    reviewFlagCount: 0,
  });

  const hasSummary = typeof result.summary === "string" && result.summary.trim().length > 0;
  const hasDisclaimer = result.disclaimer.includes("ไม่ใช่การวินิจฉัยทางการแพทย์");
  const hasTimestamp = !Number.isNaN(new Date(result.generatedAt).getTime());

  console.log(`[${hasSummary ? "PASS" : "FAIL"}] เรียก Gemini API สำเร็จ ได้ summary ที่ไม่ว่างเปล่ากลับมา`);
  console.log(`[${hasDisclaimer ? "PASS" : "FAIL"}] disclaimer ข้อความคงเดิม (ไม่ใช่การวินิจฉัยทางการแพทย์)`);
  console.log(`[${hasTimestamp ? "PASS" : "FAIL"}] generatedAt เป็น valid timestamp`);

  console.log("\n--- ตัวอย่าง summary ที่ได้กลับมา (ตรวจด้วยตาว่าอ่านรู้เรื่อง ไม่ใช่ garbage) ---");
  console.log(result.summary);

  if (!hasSummary || !hasDisclaimer || !hasTimestamp) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("\n[FAIL] test-clinical-summary-gemini ล้มทั้งกระบวน:", err instanceof Error ? err.message : err);
  process.exit(1);
});
