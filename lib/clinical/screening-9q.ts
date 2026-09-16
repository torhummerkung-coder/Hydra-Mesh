// 9Q — แบบประเมินโรคซึมเศร้า 9 คำถาม (เทียบเท่า PHQ-9 สากล)
// verified คำต่อคำจากต้นฉบับ (im.rmutt.ac.th ซึ่งใช้ข้อความ/option/band ตรงกับ
// กรมสุขภาพจิต) เมื่อ 2026-09-14 — ทุกข้อ ทุก option ทุก band ตรงเป๊ะ

import type { QuestionnaireItem, QuestionnaireResponse } from "./screening-schema";

export const NINE_Q_QUESTIONS: { linkId: string; text: string }[] = [
  { linkId: "9q-1", text: "เบื่อ ไม่สนใจทำอะไร" },
  { linkId: "9q-2", text: "รู้สึกหดหู่ ซึมเศร้า หรือท้อแท้" },
  { linkId: "9q-3", text: "นอนไม่หลับหรือนอนมากเกินไป" },
  { linkId: "9q-4", text: "เหนื่อยง่าย หรือมีพลังน้อย" },
  { linkId: "9q-5", text: "เบื่ออาหาร หรือกินมากเกินไป" },
  { linkId: "9q-6", text: "รู้สึกไม่ดีกับตนเอง หรือคิดว่าตนเองล้มเหลว" },
  { linkId: "9q-7", text: "สมาธิไม่ดี เวลาอ่านหนังสือ ดูทีวี หรือทำงาน" },
  { linkId: "9q-8", text: "พูดช้า/ทำอะไรช้าลงจนคนอื่นสังเกต หรือกระสับกระส่ายอยู่นิ่งไม่ได้" },
  // ข้อ 9 ผูกกับความเสี่ยงทำร้ายตนเองโดยตรง — ใช้เป็น flag พิเศษใน scoreNineQ ด้านล่าง
  { linkId: "9q-9", text: "คิดทำร้ายตนเอง หรือคิดว่าถ้าตายไปคงจะดีกว่า" },
];

export const NINE_Q_OPTIONS = [
  { value: 0, label: "ไม่เลย" },
  { value: 1, label: "เป็นบางวัน (น้อยกว่า 7 วัน)" },
  { value: 2, label: "บ่อยกว่าครึ่งหนึ่งของสัปดาห์ (7-12 วัน)" },
  { value: 3, label: "แทบทุกวัน (13-14 วัน)" },
] as const;

// เกณฑ์จากกรมสุขภาพจิต: คะแนน 9Q >= 7 ต้องประเมินต่อด้วย 8Q
export const NINE_Q_REQUIRES_8Q_THRESHOLD = 7;

// v2: เกณฑ์ที่สอง — คะแนน 9Q >= 13 ให้พิจารณาส่งพบจิตแพทย์เพื่อรับการตรวจ
// วินิจฉัยเพิ่มเติม (verified จาก 2 แหล่งอิสระ: dsdw.go.th, vjlh.go.th ตรงกัน)
// คนละเกณฑ์กับ requires8Q ด้านบน — อันนี้เกี่ยวกับความรุนแรงของอาการซึมเศร้า
// โดยรวม ไม่ใช่ความเสี่ยงทำร้ายตนเองโดยตรง (นั่นเป็นหน้าที่ของ 8Q/item9Flag)
// เพิ่งพบระหว่างตรวจสอบรอบนี้ — ก่อนหน้านี้ไม่มีใน scoreNineQ() เลย
export const NINE_Q_PSYCHIATRIST_REFERRAL_THRESHOLD = 13;

export function scoreNineQ(answers: number[]): {
  total: number;
  band: string;
  item9Flag: boolean;
  requiresPsychiatristReferral: boolean;
} {
  if (answers.length !== 9) throw new Error("9Q ต้องตอบครบ 9 ข้อ");
  if (answers.some((a) => a < 0 || a > 3)) throw new Error("แต่ละข้อต้องมีค่า 0-3");

  const total = answers.reduce((sum, v) => sum + v, 0);
  const band =
    total <= 4 ? "ไม่มีภาวะซึมเศร้า หรือมีน้อยมาก" :
    total <= 9 ? "ภาวะซึมเศร้าเล็กน้อย" :
    total <= 14 ? "ภาวะซึมเศร้าปานกลาง" :
    total <= 19 ? "ภาวะซึมเศร้าปานกลางค่อนข้างรุนแรง" :
    "ภาวะซึมเศร้ารุนแรง";

  // ข้อ 9 (ดัชนี 8) ตอบ >= 1 = มีสัญญาณความคิดทำร้ายตนเองแม้เพียงเล็กน้อย
  const item9Flag = answers[8] >= 1;

  return {
    total,
    band,
    item9Flag,
    requiresPsychiatristReferral: total >= NINE_Q_PSYCHIATRIST_REFERRAL_THRESHOLD,
  };
}

export function buildNineQResponse(subjectId: string, answers: number[]): QuestionnaireResponse {
  const { total, band } = scoreNineQ(answers);
  const item: QuestionnaireItem[] = NINE_Q_QUESTIONS.map((q, i) => ({
    linkId: q.linkId,
    text: q.text,
    answerValue: answers[i],
  }));
  return {
    resourceType: "QuestionnaireResponse",
    id: crypto.randomUUID(),
    questionnaire: "9Q",
    status: "completed",
    subjectId,
    authored: new Date().toISOString(),
    item,
    totalScore: total,
    severityBand: band,
  };
}
