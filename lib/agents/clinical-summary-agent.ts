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

function formatScoreHistory(points: ScoreHistoryPoint[], label: string): string {
  if (!points.length) return `ไม่มีข้อมูล ${label} ในช่วงนี้`;
  return points.map((p) => `${p.authored}: ${label}=${p.totalScore}`).join(", ");
}

export async function generateClinicalSummary(
  input: ClinicalSummaryInput
): Promise<ClinicalSummaryResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ไม่ได้ตั้งค่า");

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

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 800,
      system: CLINICAL_SUMMARY_SYSTEM,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Clinical summary agent call failed: ${await response.text()}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");

  return {
    summary: textBlock?.text ?? "",
    generatedAt: new Date().toISOString(),
    disclaimer: "สรุปนี้สร้างโดย AI จากข้อมูลที่มี ไม่ใช่การวินิจฉัยทางการแพทย์ ใช้ประกอบดุลยพินิจของแพทย์เท่านั้น",
  };
}
