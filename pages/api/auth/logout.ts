import type { NextApiRequest, NextApiResponse } from "next";
import { SESSION_COOKIE_NAME } from "../../../lib/session";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
  return res.status(200).json({ success: true });
}
