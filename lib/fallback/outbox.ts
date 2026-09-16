// Single-host durable spool, outside the primary DB. Mount on persistent storage.
// AES-256-GCM key is independent of patient DEKs, which may be unavailable with DB.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
export type OutboxJob =
  | { kind: 'review'; patientId: string; messageId: string; source: 'chat_risk_engine' | 'screening_8q'; reason: string; riskLevel: string }
  | { kind: 'turn'; patientId: string; messageId: string; message: string; reply: string; metadata?: unknown }
  | { kind: 'screening'; patientId: string; messageId: string; response: unknown };
export function eventKey(patientId: string, messageId: string, kind: string): string {
  return createHash('sha256').update(JSON.stringify([patientId, messageId, kind])).digest('hex');
}
function config() {
  const dir = process.env.HYDRA_OUTBOX_DIR;
  const hex = process.env.HYDRA_OUTBOX_KEY;
  if (!dir || !path.isAbsolute(dir) || !hex || !/^[a-f\d]{64}$/i.test(hex)) throw new Error('outbox_not_configured');
  return { dir, key: Buffer.from(hex, 'hex') };
}
async function syncDirectory(dir: string) {
  const handle = await fs.open(dir, 'r');
  try { await handle.sync(); } finally { await handle.close(); }
}
export async function enqueue(job: OutboxJob): Promise<void> {
  const { dir, key } = config();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const id = eventKey(job.patientId, job.messageId, job.kind);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(id));
  const body = Buffer.concat([cipher.update(JSON.stringify(job), 'utf8'), cipher.final()]);
  const payload = JSON.stringify({ v: 1, iv: iv.toString('hex'), tag: cipher.getAuthTag().toString('hex'), body: body.toString('base64') });
  const temp = path.join(dir, `.${id}-${randomBytes(8).toString('hex')}.tmp`);
  const handle = await fs.open(temp, 'wx', 0o600);
  try { await handle.writeFile(payload); await handle.sync(); } finally { await handle.close(); }
  try {
    // link publishes a fully written file exclusively; never overwrite a queued job.
    await fs.link(temp, path.join(dir, `${id}.json`));
    await syncDirectory(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const old = await readJob(id);
    if (JSON.stringify(old) !== JSON.stringify(job)) throw new Error('outbox_id_conflict');
  } finally { await fs.unlink(temp).catch(() => undefined); }
}
async function readJob(id: string): Promise<OutboxJob> {
  const { dir, key } = config();
  const data = JSON.parse(await fs.readFile(path.join(dir, `${id}.json`), 'utf8'));
  if (data.v !== 1) throw new Error('outbox_version');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(data.iv, 'hex'));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(Buffer.from(data.tag, 'hex'));
  const job = JSON.parse(Buffer.concat([decipher.update(Buffer.from(data.body, 'base64')), decipher.final()]).toString('utf8')) as OutboxJob;
  if (eventKey(job.patientId, job.messageId, job.kind) !== id) throw new Error('outbox_identity');
  return job;
}
export async function drainOutbox(deliver: (job: OutboxJob) => Promise<void>, limit = 100) {
  const { dir } = config();
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  const names = (await fs.readdir(dir)).filter(n => /^[a-f\d]{64}\.json$/.test(n)).sort();
  let delivered = 0, failed = 0;
  for (const name of names.slice(0, limit)) {
    const id = name.slice(0, -5), lock = path.join(dir, `${id}.lock`);
    try { await fs.mkdir(lock); } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') { failed++; continue; }
      throw e;
    }
    try {
      await deliver(await readJob(id)); // delivery MUST be idempotent; crash may replay.
      await fs.unlink(path.join(dir, name)); await syncDirectory(dir); delivered++;
    } catch { failed++; } // Do not log sensitive payloads or provider exception bodies.
    finally { await fs.rmdir(lock).catch(() => undefined); }
  }
  return { delivered, failed, remaining: (await fs.readdir(dir)).filter(n => n.endsWith('.json')).length };
}
