// ทดสอบ "การห่อกุญแจ" (envelope encryption) จริงด้วย hydra-crypto.ts เดิม —
// ไม่แตะ Prisma/DB เลย เพราะ hydraEncrypt/hydraDecrypt เป็น pure crypto function
// (ใช้ Web Crypto API ของ Node โดยตรง) ทดสอบได้ทันทีโดยไม่ต้อง npm install เพิ่ม
//
// สิ่งที่ยังทดสอบตรงนี้ไม่ได้ (ต้องมี DB จริง): getOrCreatePatientKey() เพราะมัน
// เรียก prisma.patientDataKey — ต้องรอ npm install + npm run db:migrate ก่อน

import { hydraEncrypt, hydraDecrypt } from "../lib/hydra-crypto";

function randomSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes).toString("base64");
}

async function testWrapUnwrapRoundtrip() {
  console.log("=== Envelope: ห่อ (wrap) แล้วแกะ (unwrap) กุญแจของผู้ป่วย ===");

  const masterKey = "test-master-key-จำลอง-env-var";
  const patientDek = randomSecret(); // จำลอง DEK ที่สุ่มขึ้นมาให้ผู้ป่วย 1 คน

  // "ห่อ" DEK ด้วย master key (เหมือนที่จะเก็บ wrappedKeyJson ลง DB จริง)
  const wrapped = await hydraEncrypt(patientDek, masterKey, 2);
  const wrappedJson = JSON.stringify(wrapped.shards);

  // "แกะ" กลับด้วย master key เดียวกัน
  const shards = JSON.parse(wrappedJson);
  const { plaintext: unwrapped } = await hydraDecrypt(shards, masterKey);

  console.log(`[${unwrapped === patientDek ? "PASS" : "FAIL"}] unwrap ได้ DEK เดิมเป๊ะหลังห่อแล้วแกะ`);
}

async function testWrongMasterKeyFails() {
  console.log("\n=== Envelope: master key ผิด ต้อง unwrap ไม่ได้ ===");

  const correctKey = "correct-master-key";
  const wrongKey = "wrong-master-key";
  const patientDek = randomSecret();

  const wrapped = await hydraEncrypt(patientDek, correctKey, 2);

  let failedAsExpected = false;
  try {
    await hydraDecrypt(wrapped.shards, wrongKey);
  } catch {
    failedAsExpected = true;
  }
  console.log(`[${failedAsExpected ? "PASS" : "FAIL"}] unwrap ด้วย master key ผิด ต้อง throw ไม่ใช่คืนค่าผิดเงียบๆ`);
}

async function testTwoPatientsIndependentKeys() {
  console.log("\n=== Envelope: DEK ของผู้ป่วย 2 คนต้องเป็นอิสระต่อกัน ===");

  const masterKey = "shared-master-key";
  const dekPatientA = randomSecret();
  const dekPatientB = randomSecret();

  console.log(
    `[${dekPatientA !== dekPatientB ? "PASS" : "FAIL"}] DEK ของสองคนไม่ซ้ำกัน (สุ่มอิสระจริง ไม่ได้ derive จากสูตรเดียว)`
  );

  const wrappedA = await hydraEncrypt(dekPatientA, masterKey, 2);
  const wrappedB = await hydraEncrypt(dekPatientB, masterKey, 2);

  // เอา shard ของ B ไปปนกับ A แล้วลอง unwrap — ต้อง fail เพราะ AAD ผูก sessionId ไว้
  let crossContaminationBlocked = false;
  try {
    await hydraDecrypt([wrappedA.shards[0], wrappedB.shards[1]], masterKey);
  } catch {
    crossContaminationBlocked = true;
  }
  console.log(
    `[${crossContaminationBlocked ? "PASS" : "FAIL"}] เอา shard ของคนละคนมาผสมกัน unwrap ต้อง fail ไม่ใช่ได้ค่าผิดเงียบๆ`
  );
}

async function testFullEnvelopeFlow() {
  console.log("\n=== Envelope: จำลอง flow เต็ม (wrap DEK → ใช้ DEK เข้ารหัสบทสนทนา → ถอดกลับ) ===");

  const masterKey = "env-master-key-จำลอง";
  const dek = randomSecret();
  const wrappedDek = await hydraEncrypt(dek, masterKey, 2); // สิ่งที่จะเก็บใน PatientDataKey.wrappedKeyJson

  const conversationText = "วันนี้รู้สึกเหนื่อยมาก อยากคุยด้วย";
  const encryptedConversation = await hydraEncrypt(conversationText, dek, 3); // ใช้ DEK ไม่ใช่ master key

  // จำลองตอนอ่านกลับ: unwrap DEK ก่อน แล้วค่อยใช้ DEK ถอดบทสนทนา
  const { plaintext: recoveredDek } = await hydraDecrypt(wrappedDek.shards, masterKey);
  const { plaintext: recoveredConversation } = await hydraDecrypt(
    encryptedConversation.shards,
    recoveredDek
  );

  console.log(
    `[${
      recoveredConversation === conversationText ? "PASS" : "FAIL"
    }] flow เต็ม: unwrap DEK แล้วใช้ถอดบทสนทนากลับมาได้ข้อความเดิมเป๊ะ`
  );
}

async function main() {
  await testWrapUnwrapRoundtrip();
  await testWrongMasterKeyFails();
  await testTwoPatientsIndependentKeys();
  await testFullEnvelopeFlow();
  console.log(
    "\nหมายเหตุ: getOrCreatePatientKey()/encryptForPatient()/decryptForPatient() ใน " +
      "lib/patient-encryption.ts ยังทดสอบที่นี่ไม่ได้เพราะต้องมี DB จริง — ทดสอบผ่าน " +
      "npm run test:db ได้หลัง npm install + npm run db:migrate"
  );
}

main();
