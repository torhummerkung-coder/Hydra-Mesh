import { useState, useCallback, useEffect, useRef } from 'react';
import { pendingMessages, queueMessage, removePending, type PendingMessage } from './client/outbox';
import { detectLocalSafety, needsSafetyAction } from './fallback/safety';
export interface ChatMessage { role: 'user' | 'assistant'; content: string; id?: string; delivery?: 'pending' | 'received'; }
export interface UseCompanionOptions { onError?: (err: string) => void; }
export function useCompanion(options: UseCompanionOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false), [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null), [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [safetyAction, setSafetyAction] = useState(false), [pendingCount, setPendingCount] = useState(0);
  const scope = useRef<string | null>(null), busy = useRef(false), generation = useRef(0);
  const memoryPending = useRef(new Map<string, PendingMessage>());
  const onError = useRef(options.onError); onError.current = options.onError;
  const identify = useCallback(async () => {
    const r = await fetch('/api/companion/identity', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    const data = await r.json();
    if (!r.ok || !data.success) throw new Error('identity_unavailable');
    if (scope.current && scope.current !== data.scope) {
      memoryPending.current.clear(); setMessages([]); setPendingCount(0); scope.current = data.scope;
      throw new Error('account_changed');
    }
    scope.current = data.scope as string;
    return data.scope as string;
  }, []);
  useEffect(() => {
    const current = ++generation.current;
    let cancelled = false;
    (async () => {
      try {
        const account = await identify();
        let pending: PendingMessage[] = [];
        try { pending = await pendingMessages(account); } catch { setStatusNotice('เปิดข้อความที่เก็บไว้ในเครื่องไม่ได้'); }
        pending.forEach(m => memoryPending.current.set(m.id, m));
        if (!cancelled && generation.current === current) {
          setMessages(pending.map(m => ({role:'user' as const,content:m.text,id:m.id,delivery:'pending' as const})));
          setPendingCount(pending.length);
        }
        const res = await fetch('/api/companion/history', { signal: AbortSignal.timeout(5000) });
        const json = await res.json();
        if (!cancelled && generation.current === current) {
          setMessages([...(json.success ? json.data.messages : []), ...pending.map(m => ({ role: 'user' as const, content: m.text, id: m.id, delivery: 'pending' as const }))]);
          setPendingCount(pending.length);
          if (json.data?.contextState === 'missing') setStatusNotice('เปิดบทสนทนาก่อนหน้าได้ไม่ครบ แต่เริ่มพิมพ์ต่อได้');
        }
      } catch {
        if (!cancelled) setStatusNotice('ยังเชื่อมต่อเพื่อเปิดบทสนทนาไม่ได้ พิมพ์ไว้ในหน้านี้ได้');
      } finally { if (!cancelled) setLoadingHistory(false); }
    })();
    return () => { cancelled = true; };
  }, [identify]);
  const deliver = useCallback(async (item: PendingMessage): Promise<string | null> => {
    let account: string;
    try {
      account = await identify(); // never flush one account's queue into another session
      try { await queueMessage(account, item); }
      catch { setStatusNotice('ข้อความอยู่ในหน้านี้เท่านั้น ยังเก็บลงเครื่องไม่ได้ โปรดอย่าปิดหน้านี้'); }
      const res = await fetch('/api/companion/chat', { method: 'POST', signal: AbortSignal.timeout(60000),
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: item.text, messageId: item.id, accountScope: account }) });
      const json = await res.json();
      if (!res.ok || !json.success || typeof json.data?.reply !== 'string' || json.data.messageId !== item.id) throw new Error('delivery_unconfirmed');
      setMessages(prev => [...prev.filter(m => m.id !== `${item.id}-reply`).map(m => m.id === item.id ? { ...m, delivery: 'received' as const } : m), { role: 'assistant', content: json.data.reply, id: `${item.id}-reply` }]);
      setSafetyAction(Boolean(json.data.safetyAction));
      setStatusNotice(json.data.statusNotice ?? (json.data.mode !== 'normal' ? 'ตอนนี้ตอบได้จำกัดกว่าปกติ' : null));
      if (json.data.persistenceState === 'failed') {
        setStatusNotice('Hydra ตอบกลับแล้ว แต่ยังเก็บบทสนทนาไม่สำเร็จ สำเนาในหน้านี้ยังรอส่งซ้ำ');
        return json.data.reply;
      }
      memoryPending.current.delete(item.id); setPendingCount(memoryPending.current.size);
      try { await removePending(account, item.id); }
      catch { setStatusNotice('ได้รับคำตอบแล้ว แต่ล้างสำเนาที่รอส่งในเครื่องไม่สำเร็จ'); }
      return json.data.reply;
    } catch {
      const msg = 'ยังยืนยันไม่ได้ว่า Hydra รับข้อความนี้แล้ว ข้อความยังรอส่งอยู่';
      setError(msg); onError.current?.(msg); return null;
    }
  }, [identify]);
  const retryPending = useCallback(async () => {
    if (busy.current) return;
    busy.current = true; setSending(true); setError(null);
    try {
      const account = await identify();
      const stored = await pendingMessages(account).catch(() => []);
      stored.forEach(item => {
        if (!memoryPending.current.has(item.id)) {
          memoryPending.current.set(item.id,item);
          setMessages(prev => prev.some(m=>m.id===item.id) ? prev : [...prev,{role:'user',content:item.text,id:item.id,delivery:'pending'}]);
        }
      });
      for (const item of memoryPending.current.values()) if (await deliver(item) === null) break;
    } catch { setError('ยังเชื่อมต่อเพื่อส่งข้อความที่ค้างไม่ได้'); }
    finally { busy.current = false; setSending(false); }
  }, [deliver, identify]);
  useEffect(() => {
    const retry = () => { void retryPending(); };
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [retryPending]);
  const sendMessage = useCallback(async (text: string): Promise<string | null> => {
    if (busy.current || !text.trim() || text.length > 4000) return null;
    busy.current = true; setSending(true); setError(null); generation.current++;
    const item = { id: crypto.randomUUID(), text, createdAt: Date.now() };
    memoryPending.current.set(item.id, item); setPendingCount(memoryPending.current.size);
    setMessages(prev => [...prev, { role: 'user', content: text, id: item.id, delivery: 'pending' }]);
    setSafetyAction(needsSafetyAction(detectLocalSafety(text)));
    try {
      if (scope.current) {
        try { await queueMessage(scope.current, item); }
        catch { setStatusNotice('ข้อความอยู่ในหน้านี้เท่านั้น ยังเก็บลงเครื่องไม่สำเร็จ โปรดอย่าปิดหน้านี้'); }
      } else setStatusNotice('ข้อความอยู่ในหน้านี้เท่านั้น ยังเก็บลงเครื่องไม่ได้จนกว่าจะยืนยันบัญชีสำเร็จ');
      return await deliver(item);
    } finally { busy.current = false; setSending(false); }
  }, [deliver]);
  return { messages, sendMessage, retryPending, sending, error, loadingHistory, statusNotice, safetyAction, pendingCount };
}
