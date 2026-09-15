// System health — เวอร์ชันย่อของ Hydra telemetry เดิมใน blueprint (5 แถวสถานะ
// + SSE) เหลือ indicator เดียวที่มาจากข้อมูลจริง ไม่ใช่ mock: ทุกครั้งที่
// pipeline ใน companion/chat.ts ต้องใช้ fallback ให้เรียก markDegraded()
// ตรงนี้ — ถ้าไม่มีการล่มใน 5 นาทีล่าสุด ถือว่าระบบปกติ

// TODO: ถ้า scale เกิน 1 instance ต้องย้ายไป shared store (Redis) เหมือน rate limit

const DEGRADED_WINDOW_MS = 5 * 60 * 1000;
let lastDegradedAt: number | null = null;

export function markDegraded(): void {
  lastDegradedAt = Date.now();
}

export function getSystemHealth(): "healthy" | "degraded" {
  if (!lastDegradedAt) return "healthy";
  return Date.now() - lastDegradedAt < DEGRADED_WINDOW_MS ? "degraded" : "healthy";
}
