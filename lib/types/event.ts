// Event model พื้นฐานสำหรับ trace ทั้ง pipeline — ทุก stage (Detector, Risk engine,
// Orchestrator, Companion, Output auditor) ยิง event เดียวกันนี้เข้า audit log
// เป้าหมาย: ตาม correlationId เดียวแล้วเห็นครบว่าข้อความหนึ่งข้อความเดินทางผ่านอะไรบ้าง
//
// ข้อจำกัดสำคัญ: การยิง event ต้องเป็น fire-and-forget เสมอ — ห้ามมีจุดไหนที่ผลของ
// การ log เปลี่ยนพฤติกรรมของ critical path หรือทำให้มันช้า/พังตาม
// (ดู lib/audit/audit-log.ts ว่า logEvent() รับประกันเรื่องนี้ยังไง)

export type HydraEventType =
  | "message_received"
  | "detector_result"
  | "risk_result"
  | "orchestrator_decision"
  | "companion_reply"
  | "circuit_breaker_trip"
  | "pipeline_fallback"
  | "sentinel_capability_mismatch"
  | "sentinel_incident"
  // v2 Phase 1: แพทย์เปิดดูข้อมูล sensitive ของผู้ป่วย (conversation/9Q/8Q) ที่
  // decrypt แล้ว — "audited temporary-decrypt zone" ตาม hybrid encryption model
  | "clinical_data_decrypted"
  | "clinical_access_denied"
  | "human_review_acknowledged"
  | "care_assignment_changed";

export interface HydraEvent<T = unknown> {
  id: string;
  type: HydraEventType;
  timestamp: number;
  correlationId: string;
  source: {
    agentId: string; // ตรงกับ AgentId ใน lib/types/agent.ts
  };
  // ผูก event เข้ากับผู้ป่วยเมื่อทราบตัวตนแน่นอน ณ จุดที่ log (เช่น chat.ts รู้
  // session.sub อยู่แล้ว) — optional เพราะ event ระดับระบบบางตัว (sentinel,
  // circuit breaker) ไม่ได้ผูกกับผู้ป่วยคนใดคนหนึ่งโดยตรง ใช้ scope สิทธิ์ตอน
  // แพทย์ดู trace ของตัวเอง (ดู pages/api/doctor/event-trace.ts)
  patientId?: string;
  payload: T;
}
