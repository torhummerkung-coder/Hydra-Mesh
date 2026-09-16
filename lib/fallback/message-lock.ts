// Single-process serialization for duplicate in-flight IDs. Durable DB keys still
// prevent duplicate rows across workers. Shared deployment needs distributed leases.
const running = new Map<string, Promise<void>>();
export async function serializeMessage<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = running.get(key) ?? Promise.resolve();
  let release!: () => void;
  const finished = new Promise<void>(resolve => { release = resolve; });
  const tail = previous.then(() => finished);
  running.set(key, tail);
  await previous;
  try { return await fn(); }
  finally { release(); if (running.get(key) === tail) running.delete(key); }
}
