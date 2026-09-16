-- อัปเกรดฐานข้อมูล Phase 1: Clinician Authorization
-- สำรองไฟล์ฐานข้อมูลก่อนรัน และรันเพียงครั้งเดียวกับ schema รุ่นก่อนหน้านี้
-- ทางที่แนะนำสำหรับ demo คือ `npx prisma db push` ซึ่งอ่าน schema.prisma โดยตรง

PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "CareAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "clinicianId" TEXT NOT NULL,
  "assignedById" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" DATETIME,
  "revokedAt" DATETIME,
  CONSTRAINT "CareAssignment_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CareAssignment_clinicianId_fkey"
    FOREIGN KEY ("clinicianId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CareAssignment_assignedById_fkey"
    FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CareAssignment_patientId_clinicianId_key"
  ON "CareAssignment"("patientId", "clinicianId");
CREATE INDEX IF NOT EXISTS "CareAssignment_clinicianId_status_expiresAt_idx"
  ON "CareAssignment"("clinicianId", "status", "expiresAt");
CREATE INDEX IF NOT EXISTS "CareAssignment_patientId_status_expiresAt_idx"
  ON "CareAssignment"("patientId", "status", "expiresAt");

ALTER TABLE "ReviewQueueItem" ADD COLUMN "acknowledgedAt" DATETIME;
ALTER TABLE "ReviewQueueItem" ADD COLUMN "acknowledgedById" TEXT
  REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ReviewQueueItem_acknowledged_patientId_createdAt_idx"
  ON "ReviewQueueItem"("acknowledged", "patientId", "createdAt");
