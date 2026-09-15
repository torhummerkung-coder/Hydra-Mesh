import type { NextApiRequest, NextApiResponse } from "next";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

// TODO: แทนที่ด้วย query จริงจาก Clinical Data Store เมื่อมี database ต่อแล้ว
// mock data นี้มีไว้ให้ dashboard demo ได้ก่อนต่อฐานข้อมูลจริง
const MOCK_PATIENTS = [
  { id: "pt_001", name: "ผู้ป่วย A", riskLevel: "low", lastActive: "10 นาทีที่แล้ว" },
  { id: "pt_002", name: "ผู้ป่วย B", riskLevel: "moderate", lastActive: "1 ชม.ที่แล้ว" },
  { id: "pt_003", name: "ผู้ป่วย C", riskLevel: "high", lastActive: "3 ชม.ที่แล้ว" },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || (session.role !== "doctor" && session.role !== "staff")) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  return res.status(200).json({ success: true, data: MOCK_PATIENTS });
}
