import { useState } from "react";
import Link from "next/link";
import { useCompanion } from "../lib/useCompanion";

export default function CompanionPage() {
  const { messages, sendMessage, retryPending, sending, error, loadingHistory, statusNotice, safetyAction, pendingCount } = useCompanion();
  const [text, setText] = useState("");

  async function handleSend() {
    if (!text.trim() || sending) return;
    const toSend = text;
    setText("");
    await sendMessage(toSend);
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-base font-medium text-gray-900">Hydra Mesh</h1>
        <div className="flex items-center gap-4">
          <Link href="/screening" className="text-xs text-gray-400 hover:text-gray-600">
            ทำแบบประเมิน 9Q
          </Link>
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

      {safetyAction && <div role="alert" className="border-b border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p>หากตอนนี้ไม่ปลอดภัย ให้ติดต่อคนที่ไว้ใจ ถ้ามีอันตรายฉุกเฉิน โทร 1669</p>
        <div className="mt-2 flex gap-4"><a href="tel:1669" className="underline">โทร 1669</a><a href="tel:1323" className="underline">ปรึกษาสายด่วนสุขภาพจิต 1323</a></div>
      </div>}
      <details className="px-4 py-2 text-xs text-gray-600"><summary>ช่องทางช่วยเหลือ</summary><a href="tel:1323">สายด่วนสุขภาพจิต 1323</a> · <a href="tel:1669">ฉุกเฉิน 1669</a></details>
      {statusNotice && <p role="status" className="px-4 py-2 text-xs text-gray-600">{statusNotice}</p>}

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loadingHistory && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">กำลังโหลดบทสนทนา...</p>
        )}
        {!loadingHistory && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            เริ่มพิมพ์ข้อความได้เลย คุยกับ Hydra ได้ทีละเรื่อง ตามจังหวะที่คุณสะดวก
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                m.role === "user" ? "bg-gray-900 text-white" : "bg-white text-gray-800 shadow-sm"
              }`}
            >
              <span className="whitespace-pre-wrap">{m.content}</span>
              {m.role === "user" && m.delivery && <p className="mt-1 text-xs opacity-70">{m.delivery === "pending" ? "รอส่ง / ยังไม่ยืนยันการรับ" : "Hydra รับข้อความแล้ว"}</p>}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-gray-400">กำลังพิมพ์...</p>}
        {error && <p role="status" className="text-xs text-amber-800">{error}</p>}
        {pendingCount > 0 && <button onClick={() => void retryPending()} disabled={sending} className="rounded border px-3 py-2 text-sm">ส่งข้อความที่ค้างอีกครั้ง ({pendingCount})</button>}
      </div>

      <div className="flex gap-2 border-t border-gray-200 bg-white p-3">
        <input
          maxLength={4000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="พิมพ์ข้อความ..."
          className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-gray-400"
        />
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          ส่ง
        </button>
      </div>
    </div>
  );
}
