import type { NextApiRequest, NextApiResponse } from "next";
import { logEvent } from "../../../lib/audit/audit-log";
import {
  assignCareTeamMember,
  CareAssignmentError,
  hasClinicalCapability,
  hasCurrentClinicalCapability,
  listCareAssignmentCandidates,
  listCareAssignments,
  revokeCareTeamMember,
} from "../../../lib/auth/clinical-authorization";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../../../lib/session";

function parseExpiry(value: unknown): Date | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new CareAssignmentError("invalid_expiry");
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new CareAssignmentError("invalid_expiry");
  return parsed;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
  if (!hasClinicalCapability(session, "care_assignment.manage")) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  try {
    if (!(await hasCurrentClinicalCapability(session, "care_assignment.manage"))) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
  } catch {
    return res.status(503).json({ success: false, error: "Authorization unavailable" });
  }

  if (req.method === "GET") {
    const [assignments, candidates] = await Promise.all([
      listCareAssignments(),
      listCareAssignmentCandidates(),
    ]);
    return res.status(200).json({ success: true, data: { assignments, candidates } });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { action, patientId, clinicianId, expiresAt } = req.body as {
    action?: "assign" | "revoke";
    patientId?: string;
    clinicianId?: string;
    expiresAt?: string | null;
  };
  if (
    (action !== "assign" && action !== "revoke") ||
    typeof patientId !== "string" ||
    typeof clinicianId !== "string" ||
    patientId.length === 0 ||
    clinicianId.length === 0
  ) {
    return res.status(400).json({ success: false, error: "Invalid assignment request" });
  }

  const correlationId = crypto.randomUUID();
  try {
    if (action === "assign") {
      const assignment = await assignCareTeamMember({
        patientId,
        clinicianId,
        assignedById: session.sub,
        expiresAt: parseExpiry(expiresAt),
      });
      logEvent("care_assignment_changed", "admin", correlationId, {
        action,
        patientId,
        clinicianId,
        actorId: session.sub,
        assignmentId: assignment.id,
      });
      return res.status(200).json({ success: true, data: assignment });
    }

    const revoked = await revokeCareTeamMember({
      patientId,
      clinicianId,
      revokedById: session.sub,
    });
    if (!revoked) return res.status(404).json({ success: false, error: "Assignment not found" });
    logEvent("care_assignment_changed", "admin", correlationId, {
      action,
      patientId,
      clinicianId,
      actorId: session.sub,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof CareAssignmentError) {
      return res.status(400).json({ success: false, error: error.code });
    }
    return res.status(500).json({ success: false, error: "Assignment operation failed" });
  }
}
