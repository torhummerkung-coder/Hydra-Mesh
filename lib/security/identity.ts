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
}

export const AGENT_REGISTRY: Record<AgentId, AgentIdentity> = {
  detector: { id: "detector", displayName: "Detector", kind: "algorithm" },
  "risk-engine": {
    id: "risk-engine",
    displayName: "Risk Engine",
    kind: "llm",
    model: "claude-haiku-4-5-20251001",
  },
  orchestrator: { id: "orchestrator", displayName: "Orchestrator", kind: "algorithm" },
  companion: {
    id: "companion",
    displayName: "Companion Agent",
    kind: "llm",
    model: "claude-sonnet-5",
  },
  "output-auditor": {
    id: "output-auditor",
    displayName: "Output Auditor",
    kind: "llm",
    model: "claude-haiku-4-5-20251001",
  },
  "clinical-summary": {
    id: "clinical-summary",
    displayName: "Clinical Summary Agent",
    kind: "llm",
    model: "claude-sonnet-5",
  },
  fallback: { id: "fallback", displayName: "Fallback Reply", kind: "algorithm" },
};

export function getAgentIdentity(id: AgentId): AgentIdentity {
  return AGENT_REGISTRY[id];
}
