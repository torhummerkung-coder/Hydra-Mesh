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
  steps: EventChainStep[];
}

export function buildEventChain(correlationId: string): EventChain | null {
  const chainEvents: HydraEvent[] = getEventsByCorrelationId(correlationId);
  if (chainEvents.length === 0) return null;

  const startedAt = chainEvents[0].timestamp;
  const endedAt = chainEvents[chainEvents.length - 1].timestamp;

  return {
    correlationId,
    totalDurationMs: endedAt - startedAt,
    steps: chainEvents.map((e) => ({
      agentId: e.source.agentId,
      type: e.type,
      atMs: e.timestamp - startedAt,
      payload: e.payload,
    })),
  };
}
