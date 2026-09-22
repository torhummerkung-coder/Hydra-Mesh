import type { HealthState } from "../lib/clinical/system-health";
import { useEffect, useState, useCallback } from "react";

interface PatientSummary {
  id: string;
  name: string;
  riskLevel: "unknown" | "low" | "moderate" | "high" | "critical";
  lastActiveAt: string | null;
  assignmentExpiresAt: string | null;
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
  summaryStatus?: "available" | "unavailable";
  sourceMessages?: { role: string; content: string; createdAt: string }[];
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
  patientId?: string;
}

interface EventTraceChain {
  correlationId: string;
  totalDurationMs: number;
  patientId?: string;
  steps: { agentId: string; type: string; atMs: number }[];
}

const RISK_DOT: Record<string, string> = {
  unknown: "bg-gray-400",
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
  const [health, setHealth] = useState<HealthState>("unknown");
  const [components, setComponents] = useState<Record<string, { state: string; updatedAt: string | null }>>({});
  const [stale, setStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReviewQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryPatient, setSummaryPatient] = useState<PatientSummary | null>(null);
  const [summaryResult, setSummaryResult] = useState<ClinicalSummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<EventTraceChain | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    const [patientsRes, queueRes, healthRes, tracesRes] = await Promise.all([
      fetch("/api/doctor/patients", { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/doctor/review-queue", { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/doctor/system-health", { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch("/api/doctor/event-trace", { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).catch(() => ({ success: false })),
    ]);
    if (patientsRes.success) setPatients(patientsRes.data);
    if (queueRes.success) setQueue(queueRes.data);
    if (healthRes.success) { setHealth(healthRes.data.status); setComponents(healthRes.data.components ?? {}); }
    else { setHealth("unknown"); setComponents({}); }
    if (tracesRes.success) setTraces(tracesRes.data);
    const allFresh = [patientsRes, queueRes, healthRes, tracesRes].every(r => r.success);
    setStale(!allFresh);
    if (allFresh) setUpdatedAt(new Date().toISOString());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    // refresh ธรรมดา ไม่ใช้ SSE ตามที่ตัดสินใจไว้ตั้งแต่รอบ scope-cut แรก
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, [loadAll]);

  async function acknowledge(id: string) {
    setActionError(null);
    try {
      const response = await fetch("/api/doctor/review-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setActionError("รับทราบเคสไม่สำเร็จ หรือสิทธิ์ในการดูแลเคสนี้ถูกเปลี่ยนแล้ว");
        return;
      }
      setSelected(null);
      await loadAll();
    } catch {
      setActionError("เชื่อมต่อเพื่อรับทราบเคสไม่สำเร็จ โปรดลองอีกครั้ง");
    }
  }

  async function viewSummary(patient: PatientSummary) {
    setSummaryPatient(patient);
    setSummaryLoading(true);
    setSummaryResult(null);
    // ส่งแค่ patientId — server เป็นคน query conversation/9Q/8Q history เอง
    // (เดิม client ส่งข้อมูลดิบมาด้วย ซึ่งเป็นช่องโหว่ trust-boundary ที่แก้แล้ว)
    try {
    const res = await fetch("/api/doctor/patient-summary", {
      signal: AbortSignal.timeout(15000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id }),
    });
    const json = await res.json();
    if (json.success) setSummaryResult(json.data);
    } catch { /* show unavailable below */ }
    finally { setSummaryLoading(false); }
  }

  async function viewTrace(correlationId: string) {
    setTraceLoading(true);
    setTraceError(null);
    setSelectedTrace(null);
    try {
      const response = await fetch(
        `/api/doctor/event-trace?correlationId=${encodeURIComponent(correlationId)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      const json = await response.json();
      if (!response.ok || !json.success) {
        setTraceError("เปิด trace ไม่สำเร็จ หรือสิทธิ์ในการดูแลผู้ป่วยถูกเปลี่ยนแล้ว");
        return;
      }
      setSelectedTrace(json.data);
    } catch {
      setTraceError("เชื่อมต่อเพื่ออ่าน trace ไม่สำเร็จ โปรดลองอีกครั้ง");
    } finally {
      setTraceLoading(false);
    }
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
                {({ healthy: "ระบบปกติ", degraded: "ทำงานได้บางส่วน", safety_degraded: "เส้นทางความปลอดภัยทำงานได้จำกัด", unavailable: "บางส่วนใช้งานไม่ได้", unknown: "ยังไม่ทราบสถานะระบบ" })[health]}
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

        <div className="mb-4 rounded bg-white p-3 text-sm">
          <p>{stale ? "ข้อมูลบางส่วนอาจไม่ล่าสุด — โปรดตรวจช่องทางติดต่อโดยตรง" : "อัปเดตข้อมูลเป็นระยะ"} · อัปเดตครบล่าสุด: {updatedAt ? new Date(updatedAt).toLocaleTimeString('th-TH') : 'ยังไม่มี'}</p>
          <details><summary>สถานะแต่ละส่วน (เฉพาะ process นี้)</summary><table className="mt-2 w-full text-left"><thead><tr><th>ส่วน</th><th>สถานะ</th><th>สังเกตล่าสุด</th></tr></thead><tbody>{Object.entries(components).map(([name, value]) => <tr key={name}><td>{name}</td><td>{value.state}</td><td>{value.updatedAt ?? 'ยังไม่มี'}</td></tr>)}</tbody></table></details>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Patients */}
          <div className="rounded-xl bg-white p-4 shadow-sm lg:col-span-1">
            <h2 className="mb-3 font-medium text-gray-900">ผู้ป่วยในความดูแลของฉัน</h2>
            <ul className="space-y-2">
              {patients.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">
                      ล่าสุด: {p.lastActiveAt ? new Date(p.lastActiveAt).toLocaleString("th-TH") : "ยังไม่มีกิจกรรม"}
                    </p>
                    {p.assignmentExpiresAt && (
                      <p className="text-[10px] text-gray-400">
                        สิทธิ์ดูแลถึง {new Date(p.assignmentExpiresAt).toLocaleString("th-TH")}
                      </p>
                    )}
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
                <li className="text-sm text-gray-400">ยังไม่มีผู้ป่วยที่ได้รับมอบหมาย</li>
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

        <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-gray-900">Event trace ของผู้ป่วยในความดูแล</h2>
            <span className="text-xs text-gray-400">แสดงเฉพาะ trace ที่ยืนยันสิทธิ์ได้</span>
          </div>
          {traceError && <p role="alert" className="mb-3 text-sm text-red-600">{traceError}</p>}
          {traceLoading && <p className="mb-3 text-sm text-gray-500">กำลังโหลด trace...</p>}
          <ul className="space-y-2">
            {traces.map((trace) => (
              <li key={trace.correlationId} className="rounded-lg border border-gray-100 p-3">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {trace.lastEventType} · {trace.stepCount} ขั้นตอน
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(trace.startedAt).toLocaleString("th-TH")} · {trace.correlationId.slice(0, 12)}…
                    </p>
                  </div>
                  <button
                    onClick={() => viewTrace(trace.correlationId)}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    ดูลำดับเหตุการณ์
                  </button>
                </div>
              </li>
            ))}
            {traces.length === 0 && (
              <li className="text-sm text-gray-400">ยังไม่มี trace ที่อยู่ในขอบเขตสิทธิ์</li>
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
            {actionError && <p role="alert" className="mt-3 text-sm text-red-600">{actionError}</p>}
          </div>
        </div>
      )}

      {/* Event trace modal — intentionally omits raw payload for data minimization */}
      {selectedTrace && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900">ลำดับเหตุการณ์ของระบบ</h3>
            <p className="mt-1 break-all text-xs text-gray-400">{selectedTrace.correlationId}</p>
            <p className="mt-2 text-xs text-gray-500">
              {selectedTrace.steps.length} ขั้นตอน · รวม {selectedTrace.totalDurationMs} ms
            </p>
            <ol className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {selectedTrace.steps.map((step, index) => (
                <li key={`${step.agentId}-${step.atMs}-${index}`} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{step.type}</p>
                      <p className="text-xs text-gray-500">{step.agentId}</p>
                    </div>
                    <span className="text-xs text-gray-400">+{step.atMs} ms</span>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-gray-400">ไม่แสดง raw payload ตามหลัก data minimization</p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedTrace(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
            {!summaryLoading && !summaryResult && <p role="status">เปิดข้อมูลไม่ได้ในขณะนี้ ไม่สามารถสรุประดับความเสี่ยงได้</p>}
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
                {summaryResult.sourceMessages && <details className="mt-3"><summary>ข้อความต้นทาง</summary>{summaryResult.sourceMessages.map((m,i)=><p key={i} className="mt-2 whitespace-pre-wrap text-sm">{m.role} · {new Date(m.createdAt).toLocaleString('th-TH')}: {m.content}</p>)}</details>}
                <details className="mt-3"><summary>คะแนนและวันที่แบบตาราง</summary><table className="w-full text-sm"><thead><tr><th>แบบประเมิน</th><th>วันที่</th><th>คะแนน</th></tr></thead><tbody>{[['9Q',summaryResult.nineQScores],['8Q',summaryResult.eightQScores]].flatMap(([name,rows])=>(rows as ScorePoint[]).map((p,i)=><tr key={`${name}-${i}`}><td>{name as string}</td><td>{p.authored}</td><td>{p.totalScore}</td></tr>))}</tbody></table></details>
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
    </div>
  );
}
