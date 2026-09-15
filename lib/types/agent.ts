// รายชื่อ agent ทั้งหมดในระบบ — single source of truth สำหรับ
// identity.ts, capabilities.ts, และ event.source.agentId ทุกที่ที่ต้องอ้างถึง agent
// เพิ่ม agent ใหม่ที่นี่ที่เดียว แล้ว TypeScript จะบังคับให้ identity.ts และ
// capabilities.ts ประกาศ manifest ให้ครบ (ดู Record<AgentId, ...> ในสองไฟล์นั้น)

export type AgentId =
  | "detector"
  | "risk-engine"
  | "orchestrator"
  | "companion"
  | "output-auditor"
  | "clinical-summary"
  | "fallback";
