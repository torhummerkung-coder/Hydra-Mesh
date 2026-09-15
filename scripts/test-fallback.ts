import { getFallbackReply } from "../lib/agents/fallback-reply";

// ทดสอบว่า fallback ทำงานได้โดยไม่ต้องพึ่ง network/API key ใดๆ เลย
// รันได้แม้ตัด internet ก็ต้องผ่าน — นี่คือสิ่งที่ยืนยัน invariant "ไม่เคยเงียบ"
// สังเกตว่าไฟล์นี้ไม่มี await เลยสักบรรทัด นั่นคือหลักฐานว่าไม่มี network call แอบซ่อนอยู่

function main() {
  const reply = getFallbackReply();

  const isNonEmptyString = typeof reply === "string" && reply.length > 0;
  console.log(`[${isNonEmptyString ? "PASS" : "FAIL"}] getFallbackReply() returns non-empty string`);

  const hasHotline = reply.includes("1323");
  console.log(`[${hasHotline ? "PASS" : "FAIL"}] fallback message includes crisis hotline (1323)`);

  console.log(`\nSample output: "${reply}"`);
}

main();
