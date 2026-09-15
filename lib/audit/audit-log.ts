// Audit log — เก็บ HydraEvent ทุกตัวที่ยิงเข้ามา เพื่อ trace ข้อความหนึ่งข้อความ
// ผ่านทั้ง pipeline ด้วย correlationId เดียว (Detector → Risk engine →
// Orchestrator → Companion → Output auditor)
//
// กติกาที่ห้ามแก้โดยไม่คุยกันก่อน (เหมือน invariant อื่นๆ ในโปรเจกต์นี้):
// logEvent() ต้อง synchronous และห้าม throw ออกไปนอกฟังก์ชันเด็ดขาด เพราะ
// critical path (orchestrator.ts, companion-agent.ts, chat.ts) เรียกฟังก์ชันนี้
// แบบ "fire and forget" — ถ้า logging พังแล้วทำให้ผู้ป่วยไม่ได้คำตอบ นั่นคือ
// การละเมิด "Companion agent ต้องไม่เงียบ" ทางอ้อม audit log ต้องไม่มีทางเป็น
// จุดที่ทำให้ critical path ล่มตาม
//
// TODO: ตอนนี้เก็บใน memory ชั่วคราว (หายเมื่อ restart) เหมือน human-review-queue.ts
// และ system-health.ts — ย้ายไป database/log pipeline จริงใน Phase 2 (observability stack)

import type { HydraEvent, HydraEventType } from "../types/event";

const MAX_EVENTS_IN_MEMORY = 5000; // กัน memory leak บน long-running process แบบ demo

const events: HydraEvent[] = [];

export function logEvent<T = unknown>(
  type: HydraEventType,
  agentId: string,
  correlationId: string,
  payload: T
): void {
  try {
    events.push({
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      correlationId,
      source: { agentId },
      payload,
    });
    if (events.length > MAX_EVENTS_IN_MEMORY) {
      events.splice(0, events.length - MAX_EVENTS_IN_MEMORY);
    }
  } catch (err) {
    // ห้าม throw ออกไป — ดู comment ด้านบนของไฟล์
    console.error("[audit-log] failed to log event (non-fatal):", err);
  }
}

export function getEventsByCorrelationId(correlationId: string): HydraEvent[] {
  return events
    .filter((e) => e.correlationId === correlationId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function getRecentEvents(limit = 100): HydraEvent[] {
  return [...events].slice(-limit).reverse();
}

export interface TraceSummary {
  correlationId: string;
  startedAt: number;
  stepCount: number;
  lastEventType: string;
}

// สรุป event ทั้งหมดเป็นรายการ trace แยกตาม correlationId — ใช้โชว์เป็น list
// ให้เลือกก่อนดู full chain ทีละอัน (ดู lib/audit/event-chain.ts)
export function getRecentTraces(limit = 20): TraceSummary[] {
  const byCorrelation = new Map<string, HydraEvent[]>();
  const lastSeqByCorrelation = new Map<string, number>();

  events.forEach((e, i) => {
    const arr = byCorrelation.get(e.correlationId) ?? [];
    arr.push(e);
    byCorrelation.set(e.correlationId, arr);
    lastSeqByCorrelation.set(e.correlationId, i); // ตำแหน่งล่าสุดที่เจอ correlationId นี้ใน events[]
  });

  const summaries: TraceSummary[] = [];
  for (const [correlationId, evs] of byCorrelation.entries()) {
    const sorted = [...evs].sort((a, b) => a.timestamp - b.timestamp);
    summaries.push({
      correlationId,
      startedAt: sorted[0].timestamp,
      stepCount: sorted.length,
      lastEventType: sorted[sorted.length - 1].type,
    });
  }

  // เรียงตามตำแหน่งจริงใน events[] ไม่ใช่ timestamp ตรงๆ — Date.now() ละเอียดแค่ ms
  // ถ้าหลาย event เกิดในมิลลิวินาทีเดียวกัน (เช่นตอน demo/test ที่ log รัวๆ)
  // การเรียงด้วย timestamp ล้วนๆ จะไม่เสถียรว่าอันไหน "ล่าสุด" จริง
  return summaries
    .sort(
      (a, b) =>
        (lastSeqByCorrelation.get(b.correlationId) ?? 0) -
        (lastSeqByCorrelation.get(a.correlationId) ?? 0)
    )
    .slice(0, limit);
}
