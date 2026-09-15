// Risk engine — LLM agent ล้วนๆ ประเมินสัญญาณวิกฤตจากความหมาย/บริบท
// เหตุผลที่ต้องเป็น agent ไม่ใช่ algorithm: ภาษาที่บ่งชี้ความเสี่ยงหลากหลาย
// และขึ้นกับบริบทมากเกินกว่า regex จะจับได้ครบ

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RiskAssessment {
  risk_level: "none" | "low" | "moderate" | "high" | "critical";
  confidence: number;
  factors: string[];
}

const RISK_TOOL = {
  name: "report_risk_assessment",
  description: "รายงานผลการประเมินความเสี่ยงของข้อความผู้ป่วย",
  input_schema: {
    type: "object",
    properties: {
      risk_level: {
        type: "string",
        enum: ["none", "low", "moderate", "high", "critical"],
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      factors: {
        type: "array",
        items: { type: "string" },
        description: "เหตุผลสั้นๆ ที่ทำให้ประเมินระดับนี้",
      },
    },
    required: ["risk_level", "confidence", "factors"],
  },
} as const;

const RISK_ENGINE_SYSTEM = `คุณคือระบบประเมินความเสี่ยงด้านความปลอดภัยของผู้ป่วยจิตเวช วิเคราะห์ข้อความล่าสุดโดยพิจารณาบริบทบทสนทนาก่อนหน้าประกอบ

ให้ความสำคัญกับสัญญาณเช่น การพูดถึงความคิดหรือความตั้งใจทำร้ายตนเอง ความรู้สึกสิ้นหวังหรือเป็นภาระ การพูดถึงแผนหรือวิธีการ ภาษาคล้ายการร่ำลา การเปลี่ยนแปลงอารมณ์แบบฉับพลันหลังทุกข์ใจมาก หรือการขอข้อมูลที่อาจใช้ทำร้ายตนเองโดยตรง

ประเมินตามสิ่งที่ปรากฏจริงในข้อความเท่านั้น ไม่คาดเดาเกินกว่าที่มี รายงานผลผ่าน tool ที่กำหนดเท่านั้น ห้ามตอบเป็นข้อความ`;

export async function runRiskEngine(
  message: string,
  history: ConversationMessage[] = []
): Promise<RiskAssessment> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY ไม่ได้ตั้งค่า");

  const recentHistory = history.slice(-6); // พอเห็นแนวโน้ม ไม่ต้องส่งทั้งหมด

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
      system: RISK_ENGINE_SYSTEM,
      messages: [...recentHistory, { role: "user", content: message }],
      tools: [RISK_TOOL],
      tool_choice: { type: "tool", name: "report_risk_assessment" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Risk engine call failed: ${await response.text()}`);
  }

  const data = await response.json();
  const toolUse = data.content?.find((b: { type: string }) => b.type === "tool_use");
  if (!toolUse) throw new Error("Risk engine ไม่ได้ส่ง structured output กลับมา");
  return toolUse.input as RiskAssessment;
}
