import type { NextApiRequest, NextApiResponse } from "next";
import {
  getAssignedPatientDirectory,
  hasClinicalCapability,
  hasCurrentClinicalCapability,
} from "../../../lib/auth/clinical-authorization";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
  if (!hasClinicalCapability(session, "patient.list.assigned"))
    return res.status(403).json({ success: false, error: "Forbidden" });

  try {
    if (!(await hasCurrentClinicalCapability(session, "patient.list.assigned")))
      return res.status(403).json({ success: false, error: "Forbidden" });
    const patients = await getAssignedPatientDirectory(session.sub);
    return res.status(200).json({ success: true, data: patients, source: "assigned_database" });
  } catch {
    return res.status(503).json({ success: false, error: "Authorization unavailable" });
  }
}
