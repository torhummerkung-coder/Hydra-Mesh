import { CLINICAL_SUMMARY_SYSTEM } from "./clinical-summary-prompt";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ScoreHistoryPoint {
  authored: string;
  totalScore: number;
}

export interface ClinicalSummaryInput {
  patientId: string;
  // ควร decrypt มาแล้วก่อนถึงจุดนี้ ตามโมเดล hybrid encryption ที่วางไว้ —
  // นี่คือหนึ่งใน audited decrypt event เช่นเดียวกับตอนเปิด specialist modal
  conversationHistory: ConversationMessage[];
  nineQHistory: ScoreHistoryPoint[];
  eightQHistory: ScoreHistoryPoint[];
  reviewFlagCount: number;
}

export interface ClinicalSummaryResult {
  summary: string;
  generatedAt: string;
  disclaimer: string;
}

// v2: แยก Clinical Summary ออกจาก Claude Sonnet 5 ที่ Companion ใช้ เพื่อคง
// cognitive/provider diversity โดยย้าย provider ล่าสุดจาก Mistral มาเป็น
// Gemini Flash หลัง Mistral live verification ถูกบล็อกด้วย API 429
// (2026-09-16) การเปลี่ยนนี้ไม่เพิ่มอำนาจให้ agent: ยังทำได้เพียงจัดระเบียบ
// ข้อมูลให้แพทย์อ่าน และผลลัพธ์ทุกครั้งยังอยู่ใต้ human clinical authority
//
// Legacy corrective RISK-005 (current RISK-001/RISK-007; EC-001): default อัปเดตเป็น gemini-3.8-flash ให้ตรงกับ
// model ที่ live-verify จริงใน EC-000 — ก่อนหน้านี้ default ยังเป็น 3.7-flash
// ทั้งที่ live test รันด้วย 3.8-flash (override) ทำให้ config ไม่ตรงกับ
// evidence เดิม ดู docs/ID_MIGRATION.md and docs/RISK_REGISTER.md RISK-001/RISK-007
//
// ⚠️ ต้องรัน `npm run test:clinical-summary-gemini` ด้วย key จริงก่อนบันทึกว่า
// integration path ผ่าน ห้ามตีความว่า compile ผ่าน = clinical safety ผ่าน
const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";
const GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function formatScoreHistory(points: ScoreHistoryPoint[], label: string): string {
  if (!points.length) return `ไม่มีข้อมูล ${label} ในช่วงนี้`;
  return points.map((p) => `${p.authored}: ${label}=${p.totalScore}`).join(", ");
}

export async function generateClinicalSummary(
  input: ClinicalSummaryInput
): Promise<ClinicalSummaryResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY ไม่ได้ตั้งค่า");
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  // จำกัดความยาว context ไม่ส่งบทสนทนาทั้งหมดถ้ายาวมาก
  const conversationExcerpt = input.conversationHistory
    .slice(-30)
    .map((m) => `${m.role === "user" ? "ผู้ป่วย" : "Companion"}: ${m.content}`)
    .join("\n");

  const userContent = [
    `บทสนทนาช่วงที่ผ่านมา:`,
    conversationExcerpt || "(ไม่มีบทสนทนาในช่วงนี้)",
    "",
    `คะแนน 9Q: ${formatScoreHistory(input.nineQHistory, "9Q")}`,
    `คะแนน 8Q: ${formatScoreHistory(input.eightQHistory, "8Q")}`,
    `จำนวนครั้งที่ถูก flag เข้า human review ช่วงนี้: ${input.reviewFlagCount}`,
  ].join("\n");

  // Gemini แยก systemInstruction ออกจาก contents และคืนข้อความใน
  // candidates[].content.parts[].text ต่างจาก Anthropic และ OpenAI-compatible
  // APIs ระวังอย่า copy request/response shape ข้าม provider
  const apiUrl = `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(apiUrl, {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: CLINICAL_SUMMARY_SYSTEM }],
      },
      contents: [
        { role: "user", parts: [{ text: userContent }] },
      ],
      generationConfig: { maxOutputTokens: 800 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Clinical summary agent call failed: ${response.status}`);
  }

  const data = await response.json();
  // รวม text ทุก part เพราะ Gemini อาจแบ่งคำตอบหนึ่ง candidate เป็นหลาย part
  const parts = data.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((part: unknown) =>
          typeof part === "object" && part !== null && "text" in part && typeof part.text === "string"
            ? part.text
            : ""
        )
        .join("")
        .trim()
    : "";
  if (!text) {
    throw new Error("Gemini returned an empty clinical summary");
  }

  return {
    summary: text,
    generatedAt: new Date().toISOString(),
    disclaimer: "สรุปนี้สร้างโดย AI จากข้อมูลที่มี ไม่ใช่การวินิจฉัยทางการแพทย์ ใช้ประกอบดุลยพินิจของแพทย์เท่านั้น",
  };
}
