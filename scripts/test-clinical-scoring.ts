import { scoreNineQ } from "../lib/clinical/screening-9q";
import { scoreEightQ, type EightQAnswers } from "../lib/clinical/screening-8q";

function main() {
  console.log("=== 9Q scoring ===");
  const nineQCases: { answers: number[]; expectTotal: number; expectItem9: boolean }[] = [
    { answers: [0, 0, 0, 0, 0, 0, 0, 0, 0], expectTotal: 0, expectItem9: false },
    { answers: [1, 1, 1, 1, 1, 1, 1, 1, 1], expectTotal: 9, expectItem9: true },
    { answers: [3, 3, 3, 3, 3, 3, 3, 3, 0], expectTotal: 24, expectItem9: false },
  ];
  for (const c of nineQCases) {
    const r = scoreNineQ(c.answers);
    const pass = r.total === c.expectTotal && r.item9Flag === c.expectItem9;
    console.log(
      `[${pass ? "PASS" : "FAIL"}] answers=${JSON.stringify(c.answers)} → total=${r.total}, item9Flag=${r.item9Flag}`
    );
  }

  console.log("\n=== 8Q scoring (weighted, verified against official source 2026-08-24) ===");
  const eightQCases: { name: string; answers: EightQAnswers; expectTotal: number; expectUrgent: boolean }[] = [
    {
      name: "ไม่มีความเสี่ยงเลย",
      answers: { item1: 0, item2: 0, item3: 0, item4: 0, item5: 0, item6: 0, item7: 0, item8: 0 },
      expectTotal: 0,
      expectUrgent: false,
    },
    {
      name: "total = 16 พอดี — ยังไม่ถึงเกณฑ์ urgent (แค่ระดับปานกลาง)",
      answers: { item1: 1, item2: 1, item3: 0, item4: 0, item5: 1, item6: 1, item7: 0, item8: 0 },
      // 1*1 + 1*2 + 1*9 + 1*4 = 1+2+9+4 = 16
      expectTotal: 16,
      expectUrgent: false,
    },
    {
      name: "total = 17 พอดี — ต้อง trigger urgent (เคสสำคัญที่สุด: >=17 ไม่ใช่ >17)",
      answers: { item1: 1, item2: 1, item3: 1, item3Control: 1, item4: 0, item5: 0, item6: 0, item7: 0, item8: 0 },
      // 1*1 + 1*2 + 1*6 + 1*8(control) = 1+2+6+8 = 17
      expectTotal: 17,
      expectUrgent: true,
    },
    {
      name: "item3=1 แต่ควบคุมได้ (item3Control=0) — ไม่บวกคะแนน control เพิ่ม",
      answers: { item1: 0, item2: 0, item3: 1, item3Control: 0, item4: 0, item5: 0, item6: 0, item7: 0, item8: 0 },
      expectTotal: 6, // แค่ item3 เอง ไม่รวม control 8 แต้ม
      expectUrgent: false,
    },
  ];

  for (const c of eightQCases) {
    const r = scoreEightQ(c.answers);
    const pass = r.total === c.expectTotal && r.requiresUrgentReferral === c.expectUrgent;
    console.log(
      `[${pass ? "PASS" : "FAIL"}] ${c.name} → total=${r.total} (expect ${c.expectTotal}), urgent=${r.requiresUrgentReferral} (expect ${c.expectUrgent})`
    );
  }
}

main();
