import { useState } from "react";
import Link from "next/link";
import { NINE_Q_QUESTIONS, NINE_Q_OPTIONS } from "../lib/clinical/screening-9q";
import { EIGHT_Q_QUESTIONS, EIGHT_Q_URGENT_REFERRAL_THRESHOLD } from "../lib/clinical/screening-8q";
import type { EightQAnswers } from "../lib/clinical/screening-8q";

// ทั้งไฟล์นี้ import คำถาม/ตัวเลือกจาก lib/clinical/screening-{9q,8q}.ts ตรงๆ
// (ไม่พิมพ์คำถามซ้ำในหน้า UI) เพื่อให้มี single source of truth เดียว — ถ้าแก้
// คำถามหรือเกณฑ์คะแนนที่ไฟล์ scoring จะสะท้อนมาที่หน้านี้อัตโนมัติไม่ต้องแก้สองที่

type Stage = "intro" | "nineQ" | "eightQIntro" | "eightQ" | "done";

type EightQStepKey =
  | "item1"
  | "item2"
  | "item3"
  | "item3Control"
  | "item4"
  | "item5"
  | "item6"
  | "item7"
  | "item8";

const EIGHT_Q_YES_NO = [
  { value: 1, label: "มี" },
  { value: 0, label: "ไม่มี" },
] as const;

// item3Control ถามคนละความหมายจากข้ออื่น ("คุมได้/คุมไม่ได้" ไม่ใช่ "มี/ไม่มี")
// แยก label ให้ชัดกันสับสน
const ITEM3_CONTROL_OPTIONS = [
  { value: 0, label: "คุมได้ / คิดว่าคงไม่ทำตามความคิดนั้นตอนนี้" },
  { value: 1, label: "คุมไม่ได้" },
] as const;

// item3Control ถามต่อเนื่องเฉพาะเมื่อตอบ "มี" ในข้อ 3 เท่านั้น — คำนวณ step list
// ใหม่ทุกครั้งจากคำตอบปัจจุบัน ไม่ใช่ list คงที่ (ดู screening-8q.ts บรรทัดข้างบน
// ว่าทำไมต้อง branching ไม่ใช่ flat array)
function getEightQSteps(answers: Partial<EightQAnswers>): EightQStepKey[] {
  const steps: EightQStepKey[] = ["item1", "item2", "item3"];
  if (answers.item3 === 1) steps.push("item3Control");
  steps.push("item4", "item5", "item6", "item7", "item8");
  return steps;
}

interface NineQResultData {
  totalScore: number;
  severityBand: string;
  requires8Q: boolean;
  item9Flag: boolean;
}

interface EightQResultData {
  totalScore: number;
  severityBand: string;
}

