// Bounds waiting. A timed-out mutation may still complete; use idempotent IDs and
// never translate timeout into a claim that a downstream side effect did not happen.
export async function withDeadline<T>(work: Promise<T>, ms = 3000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([work, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('deadline_exceeded')), ms);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
