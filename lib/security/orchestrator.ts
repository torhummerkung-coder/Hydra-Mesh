import { runDetector } from "./detector";
import { runRiskEngine, runSecondaryRisk, type ConversationMessage } from "./risk-engine";
import { callWithCircuitBreaker } from "./circuit-breaker";
import { checkCapability } from "../sentinel/sentinel";
import { detectContextSafety, mergeSafety, type SafetyState } from "../fallback/safety";
import { logEvent } from "../audit/audit-log";

export type RoutingDecision = "allow" | "review" | "block_soft";

export interface OrchestratorResult {
  safety: SafetyState;
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
  // Local safety executes before any external dependency. Detector and semantic
  // assessment remain independent; a failed model cannot erase local signals.
  const local = detectContextSafety(message, history);
  const [detectorResult, assessed] = await Promise.all([
    Promise.resolve(runDetector(message)),
    (async () => {
      checkCapability("risk-engine", "call_llm_api", correlationId);
      try { return await callWithCircuitBreaker("risk-engine", correlationId, () => runRiskEngine(message, history)); }
      catch { return runSecondaryRisk(message, history); }
    })().catch(() => undefined),
  ]);
  const safety = mergeSafety(local, assessed);
  logEvent("detector_result", "detector", correlationId, { threat: detectorResult.threat, reasonCount: detectorResult.reasons.length });
  logEvent("risk_result", "risk-engine", correlationId, { status: safety.status, level: safety.level, signal: safety.signal });
  const isCrisis = REVIEW_LEVELS.includes(safety.level ?? "unknown");

  let result: OrchestratorResult;

  // กติกาข้อ 2: สัญญาณวิกฤตชนะเสมอ เช็คก่อนดู threat ของ Detector เลย (ไม่เปลี่ยน)
  if (isCrisis) {
    result = {
      safety,
      decision: "review",
      riskLevel: safety.level ?? "unknown",
      threatReasons: detectorResult.reasons, // เก็บไว้ดูประกอบ ไม่ใช้ตัดสินเส้นทาง
      requiresAccountReview: false,
      correlationId,
    };
  } else if (detectorResult.threat) {
    result = {
      safety,
      decision: "block_soft",
      riskLevel: safety.level ?? "unknown",
      threatReasons: detectorResult.reasons,
      requiresAccountReview: true, // กติกาข้อ 3 — flag ไว้ ไม่ทำเอง
      correlationId,
    };
  } else {
    result = {
      safety,
      decision: "allow",
      riskLevel: safety.level ?? "unknown",
      threatReasons: [],
      requiresAccountReview: false,
      correlationId,
    };
  }

  logEvent("orchestrator_decision", "orchestrator", correlationId, result);
  return result;
}
