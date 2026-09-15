// Capability manifest — ประกาศแบบ static ว่าแต่ละ agent "ทำอะไรได้" เท่านั้น
// นี่คือ documentation-as-code ไม่ใช่ runtime enforcement engine — ไม่มีจุดไหน
// ในโค้ดที่ query สิ่งนี้แบบ per-message (นั่นจะกลายเป็น blocking stage ที่ตกลง
// กันไว้แล้วว่าไม่ทำ ดู PRODUCTION_ROADMAP.md ส่วน "ส่วนขยาย v2.0")
// ใช้เป็น reference ตอน code review และ audit metadata เท่านั้นตอนนี้

export type Capability =
  | "analyze_text" // อ่านข้อความ/history แล้วให้ผลวิเคราะห์
  | "generate_reply" // สร้างข้อความตอบผู้ป่วยโดยตรง
  | "call_llm_api" // เรียก Anthropic API ได้
  | "flag_human_review" // เขียนเข้า human review queue ได้
  | "mark_system_degraded"; // เขียน system health state ได้

export interface CapabilityManifest {
  agentId: string;
  purpose: string;
  allowed: Capability[];
  forbidden: Capability[]; // เขียนไว้ตรงๆ กันลืมตอนต่อยอด ไม่ใช่ enforce runtime
}
