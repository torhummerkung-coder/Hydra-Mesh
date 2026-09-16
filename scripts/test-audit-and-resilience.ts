import { logEvent, getEventsByCorrelationId, getRecentTraces } from "../lib/audit/audit-log";
import { buildEventChain } from "../lib/audit/event-chain";
import { callWithCircuitBreaker, getCircuitBreakerStatus } from "../lib/security/circuit-breaker";
import { AGENT_REGISTRY } from "../lib/security/identity";
import { CAPABILITY_MANIFESTS } from "../lib/security/capabilities";
import { checkCapability, recordBreakerTrip, getRecentIncidents } from "../lib/sentinel/sentinel";
import { decideReviewSeverity } from "../lib/security/policy-engine";
import type { AgentId } from "../lib/types/agent";

// หมายเหตุ: ไม่ import จาก lib/clinical/human-review-queue.ts ในไฟล์นี้ — ตั้งแต่
// Phase 1 (Prisma + SQLite) ไฟล์นั้นต้องมี @prisma/client จริง (npm install +
// npm run db:migrate) ถึงจะรันได้ ทดสอบส่วนนั้นแยกไว้ที่ scripts/test-db-integration.ts

// ไฟล์นี้ไม่ต้อง ANTHROPIC_API_KEY เลย — ทดสอบเฉพาะ instrumentation layer
// (audit log, event chain, circuit breaker, manifest) ไม่แตะ LLM จริง

function testAuditLog() {
  console.log("=== Audit log + event chain ===");
  const correlationId = crypto.randomUUID();
  logEvent("message_received", "orchestrator", correlationId, { length: 10 });
  logEvent("detector_result", "detector", correlationId, { threat: false, reasons: [] });
  logEvent("orchestrator_decision", "orchestrator", correlationId, { decision: "allow" });

  const events = getEventsByCorrelationId(correlationId);
  console.log(`[${events.length === 3 ? "PASS" : "FAIL"}] logged 3 events, got ${events.length}`);

  const chain = buildEventChain(correlationId);
  const orderOk = chain !== null && chain.steps[0].type === "message_received";
  console.log(`[${orderOk ? "PASS" : "FAIL"}] event chain preserves chronological order`);

  const unknownChain = buildEventChain("does-not-exist");
  console.log(`[${unknownChain === null ? "PASS" : "FAIL"}] unknown correlationId returns null`);

  // regression: หลาย correlationId ที่ event เกิดในมิลลิวินาทีเดียวกัน (rapid logging)
  // ต้องเรียง "ล่าสุด" ถูกต้องตามลำดับที่เกิดจริง ไม่ใช่ผูกกับ Date.now() ตรงๆ
  const older = crypto.randomUUID();
  const newer = crypto.randomUUID();
  logEvent("message_received", "orchestrator", older, {});
  logEvent("orchestrator_decision", "orchestrator", older, { decision: "allow" });
  logEvent("message_received", "orchestrator", newer, {});
  logEvent("orchestrator_decision", "orchestrator", newer, { decision: "review" });
  logEvent("companion_reply", "companion", newer, { audited: true });
  const traces = getRecentTraces(2);
  const orderingOk = traces[0]?.correlationId === newer && traces[0]?.stepCount === 3;
  console.log(
    `[${orderingOk ? "PASS" : "FAIL"}] getRecentTraces sorts by real recency even when timestamps tie`
  );
}

async function testCircuitBreaker() {
  console.log("\n=== Circuit breaker ===");
  const agentId: AgentId = "risk-engine";
  const correlationId = crypto.randomUUID();

  const alwaysFail = async () => {
    throw new Error("simulated failure");
  };

  for (let i = 0; i < 3; i++) {
    try {
      await callWithCircuitBreaker(agentId, correlationId, alwaysFail);
    } catch {
      // expected
    }
  }

  const statusAfterThreshold = getCircuitBreakerStatus();
  const isOpen = statusAfterThreshold[agentId]?.open === true;
  console.log(`[${isOpen ? "PASS" : "FAIL"}] breaker opens after 3 consecutive failures`);

  let calledWhileOpen = false;
  try {
    await callWithCircuitBreaker(agentId, correlationId, async () => {
      calledWhileOpen = true;
      return "should not run";
    });
  } catch {
    // expected — breaker should reject fast without calling fn
  }
  console.log(
    `[${!calledWhileOpen ? "PASS" : "FAIL"}] breaker rejects fast without calling fn while open`
  );
}

