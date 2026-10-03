// Run after npm ci, using a disposable synthetic database. Never run against patient data.
import nextEnv from '@next/env';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
nextEnv.loadEnvConfig(process.cwd(), true);
const live = process.argv.includes('--live');
const env = { ...process.env, NODE_ENV: 'test', DEMO_AUTH_ENABLED: 'false' };
const gates = ['db:migrate', 'db:seed', 'test:db', 'test:patient-encryption',
  'test:clinical-data-encryption', 'test:auth-and-security-queue',
  'test:clinician-authorization', 'test:fallback', 'test:clinical', 'test:audit',
  'test:fallback-integration', 'test:fallback-storage', 'test:clinical-summary-contract',
  ...(live ? ['test:clinical-summary-gemini'] : []), 'typecheck', 'build'];
const results = [];
for (const gate of gates) {
  const start = Date.now();
  const run = spawnSync('npm', ['run', gate], {
    env: gate === 'build' ? { ...env, NODE_ENV: 'production' } : env,
    encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 300000,
  });
  const output = (run.stdout || '') + (run.stderr || '');
  const failMarkers = (output.match(/\[FAIL\]|^FAIL\b/gm) || []).length;
  const pass = run.status === 0 && !run.error && failMarkers === 0;
  results.push({gate, exitCode:run.status, errorCode:run.error?.code ?? null, failMarkers, pass, durationMs:Date.now()-start});
  // Do not write seed output, API responses, patient text or credentials into evidence.
  console.log(`${pass ? 'PASS' : 'FAIL'} ${gate} (exit ${run.status}, failure markers ${failMarkers})`);
  if (!pass) break;
}
mkdirSync('evidence', { recursive: true });
writeFileSync('evidence/w0-local-results.json', JSON.stringify({
  at:new Date().toISOString(), liveRequested:live, results,
  scope:'Local command gates only. Git, manual UI, model selection and human risk decisions are separate.',
}, null, 2));
process.exitCode = results.length === gates.length && results.every(r=>r.pass) ? 0 : 1;
