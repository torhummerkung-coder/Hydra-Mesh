import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { isSessionRole, type SessionPayload, type SessionRole } from "../session";

export const CLINICAL_CAPABILITIES = [
  "patient.list.assigned",
  "patient.read.assigned",
  "review.list.assigned",
  "review.acknowledge.assigned",
  "care_assignment.manage",
] as const;

export type ClinicalCapability = (typeof CLINICAL_CAPABILITIES)[number];

const ROLE_CAPABILITIES: Record<SessionRole, readonly ClinicalCapability[]> = {
  patient: [],
  doctor: [
    "patient.list.assigned",
    "patient.read.assigned",
    "review.list.assigned",
    "review.acknowledge.assigned",
  ],
  staff: [
    "patient.list.assigned",
    "patient.read.assigned",
    "review.list.assigned",
    "review.acknowledge.assigned",
  ],
  admin: ["care_assignment.manage"],
  security: [],
};

export function hasClinicalCapability(
  session: SessionPayload | null,
  capability: ClinicalCapability
): session is SessionPayload {
  return Boolean(session && ROLE_CAPABILITIES[session.role].includes(capability));
}

// JWT เป็น snapshot ตอน login แต่ role ในฐานข้อมูลอาจถูกเปลี่ยนระหว่างอายุ token
// งานคลินิกจึงยืนยันว่า account และ role ปัจจุบันยังตรงกับ token ทุก request
export async function hasCurrentClinicalCapability(
  session: SessionPayload,
  capability: ClinicalCapability
): Promise<boolean> {
  if (!hasClinicalCapability(session, capability)) return false;
  const account = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { role: true },
  });
  return Boolean(
    account &&
      isSessionRole(account.role) &&
      account.role === session.role &&
      ROLE_CAPABILITIES[account.role].includes(capability)
  );
}

function activeAssignmentWhere(now = new Date()): Prisma.CareAssignmentWhereInput {
  return {
    status: "active",
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  };
}

export async function hasActiveCareAssignment(
  clinicianId: string,
  patientId: string,
  now = new Date()
): Promise<boolean> {
  const assignment = await prisma.careAssignment.findFirst({
    where: { clinicianId, patientId, ...activeAssignmentWhere(now) },
    select: { id: true },
  });
  return Boolean(assignment);
}

export async function getActiveAssignedPatientIds(
  clinicianId: string,
  now = new Date()
): Promise<string[]> {
  const assignments = await prisma.careAssignment.findMany({
    where: { clinicianId, ...activeAssignmentWhere(now), patient: { role: "patient" } },
    select: { patientId: true },
  });
  return assignments.map((assignment) => assignment.patientId);
}

export type AssignedPatientRisk = "unknown" | "low" | "moderate" | "high" | "critical";

export interface AssignedPatientDirectoryItem {
  id: string;
  name: string;
  riskLevel: AssignedPatientRisk;
  lastActiveAt: string | null;
  assignmentExpiresAt: string | null;
}

const RISK_RANK: Record<AssignedPatientRisk, number> = {
  unknown: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

function normalizeReviewRisk(riskLevel: string, severity: string): AssignedPatientRisk {
  if (["low", "moderate", "high", "critical"].includes(riskLevel)) {
    return riskLevel as AssignedPatientRisk;
  }
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "medium") return "moderate";
  if (severity === "low") return "low";
  return "unknown";
}

function latestDate(...values: Array<Date | null | undefined>): Date | null {
  const present = values.filter((value): value is Date => value instanceof Date);
  if (present.length === 0) return null;
  return new Date(Math.max(...present.map((value) => value.getTime())));
}

