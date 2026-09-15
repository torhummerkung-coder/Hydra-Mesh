import type { NextApiRequest, NextApiResponse } from "next";
import { getReviewQueue, acknowledgeReviewItem } from "../../../lib/clinical/human-review-queue";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || (session.role !== "doctor" && session.role !== "staff")) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  if (req.method === "GET") {
    return res.status(200).json({ success: true, data: await getReviewQueue() });
  }

  if (req.method === "POST") {
    const { id } = req.body as { id?: string };
    if (!id) return res.status(400).json({ success: false, error: "id is required" });
    const ok = await acknowledgeReviewItem(id);
    return res.status(ok ? 200 : 404).json({ success: ok });
  }

  return res.status(405).json({ success: false, error: "Method not allowed" });
}
