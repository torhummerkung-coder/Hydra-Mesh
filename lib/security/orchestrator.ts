// Orchestrator — รวมผล Detector + Risk engine
//
// กติกาที่ห้ามแก้โดยไม่คุยกันก่อน:
// 1. Detector กับ Risk engine ต้องรันพร้อมกันเสมอ (Promise.all) ห้าม gate ต่อกัน
//    เพราะถ้า Detector ตัดสินก่อนแล้วส่งตรงไป block โดย Risk engine ยังไม่ทันได้ประเมิน
//    ข้อความที่มีทั้ง pattern แปลกๆ และสัญญาณวิกฤตจริงจะถูก block โดยไม่มีใครเห็นสัญญาณวิกฤตเลย
// 2. สัญญาณวิกฤตชนะ security block เสมอ ไม่มีข้อยกเว้น ไม่ว่า Detector จะเจอ pattern อะไร
// 3. Block ระดับข้อความ (soft) เป็น automatic ได้ แต่ block ระดับบัญชีถาวรต้องมี human review เสมอ
//
// v2 เพิ่มเติม (ดู PRODUCTION_ROADMAP.md ส่วน "ส่วนขยาย v2.0"):
// - correlationId + logEvent() = instrumentation ล้วนๆ ไม่กระทบ 3 กติกาด้านบนเลย
// - runRiskEngine ห่อด้วย circuit breaker เพื่อ fail fast ตอน API ล่มซ้ำๆ (เร็วกว่า
//   รอ fetch timeout — แค่ช่วยให้ถึง fallback เร็วขึ้น ไม่ได้เปลี่ยน error semantics
//   หรือตัดสินใจอะไรแทน logic ด้านล่าง) ทั้งสองอย่างนี้ "ห้ามแก้" ให้กลายเป็น stage
//   ที่ตัดสินใจ block/allow เอง — หน้าที่ตัดสินใจยังเป็นของ logic เดิมเท่านั้น

import { runDetector } from "./detector";
import { runRiskEngine, type ConversationMessage } from "./risk-engine";
import { callWithCircuitBreaker } from "./circuit-breaker";
import { checkCapability } from "../sentinel/sentinel";
import { logEvent } from "../audit/audit-log";

export type RoutingDecision = "allow" | "review" | "block_soft";

export interface OrchestratorResult {
  decision: RoutingDecision;
  riskLevel: string;
  threatReasons: string[];
  // true = ต้องมี human (security team) ตัดสินใจเรื่อง block บัญชีถาวร ไม่ทำอัตโนมัติ
  requiresAccountReview: boolean;
  correlationId: string;
}

const REVIEW_LEVELS = ["moderate", "high", "critical"];

export async function runOrchestrator(
  message: string,
  history: ConversationMessage[] = [],
  correlationId: string = crypto.randomUUID()
): Promise<OrchestratorResult> {
  // รันพร้อมกันเสมอ — ดูกติกาข้อ 1 ด้านบน (ไม่เปลี่ยน)
  checkCapability("risk-engine", "call_llm_api", correlationId);
  const [detectorResult, riskAssessment] = await Promise.all([
    Promise.resolve(runDetector(message)),
    callWithCircuitBreaker("risk-engine", correlationId, () => runRiskEngine(message, history)),
  ]);

  logEvent("detector_result", "detector", correlationId, detectorResult);
  logEvent("risk_result", "risk-engine", correlationId, riskAssessment);

  const isCrisis = REVIEW_LEVELS.includes(riskAssessment.risk_level);

  let result: OrchestratorResult;

  // กติกาข้อ 2: สัญญาณวิกฤตชนะเสมอ เช็คก่อนดู threat ของ Detector เลย (ไม่เปลี่ยน)
  if (isCrisis) {
    result = {
      decision: "review",
      riskLevel: riskAssessment.risk_level,
      threatReasons: detectorResult.reasons, // เก็บไว้ดูประกอบ ไม่ใช้ตัดสินเส้นทาง
      requiresAccountReview: false,
      correlationId,
    };
  } else if (detectorResult.threat) {
    result = {
      decision: "block_soft",
      riskLevel: riskAssessment.risk_level,
      threatReasons: detectorResult.reasons,
      requiresAccountReview: true, // กติกาข้อ 3 — flag ไว้ ไม่ทำเอง
      correlationId,
    };
  } else {
    result = {
      decision: "allow",
      riskLevel: riskAssessment.risk_level,
      threatReasons: [],
      requiresAccountReview: false,
      correlationId,
    };
  }

  logEvent("orchestrator_decision", "orchestrator", correlationId, result);
  return result;
}