export default function ScreeningPage() {
  const [stage, setStage] = useState<Stage>("intro");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [nineQIndex, setNineQIndex] = useState(0);
  const [nineQAnswers, setNineQAnswers] = useState<(number | null)[]>(
    Array(NINE_Q_QUESTIONS.length).fill(null)
  );
  const [nineQResult, setNineQResult] = useState<NineQResultData | null>(null);

  const [eightQAnswers, setEightQAnswers] = useState<Partial<EightQAnswers>>({});
  const [eightQStepIndex, setEightQStepIndex] = useState(0);
  const [eightQResult, setEightQResult] = useState<EightQResultData | null>(null);

  const eightQSteps = getEightQSteps(eightQAnswers);
  const currentEightQStep = eightQSteps[eightQStepIndex];

  function selectNineQAnswer(value: number) {
    setNineQAnswers((prev) => {
      const next = [...prev];
      next[nineQIndex] = value;
      return next;
    });
  }

  function goToPrevNineQ() {
    if (nineQIndex > 0) setNineQIndex((i) => i - 1);
  }

  function goToNextNineQ() {
    if (nineQIndex < NINE_Q_QUESTIONS.length - 1) {
      setNineQIndex((i) => i + 1);
    } else {
      submitNineQ();
    }
  }

  async function submitNineQ() {
    // เผื่อไว้เฉยๆ — ปกติปุ่ม "ถัดไป"/"ส่งคำตอบ" จะ disabled อยู่แล้วถ้าข้อปัจจุบัน
    // ยังไม่ตอบ ทำให้ path นี้ไม่ควรมี null หลงเหลือ แต่กันเหนียวไว้ก่อนยิง API จริง
    if (nineQAnswers.some((a) => a === null)) {
      setError("กรุณาตอบให้ครบทุกข้อก่อนส่ง");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/screening/9q", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: nineQAnswers }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "ส่งแบบประเมินไม่สำเร็จ");

      const result: NineQResultData = {
        totalScore: json.data.response.totalScore,
        severityBand: json.data.response.severityBand,
        requires8Q: json.data.requires8Q,
        item9Flag: json.data.item9Flag,
      };
      setNineQResult(result);

      // ข้อ 9 ผูกกับความเสี่ยงทำร้ายตนเองโดยตรง — ถามต่อด้วย 8Q เสมอถ้ามีสัญญาณ
      // ข้อนี้แม้คะแนนรวมยังไม่ถึงเกณฑ์ 7 (safety-first) requires8Q กับ item9Flag
      // เป็นคนละเงื่อนไขที่ API ตั้งใจแยกส่งมาให้ฝั่งนี้ตัดสินใจรวมกันเอง
      setStage(result.requires8Q || result.item9Flag ? "eightQIntro" : "done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  function selectEightQAnswer(key: EightQStepKey, value: number) {
    setEightQAnswers((prev) => {
      const next = { ...prev, [key]: value };
      // เปลี่ยนคำตอบข้อ 3 เป็น "ไม่มี" ทีหลัง ต้องล้าง item3Control เดิมทิ้ง ไม่งั้น
      // จะมีคะแนนจากคำถามที่ไม่ควรถูกถามค้างอยู่ในคำตอบที่จะส่ง
      if (key === "item3" && value === 0) delete next.item3Control;
      return next;
    });
  }

  function goToPrevEightQ() {
    if (eightQStepIndex > 0) setEightQStepIndex((i) => i - 1);
  }

  function goToNextEightQ() {
    if (eightQStepIndex < eightQSteps.length - 1) {
      setEightQStepIndex((i) => i + 1);
    } else {
      submitEightQ();
    }
  }

  async function submitEightQ() {
    if (eightQSteps.some((k) => eightQAnswers[k] === undefined)) {
      setError("กรุณาตอบให้ครบทุกข้อก่อนส่ง");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/screening/8q", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: eightQAnswers }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "ส่งแบบประเมินไม่สำเร็จ");

      setEightQResult({
        totalScore: json.data.response.totalScore,
        severityBand: json.data.response.severityBand,
      });
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  const eightQUrgent =
    eightQResult !== null && eightQResult.totalScore >= EIGHT_Q_URGENT_REFERRAL_THRESHOLD;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-base font-medium text-gray-900">Hydra Mesh</h1>
        <Link href="/companion" className="text-xs text-gray-400 hover:text-gray-600">
          กลับไปที่หน้าแชท
        </Link>
      </div>

      <div className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
        {stage === "intro" && (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-medium text-gray-900">แบบประเมินสุขภาพใจ (9Q)</h2>
            <p className="text-sm text-gray-500">
              9 คำถามสั้นๆ เกี่ยวกับความรู้สึกในช่วง 2 สัปดาห์ที่ผ่านมา ตอบตามความรู้สึกจริง
              ไม่มีคำตอบถูกหรือผิด แพทย์จะดูผลนี้ประกอบการดูแลคุณ
            </p>
            <button
              onClick={() => setStage("nineQ")}
              className="w-full rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              เริ่มทำแบบประเมิน
            </button>
          </div>
        )}

        {stage === "nineQ" && (
          <div className="space-y-5">
            <p className="text-xs text-gray-400">
              ข้อ {nineQIndex + 1} จาก {NINE_Q_QUESTIONS.length}
            </p>
            <p className="text-base text-gray-900">{NINE_Q_QUESTIONS[nineQIndex].text}</p>
            <div className="space-y-2">
              {NINE_Q_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectNineQAnswer(opt.value)}
                  className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                    nineQAnswers[nineQIndex] === opt.value
                      ? "border-gray-900 bg-gray-900 text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              {nineQIndex > 0 && (
                <button
                  onClick={goToPrevNineQ}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  ย้อนกลับ
                </button>
              )}
              <button
                onClick={goToNextNineQ}
                disabled={nineQAnswers[nineQIndex] === null || submitting}
                className="flex-1 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {nineQIndex === NINE_Q_QUESTIONS.length - 1
                  ? submitting
                    ? "กำลังส่ง..."
                    : "ส่งคำตอบ"
                  : "ถัดไป"}
              </button>
            </div>
          </div>
        )}

        {stage === "eightQIntro" && (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-medium text-gray-900">ขอถามเพิ่มอีกนิดนะ</h2>
            <p className="text-sm text-gray-500">
              จากคำตอบของคุณ อยากขอถามอีก 8 คำถามเพื่อดูแลคุณให้ดีขึ้น ใช้เวลาไม่นาน
              และคำตอบทุกข้อถูกเก็บเป็นความลับ
            </p>
            <button
              onClick={() => setStage("eightQ")}
              className="w-full rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              ทำต่อ
            </button>
          </div>
        )}

        {stage === "eightQ" && (
          <div className="space-y-5">
            <p className="text-xs text-gray-400">
              ข้อ {eightQStepIndex + 1} จาก {eightQSteps.length}
            </p>
            <p className="text-base text-gray-900">{EIGHT_Q_QUESTIONS[currentEightQStep].text}</p>
            <div className="space-y-2">
              {(currentEightQStep === "item3Control" ? ITEM3_CONTROL_OPTIONS : EIGHT_Q_YES_NO).map(
                (opt) => (
                  <button
                    key={opt.value}
                    onClick={() => selectEightQAnswer(currentEightQStep, opt.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      eightQAnswers[currentEightQStep] === opt.value
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              )}
            </div>
            <div className="flex gap-2 pt-2">
              {eightQStepIndex > 0 && (
                <button
                  onClick={goToPrevEightQ}
                  className="rounded-full border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  ย้อนกลับ
                </button>
              )}
              <button
                onClick={goToNextEightQ}
                disabled={eightQAnswers[currentEightQStep] === undefined || submitting}
                className="flex-1 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {eightQStepIndex === eightQSteps.length - 1
                  ? submitting
                    ? "กำลังส่ง..."
                    : "ส่งคำตอบ"
                  : "ถัดไป"}
              </button>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-medium text-gray-900">ทำแบบประเมินเสร็จแล้ว</h2>

            {nineQResult && <p className="text-sm text-gray-500">ผล 9Q: {nineQResult.severityBand}</p>}

            {eightQResult && (
              <p className="text-sm text-gray-500">ผลการประเมินเพิ่มเติม: {eightQResult.severityBand}</p>
            )}

            <p className="text-sm text-gray-600">
              ทีมแพทย์จะได้รับผลนี้และติดต่อกลับหากจำเป็น ระหว่างนี้คุณคุยกับ Companion
              ต่อได้ตลอดเวลา
            </p>

            {eightQUrgent && (
              <div className="rounded-xl border border-gray-300 bg-white p-4 text-left">
                <p className="text-sm font-medium text-gray-900">
                  ถ้าตอนนี้รู้สึกอันตราย หรืออยากคุยกับคนตอนนี้เลย
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  โทรสายด่วนสุขภาพจิต <span className="font-medium text-gray-900">1323</span> ได้ตลอด
                  24 ชั่วโมง
                </p>
              </div>
            )}

            <Link
              href="/companion"
              className="block w-full rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white hover:bg-gray-800"
            >
              กลับไปที่หน้าแชท
            </Link>
          </div>
        )}

        {error && <p className="mt-4 text-center text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
