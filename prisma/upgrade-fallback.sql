-- For an already initialized SQLite demo DB. Prefer `npx prisma db push`.
CREATE TABLE IF NOT EXISTS "CompanionReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "patientId" TEXT NOT NULL,
  "encryptedShards" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "CompanionReceipt_patientId_idx" ON "CompanionReceipt"("patientId");
