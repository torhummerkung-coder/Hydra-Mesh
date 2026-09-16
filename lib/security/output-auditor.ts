// Output auditor — LLM agent ตรวจคำตอบร่างของ Companion agent ก่อนถึงผู้ป่วย
// คนละหน้าที่กับ Detector/Risk engine: สองตัวนั้นตรวจ "ข้อความผู้ใช้ขาเข้า"
// ตัวนี้ตรวจ "คำตอบของระบบเองขาออก" — ทุกคำตอบต้องผ่านด่านนี้ก่อนเสมอ ไม่มีข้อยกเว้น
//
// v2: model = Opus 5 (เดิม Haiku 4.5 เหมือน Risk Engine เป๊ะ) — แก้ cognitive
// diversity gap ที่เจอใน PRODUCTION_ROADMAP.md (Model Diversity ≠ Cognitive
// Diversity): Risk Engine ตรวจข้อความเข้า, Auditor ตรวจคำตอบออก — เป็นด่านตรวจ
// สองชั้นที่ควร independent จากกัน แต่ก่อนหน้านี้ใช้ model เดียวกันเป๊ะ ถ้า Haiku
// มี blind spot จุดใดจุดหนึ่ง ทั้งสองด่านจะพลาดแบบเดียวกันพร้อมกัน (correlated
// failure) เลือก Opus 5 เพราะ Auditor เป็น safety-critical component ที่ไม่ควร
// optimize cost ก่อนความปลอดภัย — ตรงกับหลักการใน roadmap ("เอนไป Anthropic/
// OpenAI รอบแรกสำหรับ role นี้") ทำได้ทันทีเพราะยังอยู่ใน Anthropic API เดียวกัน
// ไม่ต้องเพิ่ม provider/SDK/key ใหม่
//
// ข้อควรรู้: Opus 5 แพงกว่า Haiku 4.5 ต่อ call มาก และ Auditor เรียกทุกครั้งที่
// Companion ตอบ (ไม่ใช่แค่ตอน flag) ต้นทุนต่อ conversation จะเพิ่มขึ้นจริง — ยอมรับ
// trade-off นี้เพราะเป็นด่านความปลอดภัยสุดท้ายก่อนถึงผู้ป่วย ดู decision log

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
5. อ้างว่าส่งต่อแพทย์ แจ้งเจ้าหน้าที่ หรือมีมนุษย์รับเคสแล้ว (สถานะนี้ต้องแสดงโดยระบบแยกต่างหากเท่านั้น)

คำตอบที่แค่รับฟัง เห็นอกเห็นใจ ถามคำถามเปิด หรือชวนคุยเรื่องทั่วไป ถือว่า clean ไม่ต้องเข้มงวดเกินไปกับคำตอบที่เป็นการรับฟังตามปกติ รายงานผลผ่าน tool ที่กำหนดเท่านั้น`;

export async function runOutputAuditor(draftReply: string): Promise<AuditResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ไม่ได้ตั้งค่า");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-opus-5",
      max_tokens: 512,
      system: OUTPUT_AUDITOR_SYSTEM,
      messages: [{ role: "user", content: `คำตอบร่าง:\n"""\n${draftReply}\n"""` }],
      tools: [AUDIT_TOOL],
      tool_choice: { type: "tool", name: "report_audit_result" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Output auditor call failed: ${response.status}`);
  }

  const data = await response.json();
  const toolUse = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!toolUse) throw new Error("Output auditor ไม่ได้ส่ง structured output กลับมา");
  const value = toolUse.input;
  if (!value || typeof value.clean !== "boolean" || !Array.isArray(value.violations) ||
      !value.violations.every((v: unknown) => typeof v === "string")) throw new Error("invalid_audit_output");
  return { clean: value.clean && value.violations.length === 0, violations: value.violations };
}

// ปัญหาคุณภาพคำตอบของระบบเอง ไม่ใช่ภัยคุกคามจากผู้ใช้ — จึงไม่ kill session/block ใดๆ
// แค่ regenerate หรือ fallback ข้อความปลอดภัยแทน (คนละตัวกับ getFallbackReply() ใน
// lib/agents/fallback-reply.ts ซึ่งใช้เฉพาะตอนทั้ง pipeline ล่ม ไม่ใช่แค่คำตอบมีปัญหา)
export const AUDIT_RETRY_MESSAGE = "ขอโทษนะ ขอเวลาทบทวนคำตอบสักครู่ ลองพิมพ์อีกครั้งได้ไหม";
