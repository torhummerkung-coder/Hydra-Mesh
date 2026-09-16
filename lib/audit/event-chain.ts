// Event chain — ต่อ HydraEvent ที่มี correlationId เดียวกันให้เป็น timeline อ่านง่าย
// ใช้ตอน debug หรือโชว์ trace ใน Doctor dashboard ในอนาคต (ยังไม่ต่อ UI/endpoint
// ใดๆ ในรอบนี้ — แค่ฟังก์ชัน pure ที่พร้อมให้ endpoint เรียกใช้ทีหลัง)

import { getEventsByCorrelationId } from "./audit-log";
import type { HydraEvent } from "../types/event";

export interface EventChainStep {
  agentId: string;
  type: string;
  atMs: number; // เวลาเทียบกับ event แรกในสาย หน่วย ms
  payload: unknown;
}

export interface EventChain {
  correlationId: string;
  totalDurationMs: number;
  // เจ้าของสายนี้ ถ้ามี event ใดผูก patientId ไว้ — ใช้ตรวจ CareAssignment
  // ก่อนให้แพทย์เห็น chain นี้ (ดู pages/api/doctor/event-trace.ts)
  patientId?: string;
  steps: EventChainStep[];
}

export function buildEventChain(correlationId: string): EventChain | null {
  const chainEvents: HydraEvent[] = getEventsByCorrelationId(correlationId);
  if (chainEvents.length === 0) return null;

  const startedAt = chainEvents[0].timestamp;
  const endedAt = chainEvents[chainEvents.length - 1].timestamp;
  const patientId = chainEvents.find((e) => e.patientId)?.patientId;

  return {
    correlationId,
    totalDurationMs: endedAt - startedAt,
    ...(patientId ? { patientId } : {}),
    steps: chainEvents.map((e) => ({
      agentId: e.source.agentId,
      type: e.type,
      atMs: e.timestamp - startedAt,
      payload: e.payload,
    })),
  };
}
