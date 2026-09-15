import type { NextApiRequest, NextApiResponse } from "next";
import { getConversationHistory } from "../../../lib/clinical/conversation-store";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";

// ให้ผู้ป่วยโหลดบทสนทนาของ "ตัวเอง" กลับมาแสดงตอนเปิดหน้าแชท (แก้ปัญหาเดิม:
// ประวัติอยู่แค่ React state ฝั่ง client เท่านั้น หาย refresh หน้าเว็บทีเดียว) —
// ไม่ใช่ trust-boundary ใหม่เหมือนฝั่งแพทย์ เพราะ session.sub มาจาก JWT ที่ verify
// แล้วเท่านั้น ผู้ป่วยเปิดดูได้แค่ของตัวเอง ไม่รับ patientId จาก client เด็ดขาด

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.role !== "patient") {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  try {
    const history = await getConversationHistory(session.sub, 100);
    return res.status(200).json({
      success: true,
      data: { messages: history.map(({ role, content }) => ({ role, content })) },
    });
  } catch (err) {
    // โหลดประวัติเก่าไม่สำเร็จ ไม่ควรบล็อกไม่ให้ผู้ป่วยเปิดหน้าแชทได้ — คืน list
    // ว่างแทน (เริ่มคุยใหม่ได้เสมอ) ไม่ใช่ error ที่ทำให้หน้าเว็บพัง
    console.error("[companion/history] load failed:", err);
    return res.status(200).json({ success: true, data: { messages: [] } });
  }
}
