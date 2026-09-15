import { useState, useCallback, useEffect } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UseCompanionOptions {
  onError?: (err: string) => void;
}

export function useCompanion(options: UseCompanionOptions = {}) {
  const { onError } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // โหลดประวัติที่เข้ารหัสไว้ใน DB กลับมาแสดงตอนเปิดหน้า (v2 Phase 1 — เดิมเริ่ม
  // ว่างทุกครั้งเพราะ history อยู่แค่ React state) ล้มเหลวก็แค่เริ่มคุยใหม่ได้
  // ตามปกติ ไม่ต้องโชว์ error ให้ผู้ป่วยเห็นเรื่องนี้
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/companion/history");
        const json = await res.json();
        if (!cancelled && json.success) setMessages(json.data.messages);
      } catch {
        // เงียบไว้ตรงนี้ตั้งใจ — ดู comment ด้านบน
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sendMessage = useCallback(
    async (text: string): Promise<string | null> => {
      setSending(true);
      setError(null);
      setMessages((prev) => [...prev, { role: "user", content: text }]);

      try {
        // v2 Phase 1: ไม่ส่ง history จาก client อีกต่อไป — server query จาก DB
        // เองเสมอ (ดู pages/api/companion/chat.ts ว่าทำไมถึงแก้)
        const res = await fetch("/api/companion/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        const reply: string = json.data.reply;
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setSending(false);
        return reply;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Send failed";
        setError(msg);
        onError?.(msg);
        setSending(false);
        return null;
      }
    },
    [onError]
  );

  return { messages, sendMessage, sending, error, loadingHistory };
}
