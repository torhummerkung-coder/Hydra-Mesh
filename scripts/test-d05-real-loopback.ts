/**
 * Real loopback cross-language D05 contract test.
 * Runs only with the separately delivered v1.0.40 Python prototype unpacked
 * into HYDRA_D05_SOURCE_ROOT. Synthetic cases and temporary keys only.
 * No actual clinical or coding-task executions are started by this harness.
 */
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { D05RunnerClient } from "../lib/d05/synthetic-runner-client";

const source = process.env.HYDRA_D05_SOURCE_ROOT;
if (!source) throw Error("HYDRA_D05_SOURCE_ROOT is required; no implicit downloads.");
if (process.env.NODE_ENV === "production") throw Error("Refusing production");
const H = (value: string) => createHash("sha256").update(value).digest("hex");
const K = () => randomBytes(48).toString("hex");
const keys = { admin: K(), audit: K(), runner1: K(), runner2: K() };
const actor1 = "synthetic-ts-runner-1", actor2 = "synthetic-ts-runner-2";
const group = "SG-D05-TS-INTEGRATION";
const outcome = { checks: 0, passed: 0, failed: [] as string[] };
async function check(name: string, work: () => Promise<void>) {
  outcome.checks++;
  try { await work(); outcome.passed++; console.log("PASS " + name); }
  catch (e) { outcome.failed.push(name); console.error("FAIL " + name, e); }
}
async function freePort(): Promise<number> {
  return new Promise((resolve,reject) => {
    const server=createServer();
    server.once("error",reject);
    server.listen(0,"127.0.0.1",() => {
      const address=server.address();
      if (!address || typeof address==="string") {server.close();reject(Error("No port"));return;}
      const p=address.port;
      server.close((err)=>err?reject(err):resolve(p));
    });
  });
}
const temp=await mkdtemp(join(tmpdir(),"hydra-d05-real-ts-"));
let child: ChildProcess|undefined;
try {
  const port=await freePort();
  const base="http://127.0.0.1:"+port;
  const env={...process.env,
    HYDRA_D05_BIND:"127.0.0.1", HYDRA_D05_PORT:String(port),
    HYDRA_D05_DB:join(temp,"d05.sqlite"),
    HYDRA_D05_ADMIN_KEY:keys.admin,
    HYDRA_D05_AUDIT_KEY:keys.audit,
    HYDRA_D05_RUNNER_KEYS_JSON:JSON.stringify({[actor1]:keys.runner1,[actor2]:keys.runner2}),
    PYTHONPATH:source,
  };
  child=spawn(process.env.HYDRA_D05_PYTHON ?? "python3",["-m","hydra_d05.api"],{
    cwd:source,env,stdio:"ignore"
  });
  async function request<T>(path:string,method="GET",body?:object,key?:string):Promise<T> {
    const response=await fetch(base+path,{
      method,cache:"no-store",redirect:"error",
      headers:{"content-type":"application/json",...(key?{"x-api-key":key}:{})},
      ...(body?{body:JSON.stringify(body)}:{}),
      signal:AbortSignal.timeout(4000),
    });
    if (!response.ok) throw Error(path+" status "+response.status);
    return await response.json() as T;
  }
  let ready=false;
  for(let i=0;i<80;i++) {
    if(child.exitCode!==null) throw Error("Gateway exited before readiness");
    try {
      const info=await request<{production_ready:boolean}>("/health");
      ready=info.production_ready===false;
      if(ready)break;
    }catch {/* wait */}
    await new Promise(resolve=>setTimeout(resolve,50));
  }
  assert.ok(ready,"Gateway did not become ready");
  const runner=new D05RunnerClient({gatewayUrl:base,runnerActor:actor1,runnerApiKey:keys.runner1});
  const other=new D05RunnerClient({gatewayUrl:base,runnerActor:actor2,runnerApiKey:keys.runner2});
  const caseA="D05-CASE-A",caseB="D05-CASE-B";
  const intent=H("isolated-adapter-test-intent");
  const operation="synthetic-test";
  const environment="isolated";
  const grantA="OWNER-TEST-GRANT-A", grantB="OWNER-TEST-GRANT-B";
  async function register(c:string,fp:string) {
    return request("/admin/cases","POST",{
      case_id:c,group_id:group,fingerprint:H(fp),prereg_digest:H("prereg-"+c)
    },keys.admin);
  }
  async function grant(id:string,c:string) {
    return request("/admin/grants","POST",{
      grant_id:id,case_id:c,actor:actor1,environment,operation,severity:"MINOR",
      intent_digest:intent,ttl_seconds:300
    },keys.admin);
  }
  await check("register separate canonical A and B", async()=>{
    await register(caseA,"unique-a");await register(caseB,"unique-b");
    await grant(grantA,caseA);await grant(grantB,caseB);
  });
  const makeAdmit=(id:string,c:string,g:string)=>({
    case_id:c,environment,operation,intent_digest:intent,grant_id:g,
    idempotency_key:id,severity:"MINOR" as const
  });
  let a:{attempt_id:string;kind:string}|undefined;
  await check("A first attempt is FIRST",async()=>{
    a=await runner.admit<{attempt_id:string;kind:string}>(makeAdmit("a-first",caseA,grantA));
    assert.equal(a.kind,"FIRST");
  });
  await check("same key is idempotent",async()=>{
    const same=await runner.admit<{attempt_id:string;idempotent_replay:boolean}>(makeAdmit("a-first",caseA,grantA));
    assert.equal(same.attempt_id,a!.attempt_id);
    assert.equal(same.idempotent_replay,true);
  });
  await check("cross-runner dispatch forbidden",async()=>{
    await assert.rejects(other.dispatch({attempt_id:a!.attempt_id,environment,operation}));
  });
  await check("dispatch + synthetic evidence + FAIL",async()=>{
    const d=await runner.dispatch<{single_use_token:string}>({attempt_id:a!.attempt_id,environment,operation});
    assert.ok(d.single_use_token);
    const st=await runner.start<{state:string}>({
      attempt_id:a!.attempt_id,single_use_token:d.single_use_token,
      receipt_sha256:H("synthetic-evidence-a")
    });
    assert.equal(st.state,"STARTED");
    const fin=await runner.finish<{outcome:string}>({attempt_id:a!.attempt_id,outcome:"FAIL"});
    assert.equal(fin.outcome,"FAIL");
  });
  await check("A alias retry is charged",async()=>{
    const retry=await runner.admit<{kind:string}>(makeAdmit("a-alias-1",caseA,grantA));
    assert.equal(retry.kind,"RETRY");
  });
  await check("B independent first in shared group is free",async()=>{
    const b=await runner.admit<{kind:string}>(makeAdmit("b-first",caseB,grantB));
    assert.equal(b.kind,"FIRST");
  });
  await check("unknown reservation stays held",async()=>{
    const retry=await runner.admit<{attempt_id:string}>(makeAdmit("a-alias-2",caseA,grantA));
    const state=await runner.unknown<{state:string}>({attempt_id:retry.attempt_id,reason_code:"SYNTHETIC_UNCERTAINTY"});
    assert.equal(state.state,"UNKNOWN");
  });
  await check("shared count and audit chain",async()=>{
    const snap=await request<{
      first_started:number;
      retry_minor_reserved_or_consumed:number;
      unknown_attempts:number;
    }>("/audit/groups/"+group,"GET",undefined,keys.audit);
    assert.equal(snap.first_started,1);
    assert.equal(snap.retry_minor_reserved_or_consumed,2);
    assert.equal(snap.unknown_attempts,1);
    const audit=await request<{chain_valid:boolean}>("/audit/integrity","GET",undefined,keys.audit);
    assert.equal(audit.chain_valid,true);
  });
  console.log("D05 REAL LOOPBACK SUMMARY "+JSON.stringify({...outcome,production:false,external_runner_execution:false}));
  if(outcome.failed.length) process.exitCode=1;
} finally {
  if(child && child.exitCode===null) {
    child.kill("SIGTERM");
    await Promise.race([
      new Promise<void>(resolve=>child!.once("exit",()=>resolve())),
      new Promise<void>(resolve=>setTimeout(resolve,3000)),
    ]);
    if(child.exitCode===null)child.kill("SIGKILL");
  }
  await rm(temp,{recursive:true,force:true});
}
