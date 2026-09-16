import type { NextApiRequest, NextApiResponse } from "next";
import { getRecentTraces, logEvent } from "../../../lib/audit/audit-log";
import { buildEventChain } from "../../../lib/audit/event-chain";
import { prisma } from "../../../lib/db";
import { verifySessionToken, SESSION_COOKIE_NAME } from "../../../lib/session";
import {
  getActiveAssignedPatientIds,
  hasActiveCareAssignment,
  hasClinicalCapability,
  hasCurrentClinicalCapability,
} from "../../../lib/auth/clinical-authorization";

// GET /api/doctor/event-trace?correlationId=xxx
//
// ข้อมูลตรงนี้มาจาก in-memory audit log (lib/audit/audit-log.ts) เหมือน
// human-review-queue.ts และ system-health.ts — หายเมื่อ restart server,
// ย้ายไป persistent store ใน Phase 2 เดียวกับของสองไฟล์นั้น
//
// สิทธิ์เข้าถึง (least privilege ตาม pattern เดียวกับ patient-summary.ts):
// - security: เห็นทุก trace ในระบบเหมือนเดิม (ต้องตรวจ attack pattern ข้าม
//   ผู้ป่วยได้ นี่คืองานของทีมนี้)
// - doctor/staff: เห็นเฉพาะ trace ของผู้ป่วยที่ตัวเองมี active CareAssignment
//   เท่านั้น อ้างอิง patientId ที่ผูกไว้กับ event ตั้งแต่ chat.ts (ดู
//   lib/types/event.ts) — trace ที่ไม่ผูก patientId เลย (เช่น sentinel/circuit
//   breaker ระดับระบบ) จะไม่โชว์ให้ doctor/staff เห็นเลย fail-closed เพราะพิสูจน์
//   ความเป็นเจ้าของไม่ได้ ไม่ใช่เพราะเป็นข้อมูลลับกว่า
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, error: "Method not allowed" });

  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });

  const isSecurity = session.role === "security";
  if (!isSecurity && !hasClinicalCapability(session, "patient.read.assigned"))
    return res.status(403).json({ success: false, error: "Forbidden" });

  try {
    if (isSecurity) {
      // JWT เป็น snapshot ตอน login แต่ role ในฐานข้อมูลอาจถูกเปลี่ยนระหว่างอายุ
      // token ยืนยันซ้ำเหมือน endpoint เดิม
      const account = await prisma.user.findUnique({
        where: { id: session.sub },
        select: { role: true },
      });
      if (account?.role !== "security")
        return res.status(403).json({ success: false, error: "Forbidden" });
    } else if (!(await hasCurrentClinicalCapability(session, "patient.read.assigned"))) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
  } catch {
    // ระบบยืนยันสิทธิ์ไม่ได้ต้อง fail closed ห้ามอ่าน trace ต่อ
    return res.status(503).json({ success: false, error: "Authorization unavailable" });
  }

  const { correlationId } = req.query as { correlationId?: string };

  if (correlationId) {
    const chain = buildEventChain(correlationId);
    if (!chain) return res.status(404).json({ success: false, error: "ไม่พบ trace นี้" });

    if (!isSecurity) {
      const assigned = chain.patientId
        ? await hasActiveCareAssignment(session.sub, chain.patientId).catch(() => false)
        : false;
      if (!assigned) {
        logEvent("clinical_access_denied", "clinical-access", correlationId, {
          requestedBy: session.sub,
          role: session.role,
          reason: chain.patientId ? "no_active_assignment" : "trace_not_patient_scoped",
        });
        // ข้อความเดียวกับตอน trace ไม่พบเลย กัน enumerate ว่า correlationId มีจริง
        // แต่เป็นของผู้ป่วยคนอื่น (หลักการเดียวกับ patient-summary.ts)
        return res.status(404).json({ success: false, error: "ไม่พบ trace นี้" });
      }
    }

    return res.status(200).json({ success: true, data: chain });
  }

  if (isSecurity) {
    return res.status(200).json({ success: true, data: getRecentTraces() });
  }

  try {
    const assignedPatientIds = new Set(await getActiveAssignedPatientIds(session.sub));
    const traces = getRecentTraces(200)
      .filter((t) => t.patientId && assignedPatientIds.has(t.patientId))
      .slice(0, 20);
    return res.status(200).json({ success: true, data: traces });
  } catch {
    return res.status(503).json({ success: false, error: "Authorization unavailable" });
  }
}
