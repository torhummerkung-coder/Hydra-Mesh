// Agent identity — static manifest ประกาศ agent ทุกตัวในระบบ ใช้เป็น
// single source of truth สำหรับ agentId ที่ event.ts / capabilities.ts อ้างอิง
//
// นี่คือ config-time concept (Zero Trust "Agent Identity" จาก blueprint v2.0)
// ไม่ใช่ runtime service — ไม่มี network call ไม่มี async ในไฟล์นี้เลย
// ดู PRODUCTION_ROADMAP.md ส่วน "ส่วนขยาย v2.0" ว่าทำไมต้องเป็น static
// ไม่ใช่ policy engine ที่ query ทุกข้อความ

import type { AgentId } from "../types/agent";

export interface AgentIdentity {
  id: AgentId;
  displayName: string;
  kind: "algorithm" | "llm"; // ตรงกับเหตุผลที่เลือก Detector=algorithm, ที่อื่น=LLM
  model?: string; // เฉพาะ kind: "llm"
  // v2: เพิ่มตอนที่ Clinical Summary แยก provider จาก Anthropic บันทึก
  // provider ไว้ชัดๆ ดีกว่าเดาจาก model string เอา (ก้าวแรกของ Model Registry
  // concept ที่วางไว้ใน Phase 4.x — ยังไม่ใช่ registry เต็มรูปแบบ แค่ field เดียว)
  provider?: "anthropic" | "google" | "mistral";
}

export const AGENT_REGISTRY: Record<AgentId, AgentIdentity> = {
  detector: { id: "detector", displayName: "Detector", kind: "algorithm" },
  "risk-engine": {
    id: "risk-engine",
    displayName: "Risk Engine",
    kind: "llm",
    model: "claude-haiku-4-5-20251001",
    provider: "anthropic",
  },
  orchestrator: { id: "orchestrator", displayName: "Orchestrator", kind: "algorithm" },
  companion: {
    id: "companion",
    displayName: "Companion Agent",
    kind: "llm",
    model: "claude-sonnet-5",
    provider: "anthropic",
  },
  "output-auditor": {
    id: "output-auditor",
    displayName: "Output Auditor",
    kind: "llm",
    // v2: Opus 5 (เดิม Haiku 4.5 — ดู comment เต็มใน output-auditor.ts ว่าทำไม
    // ต้องแยกจาก Risk Engine ที่ยังเป็น Haiku 4.5 อยู่)
    model: "claude-opus-5",
    provider: "anthropic",
  },
  "clinical-summary": {
    id: "clinical-summary",
    displayName: "Clinical Summary Agent",
    kind: "llm",
    // v2: Gemini Flash (เดิม Claude Sonnet 5 แล้วทดลอง Mistral Small 4)
    // แยก model/provider จาก Companion; ดู clinical-summary-agent.ts
    // RISK-005 fix (2026-09-22): registry เคยอ้าง 3.7-flash ทั้งที่ default จริง
    // อัปเดตเป็น 3.8-flash แล้ว — ต้องไม่ให้ registry โกหกเกี่ยวกับ model ที่ใช้จริง
    model: "gemini-3.8-flash",
    provider: "google",
  },
  fallback: { id: "fallback", displayName: "Fallback Reply", kind: "algorithm" },
};

export function getAgentIdentity(id: AgentId): AgentIdentity {
  return AGENT_REGISTRY[id];
}
