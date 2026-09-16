import type { NextApiRequest, NextApiResponse } from "next";
import { logEvent } from "../../../lib/audit/audit-log";
import {
  getActiveAssignedPatientIds,
  hasClinicalCapability,
  hasCurrentClinicalCapability,
} from "../../../lib/auth/clinical-authorization";
import {
  acknowledgeAssignedReviewItem,
  getReviewQueue,
} from "../../../lib/clinical/human-review-queue";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });

  if (req.method === "GET") {
    if (!hasClinicalCapability(session, "review.list.assigned"))
      return res.status(403).json({ success: false, error: "Forbidden" });
    try {
      if (!(await hasCurrentClinicalCapability(session, "review.list.assigned")))
        return res.status(403).json({ success: false, error: "Forbidden" });
      const patientIds = await getActiveAssignedPatientIds(session.sub);
      return res.status(200).json({ success: true, data: await getReviewQueue(patientIds) });
    } catch {
      return res.status(503).json({ success: false, error: "Authorization unavailable" });
    }
  }

  if (req.method === "POST") {
    if (!hasClinicalCapability(session, "review.acknowledge.assigned"))
      return res.status(403).json({ success: false, error: "Forbidden" });
    const { id } = req.body as { id?: string };
    if (!id) return res.status(400).json({ success: false, error: "id is required" });
    try {
      if (!(await hasCurrentClinicalCapability(session, "review.acknowledge.assigned")))
        return res.status(403).json({ success: false, error: "Forbidden" });
      const result = await acknowledgeAssignedReviewItem(id, session.sub);
      if (result.status === "not_found") {
        return res.status(404).json({ success: false, error: "Review item not found" });
      }
      if (result.status === "acknowledged") {
        logEvent("human_review_acknowledged", "human-review", crypto.randomUUID(), {
          reviewId: result.item.id,
          patientId: result.item.patientId,
          acknowledgedBy: session.sub,
        });
      }
      return res.status(200).json({ success: true, data: result.item });
    } catch {
      return res.status(503).json({ success: false, error: "Authorization unavailable" });
    }
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
