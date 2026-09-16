// 8Q — แบบประเมินความเสี่ยงฆ่าตัวตาย พัฒนาโดยกรมสุขภาพจิต
//
// verified คำต่อคำจากต้นฉบับ (fetch ตรงจาก https://edu.vru.ac.th/km2/knowledge/03_8Q.pdf
// ซึ่งอ้างอิงกรมสุขภาพจิตเป็นผู้พัฒนา) เมื่อ 2026-08-23 — เวอร์ชันก่อนหน้าของไฟล์นี้ใช้สเกล
// 0-3 ทุกข้อแบบเดียวกับ 9Q ซึ่ง "ไม่ถูกต้อง" 8Q จริงเป็นคำถาม yes/no ที่แต่ละข้อมี
// น้ำหนักคะแนนต่างกัน ไม่ใช่ frequency scale แบบ 9Q
//
// จุดสำคัญ: ข้อ 3 มีคำถามต่อเนื่อง (conditional) ที่ถามเฉพาะเมื่อตอบ "มี" ในข้อ 3
// เท่านั้น ไม่ใช่ถามทุกคน — ต้อง handle เป็น branching logic ไม่ใช่ flat array 8 ช่อง

import type { QuestionnaireItem, QuestionnaireResponse } from "./screening-schema";

export interface EightQAnswers {
  item1: 0 | 1; // คิดอยากตาย หรือคิดว่าตายไปจะดีกว่า (1 เดือนที่ผ่านมา)
  item2: 0 | 1; // อยากทำร้ายตัวเอง หรือทำให้ตัวเองบาดเจ็บ (1 เดือนที่ผ่านมา)
  item3: 0 | 1; // คิดเกี่ยวกับการฆ่าตัวตาย (1 เดือนที่ผ่านมา)
  // ถามเฉพาะเมื่อ item3 === 1 เท่านั้น: ควบคุมความคิดได้ (0) / ควบคุมไม่ได้ (1)
  item3Control?: 0 | 1;
  item4: 0 | 1; // มีแผนการที่จะฆ่าตัวตาย (1 เดือนที่ผ่านมา)
  item5: 0 | 1; // เตรียมการที่จะทำร้ายตนเอง โดยตั้งใจว่าจะให้ตายจริงๆ (1 เดือนที่ผ่านมา)
  item6: 0 | 1; // ทำให้ตนเองบาดเจ็บ แต่ไม่ตั้งใจที่จะทำให้เสียชีวิต (1 เดือนที่ผ่านมา)
  item7: 0 | 1; // พยายามฆ่าตัวตาย โดยคาดหวัง/ตั้งใจที่จะให้ตาย (1 เดือนที่ผ่านมา)
  item8: 0 | 1; // เคยพยายามฆ่าตัวตาย (ตลอดชีวิตที่ผ่านมา — ช่วงเวลาต่างจากข้ออื่น)
}

// ข้อความคำถามฉบับเต็ม verified แล้วทุกข้อ — ใช้แสดงผลใน UI
export const EIGHT_Q_QUESTIONS = {
  item1: { text: "ช่วง 1 เดือนที่ผ่านมา คิดอยากตาย หรือคิดว่าตายไปจะดีกว่า", points: 1 },
  item2: { text: "ช่วง 1 เดือนที่ผ่านมา อยากทำร้ายตัวเอง หรือทำให้ตัวเองบาดเจ็บ", points: 2 },
  item3: { text: "ช่วง 1 เดือนที่ผ่านมา คิดเกี่ยวกับการฆ่าตัวตาย", points: 6 },
  item3Control: {
    text: "ท่านสามารถควบคุมความอยากฆ่าตัวตายที่ท่านคิดอยู่นั้นได้หรือไม่ หรือบอกได้ไหมว่าคงจะไม่ทำตามความคิดนั้นในขณะนี้ (ถามเฉพาะถ้าตอบ 'มี' ในข้อก่อนหน้า)",
    points: 8, // ตอบ "ไม่ได้" (คุมไม่ได้) = 8 คะแนน, "ได้" = 0
  },
  item4: { text: "ช่วง 1 เดือนที่ผ่านมา มีแผนการที่จะฆ่าตัวตาย", points: 8 },
  item5: {
    text: "ช่วง 1 เดือนที่ผ่านมา ได้เตรียมการที่จะทำร้ายตนเอง หรือเตรียมการจะฆ่าตัวตาย โดยตั้งใจว่าจะให้ตายจริงๆ",
    points: 9,
  },
  item6: { text: "ช่วง 1 เดือนที่ผ่านมา ได้ทำให้ตนเองบาดเจ็บ แต่ไม่ตั้งใจที่จะทำให้เสียชีวิต", points: 4 },
  item7: { text: "ช่วง 1 เดือนที่ผ่านมา ได้พยายามฆ่าตัวตาย โดยคาดหวัง/ตั้งใจที่จะให้ตาย", points: 10 },
  item8: { text: "ตลอดชีวิตที่ผ่านมา ท่านเคยพยายามฆ่าตัวตาย", points: 4 },
} as const;

