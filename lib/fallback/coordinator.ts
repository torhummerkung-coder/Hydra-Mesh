import type { ConversationMessage } from '../security/risk-engine';
import { detectLocalSafety, detectContextSafety, needsReview, needsSafetyAction, type SafetyState } from './safety';
import { composeFallback, escalationNotice, type EscalationState } from './composer';
export interface MeshResponse {
  reply: string;
  mode: 'normal' | 'degraded' | 'safety_degraded';
  origin: 'primary' | 'secondary' | 'safe_composer';
  contextQuality: 'full' | 'message_only';
  riskStatus: SafetyState['status'];
  riskLevel?: SafetyState['level'];
  escalationStatus: EscalationState;
  persistenceState: 'saved' | 'pending' | 'failed';
  statusNotice?: string;
  safetyAction: boolean;
}
export interface MeshDependencies {
  history(): Promise<ConversationMessage[]>;
  route(history: ConversationMessage[]): Promise<{ safety: SafetyState; restricted: boolean; securityReview: boolean }>;
  escalate(safety: SafetyState): Promise<EscalationState>;
  securityReview(): Promise<unknown>;
  generate(history: ConversationMessage[], safety: SafetyState, contextMissing: boolean): Promise<{ reply: string; audited: boolean; origin?: 'primary' | 'secondary' }>;
  persist(reply: string, metadata: Omit<MeshResponse, 'persistenceState' | 'statusNotice'>): Promise<'saved' | 'pending' | 'failed'>;
  health(component: string, state: 'healthy' | 'degraded' | 'unavailable' | 'safety_degraded'): void;
}
export async function coordinateResponse(message: string, deps: MeshDependencies): Promise<MeshResponse> {
  // Runs synchronously before history access; retained even when routing fails.
  let safety = detectLocalSafety(message);
  let history: ConversationMessage[] = [];
  let missing = false;
  const health: MeshDependencies['health'] = (c, s) => { try { deps.health(c, s); } catch { /* observation must not block */ } };
  try { history = await deps.history(); health('history', 'healthy'); }
  catch { missing = true; health('history', 'unavailable'); }
  safety = detectContextSafety(message, history);
  let restricted = false;
  try {
    const result = await deps.route(history);
    safety = result.safety;
    restricted = result.restricted;
    if (result.securityReview) { try { await deps.securityReview(); } catch { health('security_queue', 'degraded'); } }
  } catch { restricted = true; health('risk', 'safety_degraded'); }
  health('risk', safety.status === 'assessed' ? 'healthy' : 'safety_degraded');
  let escalation: EscalationState = 'not_required';
  if (needsReview(safety)) {
    try { escalation = await deps.escalate(safety); } catch { escalation = 'failed'; }
    health('review_queue', escalation === 'queued' || escalation === 'acknowledged' ? 'healthy' : 'safety_degraded');
  }
  let reply = '';
  let origin: MeshResponse['origin'] = 'safe_composer';
  // Unknown safety or security restrictions never release unconstrained LLM output.
  if (!restricted && safety.status === 'assessed' && !needsSafetyAction(safety)) {
    try {
      const result = await deps.generate(history, safety, missing);
      if (!result.audited || !result.reply.trim()) throw new Error('unverified_output');
      reply = result.reply; origin = result.origin ?? 'primary'; health('companion', origin === 'secondary' ? 'degraded' : 'healthy');
    } catch { health('companion', 'degraded'); }
  }
  if (!reply) reply = composeFallback({ message, safety, restricted, contextState: missing ? 'missing' : 'full', recentReplies: history.filter(m => m.role === 'assistant').map(m => m.content) });
  const metadata: Omit<MeshResponse, 'persistenceState' | 'statusNotice'> = {
    reply, origin, mode: safety.status !== 'assessed' || escalation === 'failed' || escalation === 'pending' ? 'safety_degraded' : missing || origin !== 'primary' ? 'degraded' : 'normal',
    contextQuality: missing ? 'message_only' : 'full', riskStatus: safety.status,
    riskLevel: safety.level, escalationStatus: escalation, safetyAction: needsSafetyAction(safety),
  };
  let persistenceState: MeshResponse['persistenceState'] = 'saved';
  try { persistenceState = await deps.persist(reply, metadata); health('persistence', persistenceState === 'saved' ? 'healthy' : 'unavailable'); }
  catch { persistenceState = 'failed'; health('persistence', 'unavailable'); }
  const notices = [escalationNotice(escalation), persistenceState === 'failed' ? 'ตอบกลับแล้ว แต่ยังบันทึกบทสนทนารอบนี้ไม่สำเร็จ' : persistenceState === 'pending' ? 'เก็บบทสนทนารอบนี้ไว้เพื่อบันทึกซ้ำแล้ว' : undefined];
  return { ...metadata, mode: metadata.mode === 'normal' && persistenceState !== 'saved' ? 'degraded' : metadata.mode, persistenceState, statusNotice: notices.filter(Boolean).join(' · ') || undefined };
}
