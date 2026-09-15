// คิวสำหรับทีม security ตรวจ requiresAccountReview โดยเฉพาะ — แยกจาก
// human-review-queue.ts ที่แพทย์เห็น เพราะคนละทีม คนละวัตถุประสงค์: ทีมนี้ดู
// รูปแบบ/ความพยายามโจมตี (prompt injection, abuse pattern) ไม่ใช่ความเสี่ยง
// ทางคลินิก และไม่จำเป็นต้องเห็นข้อมูลคลินิกของผู้ป่วยเลย (least privilege)
//
// เข้าคิวนี้เมื่อ orchestrator.ts ตัดสิน decision:"block_soft" เท่านั้น ซึ่ง
// requiresAccountReview เป็น true เสมอในเคสนั้น (ดูกติกาข้อ 3 ใน orchestrator.ts —
// block ระดับบัญชีถาวรต้องมี human ทีม security ตัดสินใจ ไม่ทำอัตโนมัติ)

import { prisma } from "../db";

export interface SecurityReviewItem {
  id: string;
  patientId: string;
  correlationId: string;
  riskLevel: string;
  threatReasons: string[];
  acknowledged: boolean;
  createdAt: string;
}

interface SecurityReviewRow {
  id: string;
  patientId: string;
  correlationId: string;
  riskLevel: string;
  threatReasons: string;
  acknowledged: boolean;
  createdAt: Date;
}

function toItem(row: SecurityReviewRow): SecurityReviewItem {
  return {
    id: row.id,
    patientId: row.patientId,
    correlationId: row.correlationId,
    riskLevel: row.riskLevel,
    threatReasons: JSON.parse(row.threatReasons),
    acknowledged: row.acknowledged,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function flagForSecurityReview(item: {
  patientId: string;
  correlationId: string;
  riskLevel: string;
  threatReasons: string[];
}): Promise<SecurityReviewItem> {
  const row = await prisma.securityReviewItem.create({
    data: {
      patientId: item.patientId,
      correlationId: item.correlationId,
      riskLevel: item.riskLevel,
      threatReasons: JSON.stringify(item.threatReasons),
    },
  });
  return toItem(row);
}

export async function getSecurityReviewQueue(): Promise<SecurityReviewItem[]> {
  const rows = await prisma.securityReviewItem.findMany({
    orderBy: [{ acknowledged: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(toItem);
}

export async function acknowledgeSecurityReviewItem(id: string): Promise<boolean> {
  try {
    await prisma.securityReviewItem.update({ where: { id }, data: { acknowledged: true } });
    return true;
  } catch {
    return false;
  }
}
