import { useEffect, useState, useCallback } from "react";

interface PatientSummary {
  id: string;
  name: string;
  riskLevel: "low" | "moderate" | "high" | "critical";
  lastActive: string;
}

interface ReviewQueueItem {
  id: string;
  patientId: string;
  source: "chat_risk_engine" | "screening_8q";
  reason: string;
  riskLevel: string;
  createdAt: string;
  acknowledged: boolean;
  severity: "low" | "medium" | "high" | "critical";
  notifyImmediately: boolean;
}

interface ScorePoint {
  authored: string;
  totalScore: number;
}

interface ClinicalSummaryResult {
  summary: string;
  generatedAt: string;
  disclaimer: string;
  nineQScores: ScorePoint[];
  eightQScores: ScorePoint[];
}

interface TraceSummary {
  correlationId: string;
  startedAt: number;
  stepCount: number;
  lastEventType: string;
}

interface EventChainStep {
  agentId: string;
  type: string;
  atMs: number;
  payload: unknown;
}

interface EventChain {
  correlationId: string;
  totalDurationMs: number;
  steps: EventChainStep[];
}

const RISK_DOT: Record<string, string> = {
  low: "bg-green-500",
  moderate: "bg-yellow-500",
  high: "bg-red-500",
  critical: "bg-red-600",
};

