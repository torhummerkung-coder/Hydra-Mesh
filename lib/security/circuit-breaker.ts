// Circuit breaker — ห่อ LLM API call ของแต่ละ agent (Risk engine, Companion,
// Output auditor) เพื่อ fail fast ตอนรู้อยู่แล้วว่า service กำลังล่มซ้ำๆ
// แทนที่จะรอ fetch timeout ทุกครั้ง
//
// สำคัญมาก: breaker นี้ "ไม่ใช่" stage ใหม่ในการตัดสินใจ routing และไม่เปลี่ยน
// error semantics เดิม — ถ้า trip แล้ว throw error ทันที (เร็วกว่าเดิม) ให้
// try/catch เดิมใน pages/api/companion/chat.ts จับแล้วไป getFallbackReply()
// ตามปกติเป๊ะ เหมือนตอนที่ fetch จริงล้มเหลว ห้ามใครเปลี่ยนให้ breaker
// "ตัดสินใจ" อะไรเองแทน Orchestrator หรือเปลี่ยนผลลัพธ์ที่ผู้ป่วยเห็น
//
// TODO: state เก็บใน memory ต่อ instance เหมือนโมดูลอื่นในโปรเจกต์นี้ (rate
// limit, system health) — ย้ายไป shared store ตอน scale หลาย instance (Phase 2)

import { logEvent } from "../audit/audit-log";
import { recordBreakerTrip } from "../sentinel/sentinel";
import type { AgentId } from "../types/agent";

interface BreakerState {
  failureCount: number;
  openedAt: number | null;
}

const FAILURE_THRESHOLD = 3; // พังติดกันกี่ครั้งถึง trip
const OPEN_DURATION_MS = 30 * 1000; // trip แล้วปิดรับ call กี่ ms ก่อนลองใหม่ (half-open)

const breakers = new Map<AgentId, BreakerState>();

function getState(agentId: AgentId): BreakerState {
  let state = breakers.get(agentId);
  if (!state) {
    state = { failureCount: 0, openedAt: null };
    breakers.set(agentId, state);
  }
  return state;
}

function isOpen(state: BreakerState): boolean {
  if (state.openedAt === null) return false;
  const stillOpen = Date.now() - state.openedAt < OPEN_DURATION_MS;
  if (!stillOpen) {
    // half-open: หมดเวลาปิดแล้ว ให้ลองใหม่อีกครั้ง รีเซ็ต state ก่อน
    state.openedAt = null;
    state.failureCount = 0;
  }
  return stillOpen;
}

export async function callWithCircuitBreaker<T>(
  agentId: AgentId,
  correlationId: string,
  fn: () => Promise<T>
): Promise<T> {
  const state = getState(agentId);

  if (isOpen(state)) {
    logEvent("circuit_breaker_trip", agentId, correlationId, { reason: "breaker_open" });
    throw new Error(`Circuit breaker open for ${agentId} — service ล่มซ้ำ ข้ามไป fallback ทันที`);
  }

  try {
    const result = await fn();
    state.failureCount = 0; // สำเร็จแล้ว reset
    return result;
  } catch (err) {
    state.failureCount += 1;
    if (state.failureCount >= FAILURE_THRESHOLD) {
      state.openedAt = Date.now();
      logEvent("circuit_breaker_trip", agentId, correlationId, {
        reason: "failure_threshold_reached",
        failureCount: state.failureCount,
      });
      recordBreakerTrip(agentId, correlationId); // Sentinel: ติดตามว่า trip นี้ต่อเนื่องแค่ไหน
    }
    throw err;
  }
}

export function getCircuitBreakerStatus(): Record<string, { open: boolean; failureCount: number }> {
  const status: Record<string, { open: boolean; failureCount: number }> = {};
  for (const [agentId, state] of breakers.entries()) {
    status[agentId] = { open: isOpen(state), failureCount: state.failureCount };
  }
  return status;
}
