import assert from "node:assert/strict";

process.env.GEMINI_API_KEY = "contract-test-key";
process.env.GEMINI_MODEL = "gemini-3.8-flash";

async function main() {
  const { generateClinicalSummary } = await import("../lib/agents/clinical-summary-agent");
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedHeaders: HeadersInit | undefined;
  let capturedBody: any;

  try {
    globalThis.fetch = async (url, init) => {
      capturedUrl = String(url);
      capturedHeaders = init?.headers;
      capturedBody = JSON.parse(String(init?.body));
      return Response.json({
        candidates: [{ finishReason: "STOP", content: { parts: [{ text: "สรุปส่วนที่หนึ่ง " }, { text: "และส่วนที่สอง" }] } }],
      });
    };

    const result = await generateClinicalSummary({
      patientId: "contract-test-patient",
      conversationHistory: [{ role: "user", content: "ช่วงนี้นอนไม่ค่อยหลับ" }],
      nineQHistory: [{ authored: "2026-09-01", totalScore: 8 }],
      eightQHistory: [],
      reviewFlagCount: 0,
    });

    assert.match(capturedUrl, /gemini-3\.8-flash:generateContent$/);
    assert.equal(new Headers(capturedHeaders).get("x-goog-api-key"), "contract-test-key");
    assert.equal(typeof capturedBody.systemInstruction?.parts?.[0]?.text, "string");
    assert.equal(capturedBody.contents?.[0]?.role, "user");
    assert.equal(capturedBody.generationConfig?.maxOutputTokens, 4096);
    assert.equal(result.summary, "สรุปส่วนที่หนึ่ง และส่วนที่สอง");
    assert.match(result.disclaimer, /ไม่ใช่การวินิจฉัยทางการแพทย์/);
    assert(!Number.isNaN(new Date(result.generatedAt).getTime()));
    console.log("PASS Gemini request contract and multi-part response parsing");

    globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [] } }] });
    await assert.rejects(
      () =>
        generateClinicalSummary({
          patientId: "empty-response-test",
          conversationHistory: [],
          nineQHistory: [],
          eightQHistory: [],
          reviewFlagCount: 0,
        }),
      /empty clinical summary/
    );
    console.log("PASS empty Gemini response fails closed");

    // HTTP success and partial text must not be accepted as a completed summary.
    for (const finishReason of ["MAX_TOKENS", "SAFETY", "OTHER", undefined]) {
      globalThis.fetch = async () => Response.json({
        candidates: [{ finishReason, content: { parts: [{ text: "partial summary" }] } }],
      });
      await assert.rejects(
        () => generateClinicalSummary({
          patientId: "unfinished-response-test",
          conversationHistory: [], nineQHistory: [], eightQHistory: [], reviewFlagCount: 0,
        }),
        /did not finish normally/
      );
    }
    globalThis.fetch = async () => Response.json({ candidates: [] });
    await assert.rejects(
      () => generateClinicalSummary({
        patientId: "missing-candidate-test",
        conversationHistory: [], nineQHistory: [], eightQHistory: [], reviewFlagCount: 0,
      }),
      /did not finish normally/
    );
    console.log("PASS truncated, blocked and unconfirmed Gemini generations fail closed");

    let unavailableAttempts = 0;
    globalThis.fetch = async () => {
      unavailableAttempts++;
      return Response.json({ error: { code: 503, status: "UNAVAILABLE", message: "synthetic provider error" } }, { status: 503 });
    };
    await assert.rejects(
      () => generateClinicalSummary({ patientId: "unavailable-response-test", conversationHistory: [], nineQHistory: [], eightQHistory: [], reviewFlagCount: 0 }),
      /^Error: Clinical summary agent call failed: 503$/
    );
    assert.equal(unavailableAttempts, 1);
    console.log("PASS Gemini HTTP 503 remains a failure with one provider attempt");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error("FAIL Gemini clinical summary contract:", error);
  process.exitCode = 1;
});
