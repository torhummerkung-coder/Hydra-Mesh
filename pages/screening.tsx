import { queueMessage, pendingMessages } from "../lib/client/outbox";
import { useState, useEffect, useRef } from "react";
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
  requiresPsychiatristReferral: boolean;
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

  const [draftReady, setDraftReady] = useState(false);
  const [deliveryNotice, setDeliveryNotice] = useState<string | null>(null);
  const draftScope = useRef<string | null>(null);
  const nineId = useRef(''), eightId = useRef('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/companion/identity', { signal: AbortSignal.timeout(5000), cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error('identity');
        if (cancelled) return;
        draftScope.current = `${data.scope}:screening`;
        const saved = (await pendingMessages(draftScope.current)).find(m => m.id === 'screening-draft');
        if (saved && !cancelled) {
          const d = JSON.parse(saved.text);
          setStage(d.stage); setNineQAnswers(d.nineQAnswers); setNineQIndex(d.nineQIndex);
          setEightQAnswers(d.eightQAnswers); setEightQStepIndex(d.eightQStepIndex);
          setNineQResult(d.nineQResult); setEightQResult(d.eightQResult);
          nineId.current = d.nineId; eightId.current = d.eightId;
          setDeliveryNotice('เปิดคำตอบที่เก็บไว้ในเครื่องแล้ว');
        }
      } catch { if (!cancelled) setDeliveryNotice('ยังเก็บคำตอบลงเครื่องไม่ได้ โปรดอย่าปิดหน้านี้'); }
      finally { if (!cancelled) setDraftReady(true); }
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!draftReady || !draftScope.current) return;
    const account = draftScope.current;
    const timer = setTimeout(() => {
      void queueMessage(account, { id: 'screening-draft', createdAt: Date.now(), text: JSON.stringify({stage,nineQAnswers,nineQIndex,eightQAnswers,eightQStepIndex,nineQResult,eightQResult,nineId:nineId.current,eightId:eightId.current}) })
        .catch(() => setDeliveryNotice('เก็บคำตอบล่าสุดลงเครื่องไม่สำเร็จ โปรดอย่าปิดหน้านี้'));
    }, 200);
    return () => clearTimeout(timer);
  }, [draftReady,stage,nineQAnswers,nineQIndex,eightQAnswers,eightQStepIndex,nineQResult,eightQResult]);

  const eightQSteps = getEightQSteps(eightQAnswers);
  const currentEightQStep = eightQSteps[eightQStepIndex];

  function selectNineQAnswer(value: number) {
    nineId.current = crypto.randomUUID();
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
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountScope: draftScope.current?.replace(/:screening$/, ""), answers: nineQAnswers, messageId: nineId.current || (nineId.current = crypto.randomUUID()) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error('delivery_unconfirmed');
      setDeliveryNotice([json.data.persistenceState === 'saved' ? 'บันทึกคำตอบแล้ว' : json.data.persistenceState === 'pending' ? 'เก็บคำตอบไว้เพื่อบันทึกซ้ำแล้ว' : 'ยังบันทึกคำตอบไม่สำเร็จ โปรดเก็บหน้านี้ไว้', json.data.statusNotice].filter(Boolean).join(' · '));
      if (json.data.persistenceState === 'failed') return;

      const result: NineQResultData = {
        totalScore: json.data.response.totalScore,
        severityBand: json.data.response.severityBand,
        requires8Q: json.data.requires8Q,
        item9Flag: json.data.item9Flag,
        requiresPsychiatristReferral: json.data.requiresPsychiatristReferral,
      };
      setNineQResult(result);

      // ข้อ 9 ผูกกับความเสี่ยงทำร้ายตนเองโดยตรง — ถามต่อด้วย 8Q เสมอถ้ามีสัญญาณ
      // ข้อนี้แม้คะแนนรวมยังไม่ถึงเกณฑ์ 7 (safety-first) requires8Q กับ item9Flag
      // เป็นคนละเงื่อนไขที่ API ตั้งใจแยกส่งมาให้ฝั่งนี้ตัดสินใจรวมกันเอง
      setStage(result.requires8Q || result.item9Flag ? "eightQIntro" : "done");
    } catch (err) {
      setError("ยังยืนยันการรับคำตอบไม่ได้ คำตอบยังอยู่ในหน้านี้ กดส่งอีกครั้งได้โดยไม่ต้องเริ่มใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  function selectEightQAnswer(key: EightQStepKey, value: number) {
    eightId.current = crypto.randomUUID();
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
        signal: AbortSignal.timeout(15000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountScope: draftScope.current?.replace(/:screening$/, ""), answers: eightQAnswers, messageId: eightId.current || (eightId.current = crypto.randomUUID()) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error('delivery_unconfirmed');
      setDeliveryNotice([json.data.persistenceState === 'saved' ? 'บันทึกคำตอบแล้ว' : json.data.persistenceState === 'pending' ? 'เก็บคำตอบไว้เพื่อบันทึกซ้ำแล้ว' : 'ยังบันทึกคำตอบไม่สำเร็จ โปรดเก็บหน้านี้ไว้', json.data.statusNotice].filter(Boolean).join(' · '));
      if (json.data.persistenceState === 'failed') return;

      setEightQResult({
        totalScore: json.data.response.totalScore,
        severityBand: json.data.response.severityBand,
      });
      setStage("done");
    } catch (err) {
      setError("ยังยืนยันการรับคำตอบไม่ได้ คำตอบยังอยู่ในหน้านี้ กดส่งอีกครั้งได้โดยไม่ต้องเริ่มใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  const eightQUrgent =
    eightQResult !== null && eightQResult.totalScore >= EIGHT_Q_URGENT_REFERRAL_THRESHOLD;

  if (!draftReady) return <p role="status" className="p-6">กำลังเปิดแบบประเมิน...</p>;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-base font-medium text-gray-900">Hydra Mesh</h1>
        <Link href="/companion" className="text-xs text-gray-400 hover:text-gray-600">
          กลับไปที่หน้าแชท
        </Link>
      </div>

      {deliveryNotice && <p role="status" className="px-4 py-2 text-sm text-gray-600">{deliveryNotice}</p>}
      {(eightQAnswers.item3Control === 1 || eightQAnswers.item4 === 1 || eightQAnswers.item5 === 1 || eightQAnswers.item7 === 1) && <div role="alert" className="bg-amber-50 p-4 text-sm">
        <p>ตอนนี้คุณปลอดภัยอยู่ไหม? หากมีอันตรายตรงหน้า ไม่ต้องรอทำแบบประเมินให้จบ</p><a href="tel:1669" className="underline">ฉุกเฉิน 1669</a> · <a href="tel:1323" className="underline">สายด่วนสุขภาพจิต 1323</a>
      </div>}
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
            <h2 className="text-lg font-medium text-gray-900">ขอบคุณที่แชร์เรื่องราว</h2>
            <p className="text-sm text-gray-600">คุณกลับไปคุยกับ Companion ต่อได้ตามจังหวะที่สะดวก</p>

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