// กราฟเส้นแนวโน้มคะแนน 9Q/8Q — เขียนเป็น SVG ตรงๆ ไม่เพิ่ม chart library ใหม่
// (โปรเจกต์นี้ตั้งใจไม่มี dependency เกินจำเป็นตลอดมา ดู PRODUCTION_ROADMAP.md)
// ข้อมูลที่รับมาเป็น {authored, totalScore} ล้วนๆ ไม่มี item รายข้อ — คะแนนรวม
// พอสำหรับดู trend แล้ว ไม่ต้อง decrypt/ส่งเนื้อหาละเอียดออกมาโดยไม่จำเป็น
function ScoreTrendChart({
  title,
  data,
  max,
  threshold,
}: {
  title: string;
  data: ScorePoint[];
  max: number;
  threshold?: { value: number; label: string };
}) {
  const width = 280;
  const height = 100;
  const padTop = 10;
  const padBottom = 18;
  const padX = 8;
  const chartHeight = height - padTop - padBottom;

  const toY = (score: number) => padTop + (1 - Math.min(score, max) / max) * chartHeight;
  const toX = (i: number) =>
    data.length <= 1 ? width / 2 : padX + (i / (data.length - 1)) * (width - padX * 2);

  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.totalScore) }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const latest = data[data.length - 1];

  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-xs font-medium text-gray-700">{title}</p>
        {latest && (
          <p className="text-xs text-gray-500">
            ล่าสุด <span className="font-medium text-gray-900">{latest.totalScore}</span>/{max}
          </p>
        )}
      </div>
      {data.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400">ยังไม่มีข้อมูล</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
          {threshold && (
            <>
              <line
                x1={padX}
                x2={width - padX}
                y1={toY(threshold.value)}
                y2={toY(threshold.value)}
                stroke="#dc2626"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <text x={width - padX} y={toY(threshold.value) - 3} textAnchor="end" fontSize="7" fill="#dc2626">
                {threshold.label}
              </text>
            </>
          )}
          {points.length > 1 && <path d={pathD} fill="none" stroke="#111827" strokeWidth={1.5} />}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#111827" />
          ))}
        </svg>
      )}
      {data.length > 0 && (
        <div className="mt-1 flex justify-between text-[10px] text-gray-400">
          <span>{new Date(data[0].authored).toLocaleDateString("th-TH")}</span>
          {data.length > 1 && (
            <span>{new Date(data[data.length - 1].authored).toLocaleDateString("th-TH")}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [health, setHealth] = useState<"healthy" | "degraded">("healthy");
  const [selected, setSelected] = useState<ReviewQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryPatient, setSummaryPatient] = useState<PatientSummary | null>(null);
  const [summaryResult, setSummaryResult] = useState<ClinicalSummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [traceModalOpen, setTraceModalOpen] = useState(false);
  const [selectedTrace, setSelectedTrace] = useState<EventChain | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  const loadAll = useCallback(async () => {
    const [patientsRes, queueRes, healthRes, tracesRes] = await Promise.all([
      fetch("/api/doctor/patients").then((r) => r.json()),
      fetch("/api/doctor/review-queue").then((r) => r.json()),
      fetch("/api/doctor/system-health").then((r) => r.json()),
      fetch("/api/doctor/event-trace").then((r) => r.json()),
    ]);
    if (patientsRes.success) setPatients(patientsRes.data);
    if (queueRes.success) setQueue(queueRes.data);
    if (healthRes.success) setHealth(healthRes.data.status);
    if (tracesRes.success) setTraces(tracesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    // refresh ธรรมดา ไม่ใช้ SSE ตามที่ตัดสินใจไว้ตั้งแต่รอบ scope-cut แรก
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, [loadAll]);

  async function acknowledge(id: string) {
    await fetch("/api/doctor/review-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSelected(null);
    loadAll();
  }

  async function viewSummary(patient: PatientSummary) {
    setSummaryPatient(patient);
    setSummaryLoading(true);
    setSummaryResult(null);
    // ส่งแค่ patientId — server เป็นคน query conversation/9Q/8Q history เอง
    // (เดิม client ส่งข้อมูลดิบมาด้วย ซึ่งเป็นช่องโหว่ trust-boundary ที่แก้แล้ว)
    const res = await fetch("/api/doctor/patient-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id }),
    });
    const json = await res.json();
    if (json.success) setSummaryResult(json.data);
    setSummaryLoading(false);
  }

  async function viewTrace(correlationId: string) {
    setTraceModalOpen(true);
    setTraceLoading(true);
    setSelectedTrace(null);
    const res = await fetch(`/api/doctor/event-trace?correlationId=${correlationId}`);
    const json = await res.json();
    if (json.success) setSelectedTrace(json.data);
    setTraceLoading(false);
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">กำลังโหลด...</div>;
  }

  const pendingCount = queue.filter((q) => !q.acknowledged).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Doctor dashboard</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  health === "healthy" ? "bg-green-500" : "bg-amber-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                {health === "healthy" ? "ระบบปกติ" : "ระบบมีปัญหาชั่วคราว (fallback active)"}
              </span>
            </div>
            <button
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                window.location.href = "/";
              }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Patients */}
          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-1">
            <h2 className="mb-3 font-medium text-gray-900">รายชื่อผู้ป่วย</h2>
            <ul className="space-y-2">
              {patients.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">ล่าสุด: {p.lastActive}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => viewSummary(p)}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      สรุปคลินิก
                    </button>
                    <span
                      className={`h-3 w-3 rounded-full ${RISK_DOT[p.riskLevel] ?? "bg-gray-300"}`}
                      title={p.riskLevel}
                    />
                  </div>
                </li>
              ))}
              {patients.length === 0 && (
                <li className="text-sm text-gray-400">ยังไม่มีข้อมูลผู้ป่วย</li>
              )}
            </ul>
          </div>

          {/* Review queue */}
          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="mb-3 font-medium text-gray-900">คิวรอตรวจสอบ ({pendingCount})</h2>
            <ul className="space-y-2">
              {queue.map((q) => (
                <li
                  key={q.id}
                  onClick={() => setSelected(q)}
                  className={`cursor-pointer rounded-lg border p-3 transition hover:border-gray-300 ${
                    q.acknowledged ? "border-gray-100 opacity-50" : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
                      ผู้ป่วย {q.patientId.slice(0, 8)} — {q.riskLevel}
                      {q.notifyImmediately && (
                        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                          ด่วน
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(q.createdAt).toLocaleString("th-TH")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{q.reason}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    ที่มา: {q.source === "chat_risk_engine" ? "บทสนทนา" : "แบบประเมิน 8Q"}
                  </p>
                </li>
              ))}
              {queue.length === 0 && (
                <li className="text-sm text-gray-400">ไม่มีรายการรอตรวจสอบ</li>
              )}
            </ul>
          </div>
        </div>

        {/* Message trace — v2 audit log, ดู PRODUCTION_ROADMAP.md ส่วนขยาย v2.0 */}
        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-medium text-gray-900">
            Message trace ล่าสุด{" "}
            <span className="text-xs font-normal text-gray-400">(v2 — audit log)</span>
          </h2>
          <ul className="space-y-1">
            {traces.map((t) => (
              <li
                key={t.correlationId}
                onClick={() => viewTrace(t.correlationId)}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-100 p-2 text-xs hover:border-gray-300"
              >
                <span className="font-mono text-gray-500">{t.correlationId.slice(0, 8)}…</span>
                <span className="text-gray-600">{t.stepCount} steps</span>
                <span className="text-gray-500">{t.lastEventType}</span>
                <span className="text-gray-400">
                  {new Date(t.startedAt).toLocaleTimeString("th-TH")}
                </span>
              </li>
            ))}
            {traces.length === 0 && (
              <li className="text-sm text-gray-400">
                ยังไม่มี trace — จะเห็นรายการที่นี่หลังมีคนคุยกับ Companion อย่างน้อยหนึ่งครั้ง
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Direct specialist modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">รายละเอียดเคส</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">ผู้ป่วย</dt>
                <dd className="text-gray-900">{selected.patientId}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ระดับความเสี่ยง</dt>
                <dd className="text-gray-900">{selected.riskLevel}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Severity (v2 policy engine)</dt>
                <dd className="text-gray-900">
                  {selected.severity}
                  {selected.notifyImmediately ? " — แจ้งเตือนด่วน" : " — คิวปกติ"}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">สาเหตุ</dt>
                <dd className="text-gray-900">{selected.reason}</dd>
              </div>
              <div>
                <dt className="text-gray-500">เวลา</dt>
                <dd className="text-gray-900">
                  {new Date(selected.createdAt).toLocaleString("th-TH")}
                </dd>
              </div>
            </dl>
            {/* TODO: โหลด encrypted payload (บทสนทนาที่เกี่ยวข้อง) ผ่าน hydra-crypto
                decrypt เฉพาะตอนเปิด modal นี้ — นี่คือหนึ่งใน audited decrypt event
                ตามโมเดล hybrid encryption ที่วางไว้ */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => acknowledge(selected.id)}
                className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                รับทราบแล้ว
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clinical summary modal */}
      {summaryPatient && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              สรุปทางคลินิก — {summaryPatient.name}
            </h3>
            {summaryLoading && <p className="mt-4 text-sm text-gray-500">กำลังสรุป...</p>}
            {!summaryLoading && summaryResult && (
              <>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ScoreTrendChart
                    title="แนวโน้ม 9Q"
                    data={summaryResult.nineQScores}
                    max={27}
                    threshold={{ value: 7, label: "ควรทำ 8Q ต่อ" }}
                  />
                  <ScoreTrendChart
                    title="แนวโน้ม 8Q"
                    data={summaryResult.eightQScores}
                    max={52}
                    threshold={{ value: 17, label: "เกณฑ์ส่งต่อด่วน" }}
                  />
                </div>
                <p className="mb-3 mt-3 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                  {summaryResult.disclaimer}
                </p>
                <div className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg border border-gray-100 p-3 text-sm text-gray-800">
                  {summaryResult.summary}
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  สร้างเมื่อ {new Date(summaryResult.generatedAt).toLocaleString("th-TH")}
                </p>
              </>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setSummaryPatient(null);
                  setSummaryResult(null);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Event trace modal — v2 audit log */}
      {traceModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-1 text-lg font-semibold text-gray-900">Message trace</h3>
            {traceLoading && <p className="mt-4 text-sm text-gray-500">กำลังโหลด...</p>}
            {!traceLoading && selectedTrace && (
              <>
                <p className="mb-3 font-mono text-xs text-gray-400">
                  {selectedTrace.correlationId} · {selectedTrace.totalDurationMs}ms รวม
                </p>
                <ol className="space-y-2">
                  {selectedTrace.steps.map((s, i) => (
                    <li key={i} className="rounded-lg border border-gray-100 p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">
                          +{s.atMs}ms — {s.agentId}
                        </span>
                        <span className="text-gray-500">{s.type}</span>
                      </div>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-[11px] text-gray-500">
                        {JSON.stringify(s.payload, null, 2)}
                      </pre>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {!traceLoading && !selectedTrace && (
              <p className="mt-4 text-sm text-gray-400">ไม่พบ trace นี้ (อาจถูกเคลียร์จาก memory แล้ว)</p>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setTraceModalOpen(false);
                  setSelectedTrace(null);
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
