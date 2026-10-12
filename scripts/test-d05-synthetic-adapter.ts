/**
 * Offline adapter contract checks; deliberately no repository/network/clinical access.
 * Run: node --import tsx scripts/test-d05-synthetic-adapter.ts
 */
import assert from "node:assert/strict";
import { D05RunnerClient, D05AdmissionError, d05RunnerFromEnv } from "../lib/d05/synthetic-runner-client";

const key = "synthetic-runner-key-over-thirty-two-characters";
function client(url = "http://127.0.0.1:8765") {
  return new D05RunnerClient({ gatewayUrl: url, runnerActor: "runner-a", runnerApiKey: key });
}
let passed = 0;
async function check(name: string, run: () => void | Promise<void>) {
  await run();
  passed++;
  console.log("PASS " + name);
}

const originalFetch = globalThis.fetch;
const originalEnabled = process.env.HYDRA_D05_SYNTHETIC_ENABLED;
const originalNodeEnv = process.env.NODE_ENV;
try {
  await check("refuses remote gateway even with HTTPS", () => {
    assert.throws(() => client("https://example.com"), /loopback/);
    assert.throws(() => client("http://192.0.2.1:8765"), /loopback/);
    assert.throws(() => client("http://127.0.0.1:8765/path"), /loopback/);
  });
  await check("requires individual credential", () => {
    assert.throws(() => new D05RunnerClient({
      gatewayUrl: "http://127.0.0.1:8765", runnerActor: "runner-a", runnerApiKey: "short"
    }), /too short/);
  });
  await check("explicit opt-in required", () => {
    delete process.env.HYDRA_D05_SYNTHETIC_ENABLED;
    assert.throws(() => d05RunnerFromEnv(), /disabled/);
  });
  await check("production rejects synthetic integration", () => {
    process.env.HYDRA_D05_SYNTHETIC_ENABLED = "true";
    process.env.NODE_ENV = "production";
    assert.throws(() => d05RunnerFromEnv(), /production/);
  });
  process.env.NODE_ENV = "test";
  await check("admit binds actor and prevents silent auth bypass", async () => {
    let seen: unknown;
    globalThis.fetch = (async (_url: unknown, options: RequestInit) => {
      seen = JSON.parse(String(options.body));
      assert.equal((options.headers as Record<string,string>)["x-api-key"], key);
      return new Response(JSON.stringify({ attempt_id: "synthetic-attempt" }), {status: 200});
    }) as typeof fetch;
    const result = await client().admit<{attempt_id:string}>({
      case_id: "A", environment: "isolated", operation: "test",
      intent_digest: "digest", grant_id: "synthetic-grant", idempotency_key: "k1",severity: "MINOR"
    });
    assert.equal(result.attempt_id, "synthetic-attempt");
    assert.equal((seen as {actor:string}).actor, "runner-a");
  });
  await check("gateway rejection fails closed", async () => {
    globalThis.fetch = (async () => new Response("sensitive server reply", {status: 403})) as typeof fetch;
    await assert.rejects(client().dispatch({attempt_id: "A", environment:"isolated",operation:"test"}),
      (e: unknown) => e instanceof D05AdmissionError && e.status === 403 && !e.message.includes("sensitive"));
  });
  await check("network ambiguity becomes HOLD, never auto-refund", async () => {
    globalThis.fetch = (async () => { throw new Error("network"); }) as typeof fetch;
    await assert.rejects(client().dispatch({attempt_id: "A",environment:"isolated",operation:"test"}),
      (e: unknown) => e instanceof D05AdmissionError && e.code === "UNKNOWN_REMOTE_STATE_HOLD");
  });
  await check("START requires actual evidence digest", async () => {
    let called = false;
    globalThis.fetch = (async () => {called=true;return new Response("{}");}) as typeof fetch;
    assert.throws(() => client().start({attempt_id:"A",single_use_token:"synthetic",receipt_sha256:"fake"}), /Invalid START/);
    assert.equal(called,false);
  });
  await check("finish matches exact gateway outcomes", async () => {
    let seen: unknown;
    globalThis.fetch = (async (_url: unknown, options: RequestInit) => {
      seen=JSON.parse(String(options.body));
      return new Response("{}",{status:200});
    }) as typeof fetch;
    await client().finish({attempt_id:"A",outcome:"FAIL"});
    assert.equal((seen as {outcome:string}).outcome,"FAIL");
  });
} finally {
  globalThis.fetch = originalFetch;
  if (originalEnabled === undefined) delete process.env.HYDRA_D05_SYNTHETIC_ENABLED;
  else process.env.HYDRA_D05_SYNTHETIC_ENABLED = originalEnabled;
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
}
console.log("D05 SYNTHETIC ADAPTER " + passed + "/" + passed + " PASS (offline mocked; not runtime enforcement)");
