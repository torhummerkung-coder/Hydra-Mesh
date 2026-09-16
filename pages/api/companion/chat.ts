import { createHash } from "node:crypto";
import { runDetector } from "../../../lib/security/detector";
import { serializeMessage } from "../../../lib/fallback/message-lock";
import type { NextApiRequest, NextApiResponse } from 'next';
import { generateCompanionReply } from '../../../lib/agents/companion-agent';
import { runOrchestrator } from '../../../lib/security/orchestrator';
import { verifySessionToken, SESSION_COOKIE_NAME } from '../../../lib/session';
import { flagForSecurityReview } from '../../../lib/security/security-review-queue';
import { recordComponentHealth } from '../../../lib/clinical/system-health';
import { logEvent } from '../../../lib/audit/audit-log';
import { getConversationHistory, getReceipt } from '../../../lib/clinical/conversation-store';
import { coordinateResponse } from '../../../lib/fallback/coordinator';
import { withDeadline } from '../../../lib/fallback/deadline';
import { requestEscalation, persistOrQueue } from '../../../lib/fallback/delivery';
import { detectLocalSafety, needsReview } from '../../../lib/fallback/safety';
import { escalationNotice } from '../../../lib/fallback/composer';
import { prisma } from '../../../lib/db';
import { eventKey } from '../../../lib/fallback/outbox';
import { composeFallback } from '../../../lib/fallback/composer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  const token = req.cookies[SESSION_COOKIE_NAME];
  const session = token ? await verifySessionToken(token) : null;
  if (!session || session.role !== 'patient') return res.status(401).json({ success: false, error: 'Unauthorized' });
  const { message, messageId: suppliedId, accountScope } = (req.body ?? {}) as { message?: unknown; messageId?: unknown; accountScope?: unknown };
  if (typeof message !== 'string' || !message.trim() || message.length > 4000 ||
    (suppliedId !== undefined && (typeof suppliedId !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(suppliedId))))
    return res.status(400).json({ success: false, error: 'message หรือ messageId ไม่ถูกต้อง' });
  if (accountScope !== undefined && accountScope !== createHash("sha256").update(`hydra-browser:${session.sub}`).digest("hex")) return res.status(409).json({ success: false, error: "account_changed" });
  const messageId = typeof suppliedId === 'string' ? suppliedId : crypto.randomUUID();
  return serializeMessage(eventKey(session.sub, messageId, "request"), async () => {
  const correlationId = crypto.randomUUID();
  logEvent('message_received', 'orchestrator', correlationId, { length: message.length }, session.sub);
  const local = detectLocalSafety(message);
  // Completed retries return the original response, scoped to verified patient ID.
  const receipt = await withDeadline(getReceipt(session.sub, messageId)).catch(() => null);
  if (receipt) {
    if (receipt.message !== message) return res.status(409).json({ success: false, error: 'message_id_conflict' });
    const metadata = receipt.metadata;
    if (metadata.escalationStatus === 'failed' && metadata.riskLevel) metadata.escalationStatus = await requestEscalation({ kind: 'review', patientId: session.sub, messageId, source: 'chat_risk_engine', reason: 'Retry previously failed escalation', riskLevel: metadata.riskLevel });
    if (metadata.escalationStatus !== 'not_required') {
      try {
        const item = await withDeadline(prisma.reviewQueueItem.findUnique({ where: { id: eventKey(session.sub, messageId, 'review') } }));
        if (item) metadata.escalationStatus = item.acknowledged ? 'acknowledged' : 'queued';
      } catch { /* retain last confirmed status; timestamp is historical */ }
    }
    return res.status(200).json({ success: true, replayed: true, data: { ...metadata, persistenceState: 'saved', statusNotice: escalationNotice(metadata.escalationStatus), messageId, received: true } });
  }

  try {
    const data = await coordinateResponse(message, {
      history: () => withDeadline(getConversationHistory(session.sub, 40)),
      route: async history => {
        // Explicit danger does not wait for a remote semantic model. No unsafe
        // action is allowed here; only reviewed deterministic response + escalation.
        if (needsReview(local)) return { safety: local, restricted: true, securityReview: runDetector(message).threat };
        const result = await runOrchestrator(message, history, correlationId);
        return { safety: result.safety, restricted: result.decision === 'block_soft', securityReview: result.requiresAccountReview };
      },
      escalate: safety => requestEscalation({ kind: 'review', patientId: session.sub, messageId,
        source: 'chat_risk_engine', reason: `Safety signal: ${safety.signal}; status: ${safety.status}`, riskLevel: safety.level ?? 'unknown' }),
      securityReview: () => withDeadline(flagForSecurityReview({ patientId: session.sub, correlationId, riskLevel: 'unknown', threatReasons: ['restricted_input'] })),
      generate: (history, safety, contextMissing) => generateCompanionReply({ history, newMessage: message, routingDecision: 'allow', correlationId, contextMissing }),
      persist: (reply, metadata) => persistOrQueue({ kind: 'turn', patientId: session.sub, messageId, message, reply, metadata }),
      health: recordComponentHealth,
    });
    logEvent('companion_reply', 'orchestrator', correlationId, { mode: data.mode, origin: data.origin, riskStatus: data.riskStatus, escalationStatus: data.escalationStatus, persistenceState: data.persistenceState }, session.sub);
    return res.status(200).json({ success: true, data: { ...data, messageId, received: true }, degraded: data.mode !== 'normal' });
  } catch {
    // Last boundary, still contextual and honest. Never claim persistence or delivery.
    recordComponentHealth('companion', 'unavailable');
    return res.status(200).json({ success: true, degraded: true, data: {
      reply: composeFallback({ message, safety: local, contextState: 'missing' }), messageId,
      received: true, mode: 'safety_degraded', origin: 'safe_composer', riskStatus: 'unknown',
      escalationStatus: 'failed', persistenceState: 'failed', statusNotice: 'ยังยืนยันการบันทึกหรือส่งต่อข้อความนี้ไม่ได้',
      safetyAction: local.signal !== 'none',
    } });
  }
  });
}
