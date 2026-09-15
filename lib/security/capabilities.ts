// Capability manifest ต่อ agent — static, ประกาศไว้เป็น documentation-as-code
// และ audit metadata เท่านั้น ยังไม่มี enforcement runtime ใดๆ (ตั้งใจ — policy
// engine ที่ query capability ทุกข้อความคือ blocking stage ที่ตกลงกันแล้วว่าไม่ทำ
// ดู PRODUCTION_ROADMAP.md ส่วน "ส่วนขยาย v2.0")
//
// ประโยชน์ตอนนี้: เอกสารอ้างอิงตอน code review + แนบลง audit event ได้ในอนาคต
// เพื่อให้อ่าน log ทีหลังเทียบได้ว่า agent "ควร" ทำอะไร กับที่ log จริงว่ามันทำอะไรไป
// (ใช้ตอนสร้าง Sentinel จริงใน Phase 4)

import type { AgentId } from "../types/agent";
import type { CapabilityManifest } from "../types/capability";

export const CAPABILITY_MANIFESTS: Record<AgentId, CapabilityManifest> = {
  detector: {
    agentId: "detector",
    purpose: "ตรวจ pattern ที่น่าสงสัยในข้อความขาเข้าด้วย regex ล้วนๆ",
    allowed: ["analyze_text"],
    forbidden: ["generate_reply", "call_llm_api", "flag_human_review", "mark_system_degraded"],
  },
  "risk-engine": {
    agentId: "risk-engine",
    purpose: "ประเมินความเสี่ยงด้านความปลอดภัยจากความหมาย/บริบทของข้อความ",
    allowed: ["analyze_text", "call_llm_api"],
    forbidden: ["generate_reply", "flag_human_review", "mark_system_degraded"],
  },
  orchestrator: {
    agentId: "orchestrator",
    purpose: "รวมผล Detector + Risk engine แล้วตัดสินใจ routing decision",
    allowed: ["analyze_text"],
    forbidden: ["generate_reply", "call_llm_api", "flag_human_review", "mark_system_degraded"],
  },
  companion: {
    agentId: "companion",
    purpose: "สร้างคำตอบที่อบอุ่นให้ผู้ป่วยตาม routing decision ที่ได้รับมา",
    allowed: ["generate_reply", "call_llm_api"],
    forbidden: ["flag_human_review", "mark_system_degraded"],
  },
  "output-auditor": {
    agentId: "output-auditor",
    purpose: "ตรวจคำตอบร่างของ Companion ก่อนส่งถึงผู้ป่วย",
    allowed: ["analyze_text", "call_llm_api"],
    forbidden: ["generate_reply", "flag_human_review", "mark_system_degraded"],
  },
  "clinical-summary": {
    agentId: "clinical-summary",
    purpose: "สรุปแนวโน้มบทสนทนา + คะแนน screening ให้หมอดูก่อนนัด (async, ไม่ real-time)",
    allowed: ["analyze_text", "call_llm_api"],
    forbidden: ["generate_reply", "flag_human_review", "mark_system_degraded"],
  },
  fallback: {
    agentId: "fallback",
    purpose: "ตอบข้อความสำรองแบบ zero network dependency เมื่อ pipeline หลักล่ม",
    allowed: ["generate_reply"],
    forbidden: ["call_llm_api", "flag_human_review", "mark_system_degraded"],
  },
};

export function getCapabilityManifest(agentId: AgentId): CapabilityManifest {
  return CAPABILITY_MANIFESTS[agentId];
}
