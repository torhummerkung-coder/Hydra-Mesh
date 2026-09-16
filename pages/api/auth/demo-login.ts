import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/db";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

// Demo-only login — ไม่เช็ค password หรือ identity ใดๆ ทั้งสิ้น มีไว้ให้ทดสอบ
// pipeline ทั้งระบบได้จริงระหว่างพัฒนา ก่อนมี login flow จริง (roadmap Phase 1)
//
// เปิดใช้ได้เฉพาะเมื่อตั้ง DEMO_AUTH_ENABLED=true ใน env เท่านั้น — ป้องกันไม่ให้
// เผลอ deploy ระบบที่ใครก็ log in เป็นใครก็ได้ขึ้น production โดยไม่ตั้งใจ
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.DEMO_AUTH_ENABLED !== "true") {
    return res.status(404).json({ success: false, error: "Not found" });
  }
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { role } = req.body as { role?: string };
  if (role !== "patient" && role !== "doctor") {
    return res.status(400).json({ success: false, error: "role ต้องเป็น patient หรือ doctor" });
  }

  // ใช้บัญชี fixture จริงจาก seed แทน subject ปลอม เพื่อให้ CareAssignment และ
  // patient-scoped authorization ทำงานเหมือน credential login ทุกจุด
  const username = role === "patient" ? "patient1" : "doctor1";
  const demoUser = await prisma.user.findUnique({ where: { username } });
  if (!demoUser || demoUser.role !== role) {
    return res.status(503).json({
      success: false,
      error: "ยังไม่มีบัญชี Demo กรุณารัน npm run db:seed ก่อน",
    });
  }

  const token = await createSessionToken({ sub: demoUser.id, role });
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
  );
  return res.status(200).json({ success: true, data: { role } });
}
