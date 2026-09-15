// Sentinel v1 — observe-mode เท่านั้น ตามที่ตกลงไว้ใน PRODUCTION_ROADMAP.md
// (ส่วนขยาย v2.0 + Phase 4): log/score พฤติกรรมผิดปกติของ agent เอง ไม่ block
// อะไรทั้งสิ้น ไม่มีจุดไหนใน critical path ที่รอผลจาก Sentinel ก่อนตอบผู้ป่วย
//
// ขอบเขตตอนนี้ (ตั้งใจให้แคบ — ไม่ fabricate signal ที่ไม่มีจริงในโค้ด):
// 1. Capability check — เทียบว่า agent เรียกใช้ capability ตรงกับ manifest ใน
//    capabilities.ts ไหม log เฉพาะตอนไม่ตรง (ไม่เคยเกิดตอนนี้เพราะโค้ดทำตาม
//    manifest อยู่แล้ว แต่เป็น safety net ถ้าใครแก้โค้ดในอนาคตแล้วเผลอทำเกินสิทธิ์)
// 2. Breaker instability — circuit-breaker.ts เรียก recordBreakerTrip() ทุกครั้งที่ trip
//    ถ้า agent เดียว trip ซ้ำเกิน threshold ภายในหน้าต่างเวลาสั้นๆ = ปัญหาต่อเนื่อง
//    ไม่ใช่ blip ชั่วคราว → บันทึกเป็น incident
//
// ยังไม่ทำ (เก็บไว้ Phase 4 เพราะไม่มี signal จริงให้เกาะตอนนี้ — ไม่ใช่ทำไม่ได้
// แค่ยังไม่มีอะไรให้สังเกตจริง ทำตอนนี้จะเป็นการ fabricate):
// - goal drift detection — ไม่มี agent ไหนประกาศ "goal" แบบ structured ในโค้ดตอนนี้
// - retry-loop detection — pipeline ปัจจุบันไม่มี retry logic เลย (fail fast ไป
//   fallback ทันทีตาม circuit-breaker.ts ไม่มีลูปให้ตรวจ)

import { logEvent } from "../audit/audit-log";
import { CAPABILITY_MANIFESTS } from "../security/capabilities";
import type { AgentId } from "../types/agent";
import type { Capability } from "../types/capability";
import type { Incident } from "../types/incident";

const TRIP_WINDOW_MS = 5 * 60 * 1000; // 5 นาที
const TRIP_THRESHOLD = 3; // trip กี่ครั้งในหน้าต่างนี้ถึงนับว่า "ต่อเนื่อง" ไม่ใช่ blip เดียว

const recentTrips = new Map<AgentId, number[]>();
const incidents: Incident[] = [];

// เช็คว่า agent เรียกใช้ capability ตรงกับที่ manifest ประกาศไว้ไหม — ไม่ throw
// ไม่ block เด็ดขาด แค่ log ตอนไม่ตรงเท่านั้น (ปกติควรจะไม่มี log เกิดขึ้นเลย)
export function checkCapability(agentId: AgentId, capability: Capability, correlationId: string): void {
  const manifest = CAPABILITY_MANIFESTS[agentId];
  if (!manifest) return;

  if (!manifest.allowed.includes(capability)) {
    logEvent("sentinel_capability_mismatch", agentId, correlationId, {
      attempted: capability,
      allowed: manifest.allowed,
    });
  }
}

export function recordBreakerTrip(agentId: AgentId, correlationId: string): void {
  const now = Date.now();
  const trips = (recentTrips.get(agentId) ?? []).filter((t) => now - t < TRIP_WINDOW_MS);
  trips.push(now);
  recentTrips.set(agentId, trips);

  if (trips.length >= TRIP_THRESHOLD) {
    const incident: Incident = {
      id: crypto.randomUUID(),
      detectedAt: new Date().toISOString(),
      severity: "high",
      agentId,
      description: `${agentId} trip circuit breaker ${trips.length} ครั้งใน ${
        TRIP_WINDOW_MS / 60000
      } นาที — น่าจะเป็นปัญหาต่อเนื่อง ไม่ใช่ blip ชั่วคราว`,
      relatedCorrelationIds: [correlationId],
    };
    incidents.push(incident);
    logEvent("sentinel_incident", agentId, correlationId, incident);
    recentTrips.set(agentId, []); // reset กันแจ้งซ้ำทุก trip จนกว่าจะครบ threshold รอบใหม่
  }
}

export function getRecentIncidents(limit = 20): Incident[] {
  return [...incidents].slice(-limit).reverse();
}
