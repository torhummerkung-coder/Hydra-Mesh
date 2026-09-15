// Output auditor — LLM agent ตรวจคำตอบร่างของ Companion agent ก่อนถึงผู้ป่วย
// คนละหน้าที่กับ Detector/Risk engine: สองตัวนั้นตรวจ "ข้อความผู้ใช้ขาเข้า"
// ตัวนี้ตรวจ "คำตอบของระบบเองขาออก" — ทุกคำตอบต้องผ่านด่านนี้ก่อนเสมอ ไม่มีข้อยกเว้น

export interface AuditResult {
  clean: boolean;
  violations: string[];
}

const AUDIT_TOOL = {
  name: "report_audit_result",
  description: "รายงานผลตรวจสอบคำตอบร่างก่อนส่งถึงผู้ป่วย",
  input_schema: {
    type: "object",
    properties: {
      clean: { type: "boolean" },
      violations: {
        type: "array",
        items: { type: "string" },
        description:
          "รายการปัญหาที่พบ เช่น 'ให้คำแนะนำยาโดยตรง', 'วินิจฉัยโรค', 'ข้อมูลที่ไม่มีบริบทรองรับ'",
      },
    },
    required: ["clean", "violations"],
  },
} as const;

const OUTPUT_AUDITOR_SYSTEM = `คุณคือระบบตรวจสอบคำตอบของ AI companion ก่อนส่งถึงผู้ป่วยจิตเวช ตรวจว่าคำตอบนี้ละเมิดขอบเขตต่อไปนี้หรือไม่:

1. วินิจฉัยโรคหรือระบุชื่อภาวะทางจิตเวชให้ผู้ป่วยโดยตรง
2. แนะนำ สั่ง หรือปรับขนาดยาใดๆ
3. อ้างข้อเท็จจริงทางการแพทย์ที่เฉพาะเจาะจงโดยไม่มีบริบทรองรับ (สงสัยว่า hallucinate)
4. ให้คำแนะนำที่ควรมาจากแพทย์เท่านั้น เช่นแผนการรักษา

คำตอบที่แค่รับฟัง เห็นอกเห็นใจ ถามคำถามเปิด หรือชวนคุยเรื่องทั่วไป ถือว่า clean ไม่ต้องเข้มงวดเกินไปกับคำตอบที่เป็นการรับฟังตามปกติ รายงานผลผ่าน tool ที่กำหนดเท่านั้น`;

export async function runOutputAuditor(draftReply: string): Promise<AuditResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ไม่ได้ตั้งค่า");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: OUTPUT_AUDITOR_SYSTEM,
      messages: [{ role: "user", content: `คำตอบร่าง:\n"""\n${draftReply}\n"""` }],
      tools: [AUDIT_TOOL],
      tool_choice: { type: "tool", name: "report_audit_result" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Output auditor call failed: ${await response.text()}`);
  }

  const data = await response.json();
  const toolUse = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!toolUse) throw new Error("Output auditor ไม่ได้ส่ง structured output กลับมา");
  return toolUse.input as AuditResult;
}

// ปัญหาคุณภาพคำตอบของระบบเอง ไม่ใช่ภัยคุกคามจากผู้ใช้ — จึงไม่ kill session/block ใดๆ
// แค่ regenerate หรือ fallback ข้อความปลอดภัยแทน (คนละตัวกับ getFallbackReply() ใน
// lib/agents/fallback-reply.ts ซึ่งใช้เฉพาะตอนทั้ง pipeline ล่ม ไม่ใช่แค่คำตอบมีปัญหา)
export const AUDIT_RETRY_MESSAGE = "ขอโทษนะ ขอเวลาทบทวนคำตอบสักครู่ ลองพิมพ์อีกครั้งได้ไหม";
