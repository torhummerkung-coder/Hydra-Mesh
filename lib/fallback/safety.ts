import type { RiskAssessment } from '../security/risk-engine';

export type RiskLevel = RiskAssessment['risk_level'];
export interface SafetyState {
  status: 'assessed' | 'fallback_assessed' | 'unknown';
  level?: RiskLevel;
  signal: 'none' | 'ambiguous' | 'explicit' | 'imminent';
}
// Conservative signal detector, NOT a diagnostic model. No match never means safe.
export function detectLocalSafety(message: string): SafetyState {
  const text = message.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase();
  const explicit = /ฆ่าตัวตาย|ทำร้ายตัวเอง|ทำร้ายตนเอง|อยากตาย|ไม่อยากอยู่แล้ว|ไม่อยากมีชีวิต|จบชีวิต|suicid|kill myself|hurt myself|end my life/.test(text);
  const imminent = /กินยาเกินขนาด|กินยาไปหมด|เลือดไหลไม่หยุด|overdos/.test(text) ||
    (explicit && /ตอนนี้|คืนนี้|มีแผน|เตรียม|กำลังจะ|right now|tonight|have a plan/.test(text));
  if (imminent) return { status: 'fallback_assessed', level: 'critical', signal: 'imminent' };
  if (explicit) return { status: 'fallback_assessed', level: 'high', signal: 'explicit' };
  if (/อยากหายไป|ไม่ไหวแล้ว|ไม่ปลอดภัย|ลาก่อน|เป็นภาระ|goodbye|disappear|can't go on/.test(text))
    return { status: 'unknown', signal: 'ambiguous' };
  return { status: 'unknown', signal: 'none' };
}
export function mergeSafety(local: SafetyState, assessment?: RiskAssessment): SafetyState {
  if (!assessment) return local;
  const levels: RiskLevel[] = ['none', 'low', 'moderate', 'high', 'critical'];
  if (local.level && levels.indexOf(local.level) > levels.indexOf(assessment.risk_level)) return local;
  return { status: 'assessed', level: assessment.risk_level, signal: local.signal };
}
export function needsReview(safety: SafetyState): boolean {
  return !!safety.level && ['moderate', 'high', 'critical'].includes(safety.level);
}
export function needsSafetyAction(safety: SafetyState): boolean {
  return needsReview(safety) || safety.signal !== 'none';
}

export function detectContextSafety(message: string, history: {role: string; content: string}[]): SafetyState {
  const current = detectLocalSafety(message);
  if (current.signal !== 'none') return current;
  // Recent explicit danger remains a floor during a provider outage. This is
  // deliberately conservative; a local regex cannot establish crisis resolution.
  for (const prior of history.filter(m => m.role === 'user').slice(-3).reverse()) {
    const state = detectLocalSafety(prior.content);
    if (state.signal === 'explicit' || state.signal === 'imminent') return state;
  }
  return current;
}
