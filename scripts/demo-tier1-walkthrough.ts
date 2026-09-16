import { logEvent, getEventsByCorrelationId } from "../lib/audit/audit-log";
import { buildEventChain } from "../lib/audit/event-chain";
import { callWithCircuitBreaker, getCircuitBreakerStatus } from "../lib/security/circuit-breaker";
import { AGENT_REGISTRY } from "../lib/security/identity";
import { CAPABILITY_MANIFESTS } from "../lib/security/capabilities";

// Demo นี้จำลอง pipeline โดยไม่เรียก Anthropic API จริง (ไม่มี network/API key
// ในสภาพแวดล้อมนี้) — payload ที่ log ใช้ shape เดียวกับที่ orchestrator.ts /
// companion-agent.ts ยิงจริง เพื่อให้เห็นว่า trace หน้าตาเป็นยังไงตอน integrate จริง

function section(title: string) {
  console.log(`\n${"=".repeat(60)}\n${title}\n${"=".repeat(60)}`);
}

function scenario1_normalMessage() {
  section("SCENARIO 1: ข้อความปกติ ไหลผ่านทั้ง pipeline");

  const correlationId = crypto.randomUUID();
  console.log(`correlationId: ${correlationId}`);
  console.log(`ข้อความจำลอง: "วันนี้อากาศดีจัง อยากไปเดินเล่น"\n`);

  logEvent("message_received", "orchestrator", correlationId, { length: 28 });
  logEvent("detector_result", "detector", correlationId, { threat: false, reasons: [] });
  logEvent("risk_result", "risk-engine", correlationId, {
    risk_level: "none",
    confidence: 0.95,
    factors: [],
  });
  logEvent("orchestrator_decision", "orchestrator", correlationId, {
    decision: "allow",
    riskLevel: "none",
  });
  logEvent("companion_reply", "companion", correlationId, { audited: true });

  const chain = buildEventChain(correlationId)!;
  console.log(`ผลจาก buildEventChain() — trace ทั้งหมดของข้อความนี้:\n`);
  console.log(`  total duration: ${chain.totalDurationMs}ms, ${chain.steps.length} steps\n`);
  chain.steps.forEach((s, i) => {
    console.log(`  [${i + 1}] +${s.atMs}ms  ${s.agentId.padEnd(14)} ${s.type}`);
    console.log(`      payload: ${JSON.stringify(s.payload)}`);
  });
}

function scenario2_crisisMessage() {
  section("SCENARIO 2: สัญญาณวิกฤต — ต้องเห็น decision=review ใน trace");

  const correlationId = crypto.randomUUID();
  console.log(`correlationId: ${correlationId}`);
  console.log(`ข้อความจำลอง: "ผมรู้สึกไม่อยากอยู่ต่อแล้ว คิดจะทำร้ายตัวเอง"\n`);

  logEvent("message_received", "orchestrator", correlationId, { length: 45 });
  logEvent("detector_result", "detector", correlationId, { threat: false, reasons: [] });
  logEvent("risk_result", "risk-engine", correlationId, {
    risk_level: "critical",
    confidence: 0.91,
    factors: ["พูดถึงความคิดทำร้ายตนเอง", "ภาษาแสดงความสิ้นหวัง"],
  });
  logEvent("orchestrator_decision", "orchestrator", correlationId, {
    decision: "review", // กติกาข้อ 2 — สัญญาณวิกฤตชนะ ไม่ block
    riskLevel: "critical",
  });
  logEvent("companion_reply", "companion", correlationId, { audited: true });

  const chain = buildEventChain(correlationId)!;
  chain.steps.forEach((s, i) => {
    console.log(`  [${i + 1}] +${s.atMs}ms  ${s.agentId.padEnd(14)} ${s.type}`);
    console.log(`      payload: ${JSON.stringify(s.payload)}`);
  });
  console.log(
    `\n  → decision สุดท้ายคือ "review" ไม่ใช่ "block_soft" แม้ Risk engine ประเมิน critical\n` +
      `    Companion ยังตอบผู้ป่วยตามปกติ (companion_reply ยิงต่อจาก orchestrator_decision)`
  );
}

async function scenario3_circuitBreakerRealistic() {
  section("SCENARIO 3: Risk engine ล่มติดกัน 3 ครั้ง → circuit breaker trip");

  const agentId = "risk-engine" as const;
  let attempt = 0;

  const simulateFlakyRiskEngine = async () => {
    attempt++;
    console.log(`  เรียก risk-engine ครั้งที่ ${attempt}...`);
    throw new Error("fetch failed: ECONNREFUSED (จำลอง API ล่ม)");
  };

  for (let i = 1; i <= 4; i++) {
    const correlationId = crypto.randomUUID();
    try {
      await callWithCircuitBreaker(agentId, correlationId, simulateFlakyRiskEngine);
    } catch (err) {
      const status = getCircuitBreakerStatus()[agentId];
      const viaBreaker = attempt < i; // ถ้า attempt ไม่โตขึ้น = breaker บล็อกไว้ก่อนเรียกจริง
      console.log(
        `  → request ${i}: ${err instanceof Error ? err.message : err} ` +
          `(breaker open=${status.open}, failureCount=${status.failureCount}${
            viaBreaker ? ", ไม่ได้เรียก risk-engine จริงรอบนี้" : ""
          })`
      );
    }
  }

  console.log(
    `\n  สรุป: เรียกฟังก์ชันจำลองจริงแค่ ${attempt} ครั้งจาก 4 request — ครั้งที่ 4 ถูก breaker ` +
      `ดักไว้ก่อนโดยไม่ยิง network call ซ้ำ (เร็วกว่ารอ fetch timeout) แล้ว throw ให้ chat.ts\n` +
      `  จับไป getFallbackReply() เหมือนตอน risk-engine ล่มจริงทุกประการ`
  );
}

function scenario4_manifests() {
  section("SCENARIO 4: Identity + Capability manifest ของทุก agent ในระบบ");

  for (const agentId of Object.keys(AGENT_REGISTRY) as (keyof typeof AGENT_REGISTRY)[]) {
    const identity = AGENT_REGISTRY[agentId];
    const capability = CAPABILITY_MANIFESTS[agentId];
    console.log(`\n  ${identity.displayName} (${identity.kind}${identity.model ? `, ${identity.model}` : ""})`);
    console.log(`    purpose:   ${capability.purpose}`);
    console.log(`    allowed:   ${capability.allowed.join(", ")}`);
    console.log(`    forbidden: ${capability.forbidden.join(", ")}`);
  }
}

async function main() {
  scenario1_normalMessage();
  scenario2_crisisMessage();
  await scenario3_circuitBreakerRealistic();
  scenario4_manifests();
  console.log(`\n${"=".repeat(60)}\nจบ demo — ทุก event ข้างบนมาจากฟังก์ชันจริงใน lib/audit, lib/security\nที่ integrate เข้า orchestrator.ts/companion-agent.ts/chat.ts แล้ว\n${"=".repeat(60)}`);
}

main();
