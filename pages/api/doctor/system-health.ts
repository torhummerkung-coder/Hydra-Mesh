import type { NextApiRequest, NextApiResponse } from "next";
import { getSystemHealth, getComponentHealth } from "../../../lib/clinical/system-health";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || (session.role !== "doctor" && session.role !== "staff")) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  return res.status(200).json({ success: true, data: { status: getSystemHealth(), components: getComponentHealth(), scope: "process" } });
}
