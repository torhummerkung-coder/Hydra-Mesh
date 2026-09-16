import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import 'fake-indexeddb/auto';
import { enqueue, drainOutbox, eventKey, type OutboxJob } from '../lib/fallback/outbox';
import { queueMessage, pendingMessages, removePending } from '../lib/client/outbox';
async function main() {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'hydra-spool-test-'));
  process.env.HYDRA_OUTBOX_DIR=dir;process.env.HYDRA_OUTBOX_KEY=randomBytes(32).toString('hex');
  const job:OutboxJob={kind:'review',patientId:'test-patient',messageId:'test-message',source:'chat_risk_engine',reason:'PRIVATE_TEXT',riskLevel:'high'};
  try {
    await Promise.all([enqueue(job),enqueue(job)]);
    const files=await fs.readdir(dir);assert.equal(files.length,1);
    const bytes=await fs.readFile(path.join(dir,files[0]),'utf8'); assert(!bytes.includes('PRIVATE_TEXT'));assert(!bytes.includes('test-patient'));
    let result=await drainOutbox(async()=>{throw new Error('db unavailable');});assert.equal(result.remaining,1);
    result=await drainOutbox(async received=>assert.deepEqual(received,job));assert.equal(result.delivered,1);assert.equal(result.remaining,0);
    await enqueue(job);await assert.rejects(enqueue({...job,reason:'different'}));
    const filename=path.join(dir,`${eventKey(job.patientId,job.messageId,job.kind)}.json`);
    const corrupt=JSON.parse(await fs.readFile(filename,'utf8'));corrupt.tag='0'.repeat(32);await fs.writeFile(filename,JSON.stringify(corrupt));
    result=await drainOutbox(async()=>{throw new Error('must not deliver corrupt payload');});assert.equal(result.failed,1);assert.equal(result.remaining,1);
    console.log('PASS durable spool dedupe, encryption, retry, conflict, tamper rejection');
    const message={id:'offline-message',text:'PRIVATE_OFFLINE',createdAt:1};
    await queueMessage('account-A',message);assert.deepEqual(await pendingMessages('account-A'),[message]);
    assert.deepEqual(await pendingMessages('account-B'),[]);
    await queueMessage('account-A',message);assert.equal((await pendingMessages('account-A')).length,1);
    await removePending('account-A',message.id);assert.equal((await pendingMessages('account-A')).length,0);
    console.log('PASS IndexedDB encrypted roundtrip, account isolation, dedupe, removal');
  } finally {await fs.rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
