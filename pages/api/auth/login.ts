import type { NextApiRequest, NextApiResponse } from "next";
import { verifyCredentials } from "../../../lib/auth/credential-login";
import { createSessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

const VALID_ROLES = ["patient", "doctor", "admin", "staff", "security"] as const;
type ValidRole = (typeof VALID_ROLES)[number];
function isValidRole(role: string): role is ValidRole {
  return (VALID_ROLES as readonly string[]).includes(role);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || typeof username !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({ success: false, error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
  }

  const result = await verifyCredentials(username, password);
  // ข้อความ error เดียวกันไม่ว่าจะเป็นเพราะ username ไม่มีอยู่จริง หรือ password ผิด
  // — บอกแยกกันเปิดช่องให้เดา username ที่มีอยู่จริงในระบบได้ (user enumeration)
  if (!result || !isValidRole(result.role)) {
    return res.status(401).json({ success: false, error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = await createSessionToken({ sub: result.userId, role: result.role });
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`
  );
  return res.status(200).json({ success: true, data: { role: result.role } });
}
