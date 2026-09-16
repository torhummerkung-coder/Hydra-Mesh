import { detectLocalSafety, needsSafetyAction, type SafetyState } from './safety';
export type EscalationState = 'not_required' | 'pending' | 'queued' | 'acknowledged' | 'failed';
export interface ComposerContext {
  message: string;
  safety?: SafetyState;
  contextState?: 'full' | 'partial' | 'missing';
  recentReplies?: string[];
  restricted?: boolean;
}
// Curated blocks. Clinical review is still required; never label these clinically approved.
export const SAFETY_CONTACTS = 'ติดต่อสายด่วนสุขภาพจิต 1323 ได้ตลอด 24 ชั่วโมง หากมีอันตรายฉุกเฉินให้โทร 1669';
export function composeFallback(ctx: ComposerContext): string {
  const safety = ctx.safety ?? detectLocalSafety(ctx.message);
  if (needsSafetyAction(safety)) {
    const action = safety.level === 'critical'
      ? 'ถ้าคุณกำลังทำร้ายตัวเองหรือได้รับบาดเจ็บ ให้โทร 1669 หรือขอคนใกล้ตัวโทรให้ตอนนี้ และไปอยู่กับคนที่ไว้ใจหากทำได้อย่างปลอดภัย'
      : 'ขอถามเพื่อให้แน่ใจว่าคุณปลอดภัยนะ ตอนนี้คุณกำลังคิดจะทำร้ายตัวเอง หรือมีแผนที่จะทำอยู่ไหม?';
    return ['ข้อความนี้มีส่วนที่ทำให้ฉันเป็นห่วงความปลอดภัยของคุณ', action, SAFETY_CONTACTS].join('\n\n');
  }
  const text = ctx.message.toLowerCase();
  const parts: string[] = [];
  // Only constrained topic labels, never echo arbitrary instructions or harmful detail.
  const topic = /งาน|work/.test(text) ? 'เรื่องงาน' : /ครอบครัว|ที่บ้าน|family/.test(text) ? 'เรื่องที่บ้าน' : /เรียน|สอบ|study|exam/.test(text) ? 'เรื่องเรียน' : '';
  if (topic) parts.push(`คุณพูดถึง${topic} ฉันอยากฟังว่าส่วนไหนสำคัญกับคุณตอนนี้`);
  if (/เหนื่อย|หมดแรง|ไม่ไหว|tired|exhaust/.test(text)) parts.push('ฟังดูว่าตอนนี้คุณเหนื่อยอยู่ ไม่ต้องฝืนเรียบเรียงทุกอย่างให้ครบก็ได้');
  else if (/กลัว|กังวล|เครียด|afraid|worried/.test(text)) parts.push('คุณพูดถึงความรู้สึกที่ไม่สบายใจ ค่อย ๆ เล่าเท่าที่อยากเล่าได้');
  else if (/ดีใจ|มีความสุข|สำเร็จ|happy/.test(text)) parts.push('อยากฟังเรื่องที่ทำให้คุณรู้สึกดีในวันนี้ต่อเลย');
  if (!parts.length) parts.push(ctx.restricted ? 'เราคุยต่อถึงสิ่งที่คุณกำลังเผชิญหรืออยากให้ช่วยได้' : 'ค่อย ๆ เล่าเท่าที่สะดวกได้ ไม่จำเป็นต้องเรียบเรียงให้ครบในครั้งเดียว');
  if (/ไม่อยากคุย|ไม่อยากเล่า|อย่าถาม|don't.*talk/.test(text)) parts.push('พักจากการเล่าก่อนได้ ไม่จำเป็นต้องตอบคำถามเพิ่มตอนนี้');
  else {
    const choices = ['ตอนนี้อยากเล่าต่อ หรืออยากให้ช่วยค่อย ๆ เรียบเรียงสิ่งที่รู้สึก?', 'มีส่วนไหนที่อยากให้ฉันรับฟังเป็นพิเศษไหม?', 'จะเริ่มจากคำสั้น ๆ ที่ตรงกับความรู้สึกตอนนี้ก็ได้'];
    parts.push(choices.find(p => !ctx.recentReplies?.slice(-2).some(r => r.includes(p))) ?? choices[0]);
  }
  if (ctx.contextState === 'missing') parts.push('ตอนนี้ฉันเห็นข้อความล่าสุด แต่เปิดบทสนทนาก่อนหน้าได้ไม่ครบ ถ้ามีจุดสำคัญที่ฉันพลาด บอกสั้น ๆ ได้');
  return parts.join('\n\n');
}
export function escalationNotice(state: EscalationState): string | undefined {
  return ({not_required: undefined, pending: 'บันทึกคำขอส่งต่อไว้เพื่อส่งซ้ำแล้ว แต่ยังไม่ยืนยันว่าเข้าคิวทีมดูแล', queued: 'คำขอเข้าคิวทีมดูแลแล้ว ยังไม่ยืนยันว่ามีเจ้าหน้าที่รับเคส', acknowledged: 'เจ้าหน้าที่รับทราบเคสแล้ว', failed: 'ยังส่งคำขอให้ทีมดูแลไม่สำเร็จ หากต้องการความช่วยเหลือตอนนี้ โปรดติดต่อคนที่ไว้ใจหรือช่องทางช่วยเหลือโดยตรง'})[state];
}
