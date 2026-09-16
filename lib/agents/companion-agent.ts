import { callSecondary } from "../fallback/secondary";
import { recordComponentHealth } from "../clinical/system-health";
import { COMPANION_SYSTEM_PROMPT } from "./companion-prompt";
import { runOutputAuditor } from "../security/output-auditor";
import { callWithCircuitBreaker } from "../security/circuit-breaker";
import { checkCapability } from "../sentinel/sentinel";
import { logEvent } from "../audit/audit-log";
import type { RoutingDecision } from "../security/orchestrator";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompanionContext {
  // history ควร decrypt มาแล้วก่อนถึงจุดนี้ ตามโมเดล hybrid encryption
  // (decrypt เฉพาะตอนประมวลผล ไม่เก็บ plaintext ค้างไว้นอกโซนนี้)
  history: ConversationMessage[];
  newMessage: string;
  // มาจาก Orchestrator เสมอ — Companion agent ไม่ตัดสินใจเรื่อง risk เอง
  routingDecision: RoutingDecision;
  // v2: ใช้ correlationId เดียวกับ OrchestratorResult ถ้ามี เพื่อ trace ต่อเนื่อง
  // ไม่ได้บังคับ (optional) กันพังกับ call site เดิม/test script ที่ยังไม่ส่งมา
  correlationId?: string;
  contextMissing?: boolean;
}

export interface CompanionResult {
  reply: string;
  origin?: "primary" | "secondary";
  audited: boolean; // false = โดน Output auditor block แล้วใช้ fallback แทน
}

function buildRiskContext(decision: RoutingDecision): string {
  return `ห้ามอ้างว่าส่งต่อ แจ้งแพทย์ หรือมีเจ้าหน้าที่รับเคสแล้ว สถานะส่งต่อจะแสดงแยกโดยระบบเท่านั้น
${decision === "review" ? "ตอบอย่างใส่ใจความปลอดภัยเป็นพิเศษ" : ""}`;
}

async function callClaude(
  systemPrompt: string,
  history: ConversationMessage[],
  newMessage: string
): Promise<string> {
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
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [...history, { role: "user", content: newMessage }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Companion agent LLM call failed: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text?.trim()) throw new Error("empty_companion_output");
  return textBlock.text;
}

export async function generateCompanionReply(ctx: CompanionContext): Promise<CompanionResult> {
  const correlationId = ctx.correlationId ?? crypto.randomUUID();
  const systemPrompt = COMPANION_SYSTEM_PROMPT.replace(
    "{{RISK_CONTEXT}}",
    buildRiskContext(ctx.routingDecision) + (ctx.contextMissing ? "\nเห็นเฉพาะข้อความล่าสุด ห้ามอ้างว่าจำบทสนทนาก่อนหน้าได้ แจ้งข้อจำกัดนี้สั้น ๆ หากมีผลต่อคำตอบ" : "")
  );

  // ห่อด้วย circuit breaker เพื่อ fail fast ตอน API ล่มซ้ำๆ — ไม่เปลี่ยน
  // error semantics เดิม (throw เหมือนเดิม ให้ chat.ts จับไป fallback เหมือนเดิม)
  checkCapability("companion", "call_llm_api", correlationId);
  let draft: string;
  let origin: 'primary' | 'secondary' = 'primary';
  try { draft = await callWithCircuitBreaker("companion", correlationId, () => callClaude(systemPrompt, ctx.history, ctx.newMessage)); }
  catch { draft = await callSecondary('COMPANION', systemPrompt, [...ctx.history, { role: 'user', content: ctx.newMessage }]); origin = 'secondary'; }

  // ทุกคำตอบผ่าน Output auditor ก่อนออกจากระบบเสมอ ไม่มีข้อยกเว้น
  checkCapability("output-auditor", "call_llm_api", correlationId);
  const audit = await callWithCircuitBreaker("output-auditor", correlationId, () => runOutputAuditor(draft))
    .catch(error => { recordComponentHealth('auditor', 'unavailable'); throw error; });
  recordComponentHealth('auditor', 'healthy');

  if (!audit.clean) throw new Error("output_rejected");
  const result: CompanionResult = { reply: draft, audited: true, origin };

  logEvent("companion_reply", "companion", correlationId, { audited: result.audited });
  return result;
}