// เกณฑ์นี้ verified แล้วจากต้นฉบับ — เป็น >= ไม่ใช่ >
export const EIGHT_Q_URGENT_REFERRAL_THRESHOLD = 17;

export function scoreEightQ(answers: EightQAnswers): {
  total: number;
  band: string;
  requiresUrgentReferral: boolean;
} {
  let total = 0;
  total += answers.item1 * EIGHT_Q_QUESTIONS.item1.points;
  total += answers.item2 * EIGHT_Q_QUESTIONS.item2.points;
  total += answers.item3 * EIGHT_Q_QUESTIONS.item3.points;

  // คำถามต่อเนื่องนับคะแนนก็ต่อเมื่อ item3 ตอบ "มี" เท่านั้น
  if (answers.item3 === 1 && answers.item3Control === 1) {
    total += EIGHT_Q_QUESTIONS.item3Control.points;
  }

  total += answers.item4 * EIGHT_Q_QUESTIONS.item4.points;
  total += answers.item5 * EIGHT_Q_QUESTIONS.item5.points;
  total += answers.item6 * EIGHT_Q_QUESTIONS.item6.points;
  total += answers.item7 * EIGHT_Q_QUESTIONS.item7.points;
  total += answers.item8 * EIGHT_Q_QUESTIONS.item8.points;

  const band =
    total === 0 ? "ไม่มีแนวโน้มจะฆ่าตัวตายในปัจจุบัน" :
    total <= 8 ? "มีแนวโน้มจะฆ่าตัวตายในปัจจุบันในระดับน้อย" :
    total <= 16 ? "มีแนวโน้มจะฆ่าตัวตายในปัจจุบันในระดับปานกลาง" :
    "มีแนวโน้มจะฆ่าตัวตายในปัจจุบันในระดับรุนแรง";

  return { total, band, requiresUrgentReferral: total >= EIGHT_Q_URGENT_REFERRAL_THRESHOLD };
}

export function buildEightQResponse(subjectId: string, answers: EightQAnswers): QuestionnaireResponse {
  const { total, band } = scoreEightQ(answers);
  const item: QuestionnaireItem[] = [
    { linkId: "8q-1", text: EIGHT_Q_QUESTIONS.item1.text, answerValue: answers.item1 },
    { linkId: "8q-2", text: EIGHT_Q_QUESTIONS.item2.text, answerValue: answers.item2 },
    { linkId: "8q-3", text: EIGHT_Q_QUESTIONS.item3.text, answerValue: answers.item3 },
    ...(answers.item3 === 1
      ? [{ linkId: "8q-3control", text: EIGHT_Q_QUESTIONS.item3Control.text, answerValue: answers.item3Control ?? 0 }]
      : []),
    { linkId: "8q-4", text: EIGHT_Q_QUESTIONS.item4.text, answerValue: answers.item4 },
    { linkId: "8q-5", text: EIGHT_Q_QUESTIONS.item5.text, answerValue: answers.item5 },
    { linkId: "8q-6", text: EIGHT_Q_QUESTIONS.item6.text, answerValue: answers.item6 },
    { linkId: "8q-7", text: EIGHT_Q_QUESTIONS.item7.text, answerValue: answers.item7 },
    { linkId: "8q-8", text: EIGHT_Q_QUESTIONS.item8.text, answerValue: answers.item8 },
  ];
  return {
    resourceType: "QuestionnaireResponse",
    id: crypto.randomUUID(),
    questionnaire: "8Q",
    status: "completed",
    subjectId,
    authored: new Date().toISOString(),
    item,
    totalScore: total,
    severityBand: band,
  };
}
