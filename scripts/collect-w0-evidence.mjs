// Run from a committed, clean disposable checkout. Writes only synthetic DB/outbox
// and structured evidence to a fresh OS temp directory. Does not tag or push.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const args = process.argv.slice(2);
if (args.some(x => !['--inspect', '--live'].includes(x))) {
  console.error('Usage: node scripts/collect-w0-evidence.mjs [--inspect] [--live]');
  process.exit(1);
}
const inspect = args.includes('--inspect'), live = args.includes('--live');
const cwd = process.cwd();
const run = (cmd, argv, env=process.env, timeout=300000) => spawnSync(cmd, argv, {
  cwd, env, encoding:'utf8', timeout, maxBuffer:16*1024*1024,
});
function git(argv) {
  const r=run('git',argv);
  if(r.status!==0 || r.error) throw new Error('Git metadata unavailable; no baseline claim.');
  return r.stdout.trim();
}
function snapshot() {
  const paths=git(['ls-files','-z']).split('\0').filter(Boolean).sort();
  const h=createHash('sha256');
  for(const p of paths) {
    h.update(p);h.update('\0');h.update(readFileSync(resolve(cwd,p)));h.update('\0');
  }
  return {commit:git(['rev-parse','HEAD']), trackedSourceSha256:h.digest('hex'),
    lockfileSha256:createHash('sha256').update(readFileSync('package-lock.json')).digest('hex'),
    clean:git(['status','--porcelain','--untracked-files=all'])===''};
}
async function main() {
  if(realpathSync(git(['rev-parse','--show-toplevel']))!==realpathSync(cwd))
    throw new Error('Run at repository root.');
  const before=snapshot();
  if(!before.clean) throw new Error('Commit or account for working changes before baseline evidence; checkout must be clean.');
  const npm=run('npm',['--version']);
  if(npm.status!==0 || npm.error) throw new Error('npm unavailable.');
  const metadata={at:new Date().toISOString(),mode:inspect?'inspect':'verification',
    node:process.version,npm:npm.stdout.trim(),sourceBefore:before,
    tagsAtHead:git(['tag','--points-at','HEAD']).split('\n').filter(Boolean),
    liveRequested:live,w0Status:'OPEN',gates:[],
    pending:['production startup environment','Doctor UI / accepted gap','human risk decisions','tag/push evidence',...(live?['human synthetic summary review']:['Gemini live'])]};
  if(inspect) {console.log(JSON.stringify(metadata,null,2));return;}
  const out=mkdtempSync(join(tmpdir(),'hydra-w0-'));
  function gate(name,cmd,argv,env) {
    const start=Date.now(),r=run(cmd,argv,env);
    const output=(r.stdout||'')+(r.stderr||'');
    const failMarkers=(output.match(/\[FAIL\]|^FAIL\b/gm)||[]).length;
    const pass=r.status===0 && !r.error && failMarkers===0;
    metadata.gates.push({name,exitCode:r.status,errorCode:r.error?.code??null,failMarkers,pass,durationMs:Date.now()-start});
    writeFileSync(join(out,'w0-evidence.json'),JSON.stringify(metadata,null,2));
    console.log(`${pass?'PASS':'FAIL'} ${name}`);
    if(!pass) throw new Error(`Gate failed: ${name}. Raw process output intentionally not retained.`);
  }
  console.log(`Evidence directory: ${out}`);
  try {
    gate('install','npm',['ci'],{...process.env,NODE_ENV:'development'});
    const envModule=await import(pathToFileURL(resolve(cwd,'node_modules/@next/env/dist/index.js')).href);
    (envModule.default||envModule).loadEnvConfig(cwd,true);
    const env={...process.env,NODE_ENV:'test',DEMO_AUTH_ENABLED:'false',
      DATABASE_URL:`file:${join(out,'synthetic.db')}`,
      PATIENT_DATA_MASTER_KEY:randomBytes(32).toString('hex'),
      SESSION_SECRET:randomBytes(32).toString('hex'),
      HYDRA_OUTBOX_DIR:join(out,'synthetic-outbox'),HYDRA_OUTBOX_KEY:randomBytes(32).toString('hex')};
    const model=env.GEMINI_MODEL||'gemini-3.8-flash';
    if(!/^[a-zA-Z0-9._/-]{1,128}$/.test(model)) throw new Error('Invalid model identifier.');
    metadata.environment={syntheticDatabase:true,temporaryKeys:true,provider:'Google',
      effectiveGeminiModel:model,geminiKeyPresent:Boolean(env.GEMINI_API_KEY),
      buildNodeEnv:'production',buildDemoAuthEnabled:false,
      deploymentEnvironmentVerified:false};
    if(live && !env.GEMINI_API_KEY) throw new Error('Gemini live requested but API key is missing.');
    const gates=['db:migrate','db:seed','test:db','test:patient-encryption',
      'test:clinical-data-encryption','test:auth-and-security-queue','test:clinician-authorization',
      'test:fallback','test:clinical','test:audit','test:fallback-integration','test:fallback-storage',
      'test:clinical-summary-contract',...(live?['test:clinical-summary-gemini']:[]),'typecheck','build'];
    for(const name of gates) gate(name,'npm',['run',name],name==='build'?{...env,NODE_ENV:'production'}:env);
    metadata.sourceAfter=snapshot();
    metadata.sourceStable=metadata.sourceAfter.clean &&
      metadata.sourceAfter.commit===before.commit && metadata.sourceAfter.trackedSourceSha256===before.trackedSourceSha256;
    if(!metadata.sourceStable) throw new Error('Source changed during verification; reconcile and rerun.');
    metadata.commandGatesPassed=true;
  } catch(e) {
    metadata.commandGatesPassed=false;
    throw e;
  } finally {
    metadata.finishedAt=new Date().toISOString();
    writeFileSync(join(out,'w0-evidence.json'),JSON.stringify(metadata,null,2));
  }
  console.log('Command gates passed. W0 remains OPEN pending separate human/live/UI/Git evidence.');
  console.log('Share only w0-evidence.json; the directory also contains synthetic database/outbox files.');
}
main().catch(e=>{console.error(`FAIL ${e.message}`);process.exitCode=1;});