export async function getAssignedPatientDirectory(
  clinicianId: string,
  now = new Date()
): Promise<AssignedPatientDirectoryItem[]> {
  const assignments = await prisma.careAssignment.findMany({
    where: { clinicianId, ...activeAssignmentWhere(now), patient: { role: "patient" } },
    select: {
      patientId: true,
      expiresAt: true,
      patient: { select: { id: true, displayName: true } },
    },
    orderBy: { assignedAt: "asc" },
  });

  const patientIds = assignments.map((assignment) => assignment.patientId);
  if (patientIds.length === 0) return [];

  const [conversationActivity, screeningActivity, openReviews] = await Promise.all([
    prisma.conversationMessage.groupBy({
      by: ["patientId"],
      where: { patientId: { in: patientIds } },
      _max: { createdAt: true },
    }),
    prisma.screeningResponse.groupBy({
      by: ["patientId"],
      where: { patientId: { in: patientIds } },
      _max: { createdAt: true },
    }),
    prisma.reviewQueueItem.findMany({
      where: { patientId: { in: patientIds }, acknowledged: false },
      select: { patientId: true, riskLevel: true, severity: true, createdAt: true },
    }),
  ]);

  const conversationByPatient = new Map(
    conversationActivity.map((row) => [row.patientId, row._max.createdAt])
  );
  const screeningByPatient = new Map(
    screeningActivity.map((row) => [row.patientId, row._max.createdAt])
  );
  const reviewDateByPatient = new Map<string, Date>();
  const riskByPatient = new Map<string, AssignedPatientRisk>();

  for (const review of openReviews) {
    const nextRisk = normalizeReviewRisk(review.riskLevel, review.severity);
    const currentRisk = riskByPatient.get(review.patientId) ?? "unknown";
    if (RISK_RANK[nextRisk] > RISK_RANK[currentRisk]) {
      riskByPatient.set(review.patientId, nextRisk);
    }
    const currentDate = reviewDateByPatient.get(review.patientId);
    if (!currentDate || review.createdAt > currentDate) {
      reviewDateByPatient.set(review.patientId, review.createdAt);
    }
  }

  return assignments.map((assignment) => {
    const lastActive = latestDate(
      conversationByPatient.get(assignment.patientId),
      screeningByPatient.get(assignment.patientId),
      reviewDateByPatient.get(assignment.patientId)
    );
    return {
      id: assignment.patient.id,
      name: assignment.patient.displayName ?? `ผู้ป่วย ${assignment.patient.id.slice(0, 8)}`,
      riskLevel: riskByPatient.get(assignment.patientId) ?? "unknown",
      lastActiveAt: lastActive?.toISOString() ?? null,
      assignmentExpiresAt: assignment.expiresAt?.toISOString() ?? null,
    };
  });
}

export class CareAssignmentError extends Error {
  constructor(public readonly code: "invalid_actor" | "invalid_patient" | "invalid_clinician" | "invalid_expiry") {
    super(code);
    this.name = "CareAssignmentError";
  }
}

export async function assignCareTeamMember(input: {
  patientId: string;
  clinicianId: string;
  assignedById: string;
  expiresAt?: Date | null;
}) {
  if (input.expiresAt && input.expiresAt <= new Date()) {
    throw new CareAssignmentError("invalid_expiry");
  }

  return prisma.$transaction(async (tx) => {
    const [actor, patient, clinician] = await Promise.all([
      tx.user.findUnique({ where: { id: input.assignedById }, select: { role: true } }),
      tx.user.findUnique({ where: { id: input.patientId }, select: { role: true } }),
      tx.user.findUnique({ where: { id: input.clinicianId }, select: { role: true } }),
    ]);
    if (actor?.role !== "admin") throw new CareAssignmentError("invalid_actor");
    if (patient?.role !== "patient") throw new CareAssignmentError("invalid_patient");
    if (!clinician || !["doctor", "staff"].includes(clinician.role)) {
      throw new CareAssignmentError("invalid_clinician");
    }

    return tx.careAssignment.upsert({
      where: {
        patientId_clinicianId: {
          patientId: input.patientId,
          clinicianId: input.clinicianId,
        },
      },
      create: {
        patientId: input.patientId,
        clinicianId: input.clinicianId,
        assignedById: input.assignedById,
        expiresAt: input.expiresAt ?? null,
      },
      update: {
        status: "active",
        assignedById: input.assignedById,
        assignedAt: new Date(),
        expiresAt: input.expiresAt ?? null,
        revokedAt: null,
      },
    });
  });
}

export async function revokeCareTeamMember(input: {
  patientId: string;
  clinicianId: string;
  revokedById: string;
}): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const actor = await tx.user.findUnique({
      where: { id: input.revokedById },
      select: { role: true },
    });
    if (actor?.role !== "admin") throw new CareAssignmentError("invalid_actor");

    const result = await tx.careAssignment.updateMany({
      where: {
        patientId: input.patientId,
        clinicianId: input.clinicianId,
        status: "active",
      },
      data: { status: "revoked", revokedAt: new Date() },
    });
    return result.count > 0;
  });
}

export async function listCareAssignments() {
  return prisma.careAssignment.findMany({
    select: {
      id: true,
      status: true,
      assignedAt: true,
      expiresAt: true,
      revokedAt: true,
      patient: { select: { id: true, displayName: true } },
      clinician: { select: { id: true, role: true, displayName: true } },
    },
    orderBy: { assignedAt: "desc" },
  });
}

export async function listCareAssignmentCandidates() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["patient", "doctor", "staff"] } },
    select: { id: true, role: true, displayName: true },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
  });
  return {
    patients: users.filter((user) => user.role === "patient"),
    clinicians: users.filter((user) => user.role === "doctor" || user.role === "staff"),
  };
}
