// คิวรวมสำหรับ Human Review Gate — ไม่ว่าความเสี่ยงจะถูกตรวจพบจาก Risk engine
// ตอนคุยแชท หรือจากคะแนน 8Q เกินเกณฑ์ ต้องมาจบที่คิวเดียวกันให้แพทย์เห็นครบ
// ไม่แยกกันเป็นคนละที่ ไม่งั้นแพทย์ต้องเช็คหลายจอ
//
// v2 Phase 1: ย้ายจาก in-memory array ไป Prisma + SQLite แล้ว — ชื่อฟังก์ชัน export
// เหมือนเดิมทุกตัว แต่ตอนนี้เป็น async จริง (DB call จริง) — เรียกที่ไหนต้องเติม
// await เอง ดู pages/api/companion/chat.ts (รันคู่กับ generateCompanionReply แบบ
// Promise.all ไม่ใช่รอตามลำดับ กัน latency เพิ่มโดยไม่จำเป็น), pages/api/screening/8q.ts,
// pages/api/doctor/review-queue.ts ว่าแก้ยังไง

import { prisma } from "../db";
import { decideReviewSeverity } from "../security/policy-engine";
import type { ReviewSeverity } from "../types/policy";

export type ReviewSource = "chat_risk_engine" | "screening_8q";

export interface ReviewQueueItem {
  id: string;
  patientId: string;
  source: ReviewSource;
  reason: string;
  riskLevel: string;
  createdAt: string; // ISO string เหมือนเดิม แม้ DB เก็บเป็น DateTime (แปลงตอน map ออก)
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedById: string | null;
  severity: ReviewSeverity;
  notifyImmediately: boolean;
}

interface ReviewQueueRow {
  id: string;
  patientId: string;
  source: string;
  reason: string;
  riskLevel: string;
  severity: string;
  notifyImmediately: boolean;
  acknowledged: boolean;
  acknowledgedAt: Date | null;
  acknowledgedById: string | null;
  createdAt: Date;
}

// แปลง Prisma row (createdAt เป็น Date object) ให้ shape เหมือนเดิมทุกประการ
// (createdAt เป็น ISO string) กัน caller เดิม (dashboard.tsx) พัง
function toReviewQueueItem(row: ReviewQueueRow): ReviewQueueItem {
  return {
    id: row.id,
    patientId: row.patientId,
    source: row.source as ReviewSource,
    reason: row.reason,
    riskLevel: row.riskLevel,
    severity: row.severity as ReviewSeverity,
    notifyImmediately: row.notifyImmediately,
    acknowledged: row.acknowledged,
    acknowledgedAt: row.acknowledgedAt?.toISOString() ?? null,
    acknowledgedById: row.acknowledgedById,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function flagForHumanReview(
  item: Omit<
    ReviewQueueItem,
    | "id"
    | "createdAt"
    | "acknowledged"
    | "acknowledgedAt"
    | "acknowledgedById"
    | "severity"
    | "notifyImmediately"
  >,
  id?: string
): Promise<ReviewQueueItem> {
  const policy = decideReviewSeverity(item.riskLevel);
  const data = { ...item, severity: policy.severity, notifyImmediately: policy.notifyImmediately };
  const row = id
    ? await prisma.reviewQueueItem.upsert({ where: { id }, create: { id, ...data }, update: {} })
    : await prisma.reviewQueueItem.create({ data });
  return toReviewQueueItem(row);
}

// v2: notifyImmediately ขึ้นก่อนเสมอ ไม่ว่าจะเก่าหรือใหม่กว่า — หมอเห็น
// high/critical ก่อน medium/low เสมอ ภายในกลุ่มเดียวกันเรียงใหม่สุดก่อนเหมือนเดิม
export async function getReviewQueue(patientIds?: string[]): Promise<ReviewQueueItem[]> {
  if (patientIds && patientIds.length === 0) return [];
  const rows = await prisma.reviewQueueItem.findMany({
    where: patientIds ? { patientId: { in: patientIds } } : undefined,
    orderBy: [{ notifyImmediately: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toReviewQueueItem);
}

export async function acknowledgeReviewItem(id: string): Promise<boolean> {
  try {
    await prisma.reviewQueueItem.update({
      where: { id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    });
    return true;
  } catch {
    return false; // record not found หรือ error อื่น — ทั้งคู่ถือว่าไม่สำเร็จ
  }
}

export type AssignedAcknowledgementResult =
  | { status: "acknowledged" | "already_acknowledged"; item: ReviewQueueItem }
  | { status: "not_found" };

// ตรวจ assignment และเขียนหลักฐานการรับทราบใน transaction เดียวกัน ไม่แยกเป็น
// "เช็คก่อน แล้วค่อย update" ที่เปิด race ให้สิทธิ์ถูกยกเลิกคั่นกลางได้
export async function acknowledgeAssignedReviewItem(
  id: string,
  clinicianId: string,
  now = new Date()
): Promise<AssignedAcknowledgementResult> {
  return prisma.$transaction(async (tx) => {
    const row = await tx.reviewQueueItem.findUnique({ where: { id } });
    if (!row) return { status: "not_found" };

    const clinician = await tx.user.findUnique({
      where: { id: clinicianId },
      select: { role: true },
    });
    if (!clinician || !["doctor", "staff"].includes(clinician.role)) {
      return { status: "not_found" };
    }

    const assignment = await tx.careAssignment.findFirst({
      where: {
        clinicianId,
        patientId: row.patientId,
        status: "active",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { id: true },
    });
    if (!assignment) return { status: "not_found" };
    if (row.acknowledged) {
      return { status: "already_acknowledged", item: toReviewQueueItem(row) };
    }

    const updated = await tx.reviewQueueItem.update({
      where: { id },
      data: {
        acknowledged: true,
        acknowledgedAt: now,
        acknowledgedById: clinicianId,
      },
    });
    return { status: "acknowledged", item: toReviewQueueItem(updated) };
  });
}
