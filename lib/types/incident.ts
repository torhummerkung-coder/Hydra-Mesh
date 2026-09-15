// Incident types — placeholder สำหรับ Sentinel/Immune system (Phase 4 ใน
// PRODUCTION_ROADMAP.md) ยังไม่มี logic ใช้งานจริงตอนนี้ ไม่มีไฟล์ไหน import
// type นี้ไปใช้จริงในรอบนี้ — ประกาศไว้ก่อนเพื่อให้ตอน build sentinel/ และ
// immune/ จริงในอนาคตมี shape ที่ตกลงกันแล้วให้เริ่มจาก ไม่ต้องออกแบบใหม่

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export interface Incident {
  id: string;
  detectedAt: string;
  severity: IncidentSeverity;
  agentId: string;
  description: string;
  relatedCorrelationIds: string[];
}
