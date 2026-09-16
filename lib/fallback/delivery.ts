import { enqueue, eventKey, type OutboxJob } from './outbox';
import { flagForHumanReview } from '../clinical/human-review-queue';
import { saveTurn } from '../clinical/conversation-store';
import { saveScreeningResponse } from '../clinical/screening-store';
import type { EscalationState } from './composer';
import { withDeadline } from './deadline';
import { recordComponentHealth } from '../clinical/system-health';
export async function deliverJob(job: OutboxJob): Promise<void> {
  if (job.kind === 'review') {
    await flagForHumanReview({ patientId: job.patientId, source: job.source, reason: job.reason, riskLevel: job.riskLevel }, eventKey(job.patientId, job.messageId, 'review'));
  } else if (job.kind === 'turn') {
    await saveTurn(job.patientId, job.message, job.reply, job.messageId, job.metadata);
  } else {
    await saveScreeningResponse(job.patientId, job.response as Parameters<typeof saveScreeningResponse>[1], eventKey(job.patientId, job.messageId, 'screening'));
  }
}
export async function requestEscalation(job: Extract<OutboxJob, {kind: 'review'}>): Promise<EscalationState> {
  try {
    await withDeadline(deliverJob(job));
    return 'queued'; // DB acknowledgement is NOT human acknowledgement.
  } catch {
    try {
      await enqueue(job); recordComponentHealth('outbox', 'healthy'); return 'pending';
    } catch { recordComponentHealth('outbox', 'unavailable'); return 'failed'; }
  }
}
export async function persistOrQueue(job: Exclude<OutboxJob, {kind: 'review'}>): Promise<'saved' | 'pending' | 'failed'> {
  try { await withDeadline(deliverJob(job)); return 'saved'; }
  catch {
    try { await enqueue(job); recordComponentHealth('outbox', 'healthy'); return 'pending'; }
    catch { recordComponentHealth('outbox', 'unavailable'); return 'failed'; }
  }
}
