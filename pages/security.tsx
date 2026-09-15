import { useEffect, useState, useCallback } from "react";

interface SecurityReviewItem {
  id: string;
  patientId: string;
  correlationId: string;
  riskLevel: string;
  threatReasons: string[];
  acknowledged: boolean;
  createdAt: string;
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

// หน้านี้ตั้งใจให้เรียบง่ายกว่า Doctor dashboard มาก — ไม่มีรายชื่อผู้ป่วย ไม่มี
// สรุปคลินิก ไม่มีการเข้าถึงบทสนทนา/9Q/8Q ใดๆ ทั้งสิ้น (least privilege) ทีม
// security เห็นแค่ pattern การโจมตี + trace การตัดสินใจของ pipeline เท่านั้น
export default function SecurityDashboard() {
  const [queue, setQueue] = useState<SecurityReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SecurityReviewItem | null>(null);
  const [trace, setTrace] = useState<EventChain | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  const loadQueue = useCallback(async () => {
    const res = await fetch("/api/security/review-queue");
    const json = await res.json();
    if (json.success) setQueue(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 15000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  async function openItem(item: SecurityReviewItem) {
    setSelected(item);
    setTrace(null);
    setTraceLoading(true);
    const res = await fetch(`/api/doctor/event-trace?correlationId=${item.correlationId}`);
    const json = await res.json();
    if (json.success) setTrace(json.data);
    setTraceLoading(false);
  }

  async function acknowledge(id: string) {
    await fetch("/api/security/review-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSelected(null);
    loadQueue();
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">กำลังโหลด...</div>;
  }

  const pendingCount = queue.filter((q) => !q.acknowledged).length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Security review queue</h1>
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

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-medium text-gray-900">
            รอตรวจสอบ ({pendingCount}){" "}
            <span className="text-xs font-normal text-gray-400">
              — เคสที่ detector เจอ pattern น่าสงสัยในข้อความ (block_soft)
            </span>
          </h2>
          <ul className="space-y-2">
            {queue.map((q) => (
              <li
                key={q.id}
                onClick={() => openItem(q)}
                className={`cursor-pointer rounded-lg border p-3 transition hover:border-gray-300 ${
                  q.acknowledged ? "border-gray-100 opacity-50" : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    ผู้ป่วย {q.patientId.slice(0, 8)} — risk: {q.riskLevel}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(q.createdAt).toLocaleString("th-TH")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">{q.threatReasons.join(", ")}</p>
                <p className="mt-1 font-mono text-[11px] text-gray-400">
                  {q.correlationId.slice(0, 8)}…
                </p>
              </li>
            ))}
            {queue.length === 0 && (
              <li className="text-sm text-gray-400">ไม่มีรายการรอตรวจสอบ</li>
            )}
          </ul>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-lg">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">รายละเอียดเคส</h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-gray-500">ผู้ป่วย</dt>
                <dd className="text-gray-900">{selected.patientId}</dd>
              </div>
              <div>
                <dt className="text-gray-500">ระดับความเสี่ยง (จาก Risk engine)</dt>
                <dd className="text-gray-900">{selected.riskLevel}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Pattern ที่ Detector เจอ</dt>
                <dd className="text-gray-900">{selected.threatReasons.join(", ") || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">เวลา</dt>
                <dd className="text-gray-900">
                  {new Date(selected.createdAt).toLocaleString("th-TH")}
                </dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <p className="mb-2 text-xs font-medium text-gray-500">Pipeline trace</p>
              {traceLoading && <p className="text-sm text-gray-500">กำลังโหลด...</p>}
              {!traceLoading && trace && (
                <ol className="space-y-2">
                  {trace.steps.map((s, i) => (
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
              )}
              {!traceLoading && !trace && (
                <p className="text-sm text-gray-400">ไม่พบ trace นี้ (อาจถูกเคลียร์จาก memory แล้ว)</p>
              )}
            </div>

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
    </div>
  );
}