function testManifests() {
  console.log("\n=== Identity + capability manifests ===");
  const identityIds = Object.keys(AGENT_REGISTRY);
  const capabilityIds = Object.keys(CAPABILITY_MANIFESTS);
  const sameSet =
    identityIds.length === capabilityIds.length &&
    identityIds.every((id) => capabilityIds.includes(id));
  console.log(
    `[${sameSet ? "PASS" : "FAIL"}] every agent in identity registry has a capability manifest`
  );

  const noOverlap = Object.values(CAPABILITY_MANIFESTS).every(
    (m) => !m.allowed.some((c) => m.forbidden.includes(c))
  );
  console.log(
    `[${noOverlap ? "PASS" : "FAIL"}] no capability is both allowed and forbidden for the same agent`
  );
}

function testSentinel() {
  console.log("\n=== Sentinel (observe-mode) ===");
  const correlationId = crypto.randomUUID();

  // เคสปกติ: risk-engine ใช้ call_llm_api ซึ่งอยู่ใน manifest อยู่แล้ว ต้องไม่ log อะไร
  const beforeCount = getEventsByCorrelationId(correlationId).length;
  checkCapability("risk-engine", "call_llm_api", correlationId);
  const afterAllowed = getEventsByCorrelationId(correlationId).length;
  console.log(
    `[${afterAllowed === beforeCount ? "PASS" : "FAIL"}] no event logged when capability matches manifest`
  );

  // เคสผิดปกติจำลอง: detector (ไม่ควรมี generate_reply) ถูกเรียกด้วย capability ที่ manifest ห้าม
  checkCapability("detector", "generate_reply", correlationId);
  const afterMismatch = getEventsByCorrelationId(correlationId);
  const flagged = afterMismatch.some((e) => e.type === "sentinel_capability_mismatch");
  console.log(`[${flagged ? "PASS" : "FAIL"}] mismatch against manifest gets logged`);

  // Breaker instability: trip 3 ครั้งในหน้าต่างเวลาเดียวกัน ต้องเกิด incident
  const agentId: AgentId = "output-auditor";
  for (let i = 0; i < 3; i++) {
    recordBreakerTrip(agentId, crypto.randomUUID());
  }
  const incidents = getRecentIncidents();
  const incidentLogged = incidents.some((inc) => inc.agentId === agentId && inc.severity === "high");
  console.log(
    `[${incidentLogged ? "PASS" : "FAIL"}] 3 breaker trips within window raises a sentinel incident`
  );
}

function testPolicyEngine() {
  console.log("\n=== Policy engine (pure function, ไม่แตะ DB) ===");

  const critical = decideReviewSeverity("critical");
  const high = decideReviewSeverity("high");
  const moderate = decideReviewSeverity("moderate");
  console.log(
    `[${
      critical.severity === "critical" && critical.notifyImmediately ? "PASS" : "FAIL"
    }] critical → severity=critical, notifyImmediately=true`
  );
  console.log(
    `[${high.severity === "high" && high.notifyImmediately ? "PASS" : "FAIL"}] high → notifyImmediately=true`
  );
  console.log(
    `[${
      moderate.severity === "medium" && !moderate.notifyImmediately ? "PASS" : "FAIL"
    }] moderate → severity=medium, notifyImmediately=false`
  );
}

async function main() {
  testAuditLog();
  await testCircuitBreaker();
  testManifests();
  testSentinel();
  testPolicyEngine();
}

main();
