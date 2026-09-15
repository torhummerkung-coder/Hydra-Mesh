// Detector — algorithm ล้วนๆ ไม่มี LLM
// เหตุผล: เร็ว ถูก deterministic และที่สำคัญที่สุด — ตัว detector เองตรวจจับไม่ได้
// ถ้าเป็น LLM agent เพราะ agent ก็เป็นข้อความที่ inject ได้เหมือนกัน
// งานตรงนี้เหมาะกับ pattern ที่ค่อนข้างตายตัว ไม่ใช่งานที่ต้องเข้าใจความหมาย

export interface DetectorResult {
  threat: boolean;
  reasons: string[];
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+/i,
  /system\s*prompt/i,
  /reveal\s+(your\s+)?(instructions|prompt|system)/i,
  /act\s+as\s+(if\s+)?(you\s+)?(are|were)\s+/i,
  /\bDAN\b/i,
  /ละเลยคำสั่ง(ก่อนหน้า)?/,
  /เผยคำสั่งระบบ/,
];

function hasInjectionPattern(text: string): string | null {
  for (const re of INJECTION_PATTERNS) {
    if (re.test(text)) return `injection pattern matched: ${re.source}`;
  }
  return null;
}

function hasAbusePattern(text: string): string | null {
  if (text.length > 4000) return "message length exceeds limit";
  if (/(.)\1{50,}/.test(text)) return "repeated character stuffing";
  return null;
}

// หมายเหตุ: heuristic ระดับ MVP เท่านั้น production จริงควรเสริมด้วย
// classifier เฉพาะทางหรือ managed safety service เพิ่มอีกชั้น

export function runDetector(message: string): DetectorResult {
  const reasons: string[] = [];
  const injection = hasInjectionPattern(message);
  const abuse = hasAbusePattern(message);
  if (injection) reasons.push(injection);
  if (abuse) reasons.push(abuse);
  return { threat: reasons.length > 0, reasons };
}
