import { useState } from "react";
import Link from "next/link";
import { useCompanion } from "../lib/useCompanion";

export default function CompanionPage() {
  const { messages, sendMessage, sending, error, loadingHistory } = useCompanion();
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

      <a
        href="tel:1323"
        className="block border-b border-amber-100 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-800 hover:bg-amber-100"
      >
        รู้สึกไม่ปลอดภัยตอนนี้? โทรสายด่วนสุขภาพจิต <span className="font-medium underline">1323</span> ได้ตลอด 24 ชม.
      </a>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {loadingHistory && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">กำลังโหลดบทสนทนา...</p>
        )}
        {!loadingHistory && messages.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            เริ่มพิมพ์ข้อความได้เลย มีคนพร้อมฟังอยู่ตรงนี้เสมอ
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                m.role === "user" ? "bg-gray-900 text-white" : "bg-white text-gray-800 shadow-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && <p className="text-xs text-gray-400">กำลังพิมพ์...</p>}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>

      <div className="flex gap-2 border-t border-gray-200 bg-white p-3">
        <input
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
