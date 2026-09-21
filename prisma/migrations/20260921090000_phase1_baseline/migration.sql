-- CreateTable
CREATE TABLE "ReviewQueueItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "notifyImmediately" BOOLEAN NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" DATETIME,
    "acknowledgedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewQueueItem_acknowledgedById_fkey" FOREIGN KEY ("acknowledgedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PatientDataKey" (
    "patientId" TEXT NOT NULL PRIMARY KEY,
    "wrappedKeyJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "encryptedShards" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CareAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "clinicianId" TEXT NOT NULL,
    "assignedById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME,
    "revokedAt" DATETIME,
    CONSTRAINT "CareAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CareAssignment_clinicianId_fkey" FOREIGN KEY ("clinicianId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CareAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SecurityReviewItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "threatReasons" TEXT NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ScreeningResponse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "questionnaire" TEXT NOT NULL,
    "encryptedShards" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CompanionReceipt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "encryptedShards" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "ReviewQueueItem_patientId_idx" ON "ReviewQueueItem"("patientId");

-- CreateIndex
CREATE INDEX "ReviewQueueItem_acknowledged_patientId_createdAt_idx" ON "ReviewQueueItem"("acknowledged", "patientId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewQueueItem_notifyImmediately_createdAt_idx" ON "ReviewQueueItem"("notifyImmediately", "createdAt");

-- CreateIndex
CREATE INDEX "ConversationMessage_patientId_createdAt_idx" ON "ConversationMessage"("patientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "CareAssignment_clinicianId_status_expiresAt_idx" ON "CareAssignment"("clinicianId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "CareAssignment_patientId_status_expiresAt_idx" ON "CareAssignment"("patientId", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CareAssignment_patientId_clinicianId_key" ON "CareAssignment"("patientId", "clinicianId");

-- CreateIndex
CREATE INDEX "SecurityReviewItem_acknowledged_createdAt_idx" ON "SecurityReviewItem"("acknowledged", "createdAt");

-- CreateIndex
CREATE INDEX "ScreeningResponse_patientId_questionnaire_createdAt_idx" ON "ScreeningResponse"("patientId", "questionnaire", "createdAt");

-- CreateIndex
CREATE INDEX "CompanionReceipt_patientId_idx" ON "CompanionReceipt"("patientId");
