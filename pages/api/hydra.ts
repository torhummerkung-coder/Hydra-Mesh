import type { NextApiRequest, NextApiResponse } from "next";
import { hydraEncrypt, hydraDecrypt, HydraShard } from "../../lib/hydra-crypto";

const rateMap = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const r = rateMap.get(ip);
  if (!r || now > r.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (r.count >= 30) return false;
  r.count++;
  return true;
}
// หมายเหตุ: in-memory rate limit ใช้ได้กับ single instance เท่านั้น
// พอ scale เกิน 1 instance ต้องย้ายไป Redis

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "unknown";

  if (!rateLimit(ip))
    return res.status(429).json({ success: false, error: "Too many requests" });

  const { action, plaintext, shards, password, numShards } = req.body;

  if (!action || !["encrypt", "decrypt"].includes(action))
    return res.status(400).json({ success: false, error: "action ต้องเป็น encrypt หรือ decrypt" });

  if (!password || typeof password !== "string")
    return res.status(400).json({ success: false, error: "password is required" });

  try {
    if (action === "encrypt") {
      if (!plaintext || typeof plaintext !== "string" || plaintext.length > 100_000)
        return res.status(400).json({ success: false, error: "plaintext ไม่ถูกต้อง" });

      const n = Math.min(Math.max(Number(numShards) || 3, 2), 10);
      const result = await hydraEncrypt(plaintext, password, n);
      return res.status(200).json({ success: true, data: result });
    }

    if (action === "decrypt") {
      if (!Array.isArray(shards) || !shards.length)
        return res.status(400).json({ success: false, error: "shards is required" });

      const result = await hydraDecrypt(shards as HydraShard[], password);
      return res.status(200).json({ success: true, data: result });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isIntegrity = msg.includes("integrity");
    return res.status(400).json({
      success: false,
      error: isIntegrity ? "Integrity check failed" : "Operation failed",
      ...(process.env.NODE_ENV === "development" ? { detail: msg } : {}),
    });
  }
}
