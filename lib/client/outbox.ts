// Browser-only. A non-extractable AES key in IndexedDB protects stored bytes,
// not a compromised origin/XSS. Decrypt only after authenticating the account.
export interface PendingMessage { id: string; text: string; createdAt: number; }
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('hydra-offline-v1', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('keys'); req.result.createObjectStore('messages'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('local_storage_unavailable'));
  });
}
async function transaction<T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(store, mode), req = action(tx.objectStore(store));
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = tx.onerror = () => reject(new Error('local_storage_failed'));
    });
  } finally { db.close(); }
}
async function keyFor(scope: string): Promise<CryptoKey> {
  const existing = await transaction<CryptoKey | undefined>('keys', 'readonly', s => s.get(scope));
  if (existing) return existing;
  const generated = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  try { await transaction('keys', 'readwrite', s => s.add(generated, scope)); return generated; }
  catch {
    const raced = await transaction<CryptoKey | undefined>('keys', 'readonly', s => s.get(scope));
    if (!raced) throw new Error('local_key_unavailable');
    return raced;
  }
}
export async function queueMessage(scope: string, message: PendingMessage): Promise<void> {
  const key = await keyFor(scope), iv = crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode(`${scope}:${message.id}`);
  const body = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad }, key, new TextEncoder().encode(JSON.stringify(message)));
  await transaction('messages', 'readwrite', s => s.put({ scope, id: message.id, iv, body }, `${scope}:${message.id}`));
}
export async function pendingMessages(scope: string): Promise<PendingMessage[]> {
  const records = await transaction<any[]>('messages', 'readonly', s => s.getAll());
  const own = records.filter(r => r.scope === scope);
  if (!own.length) return [];
  const key = await keyFor(scope);
  return (await Promise.all(own.map(async r => {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: r.iv, additionalData: new TextEncoder().encode(`${scope}:${r.id}`) }, key, r.body);
    return JSON.parse(new TextDecoder().decode(plain)) as PendingMessage;
  }))).sort((a, b) => a.createdAt - b.createdAt);
}
export async function removePending(scope: string, id: string): Promise<void> {
  await transaction('messages', 'readwrite', s => s.delete(`${scope}:${id}`));
}
