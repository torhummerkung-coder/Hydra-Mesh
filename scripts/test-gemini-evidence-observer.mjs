// Offline regression only. Uses synthetic child processes and mock fetch; no API calls.
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {classifyGeminiError,validGeminiCredential} from './observe-gemini-evidence.mjs';
assert.equal(classifyGeminiError('GEMINI_API_KEY ไม่ได้ตั้งค่า'),'KEY_MISSING');
assert.equal(classifyGeminiError('GEMINI_API_KEY header value contains invalid character PRIVATE_KEY_CANARY'),'HEADER_VALUE_INVALID');
assert.equal(classifyGeminiError('Other GEMINI_API_KEY error'),'UNCLASSIFIED_TEST_ERROR');
assert.equal(classifyGeminiError('Clinical summary agent call failed: 503'),'HTTP_503');
assert(validGeminiCredential('PRIVATE_KEY_CANARY'));
for(const key of ['', 'key with space', 'key\nvalue', 'key\x1bvalue', 'keyก'])assert.equal(validGeminiCredential(key),false);
console.log('PASS exact missing-key classifier and malformed credential preflight');
const observer=fileURLToPath(new URL('./observe-gemini-evidence.mjs',import.meta.url));
for(const mode of ['stop','max-tokens','http-503','key-missing','key-format','network','unknown-error']){
 const dir=mkdtempSync(join(tmpdir(),'hydra-observer-test-'));
 try{
  const script=join(dir,'test-clinical-summary-gemini.ts'),report=join(dir,'report.json');
  writeFileSync(script,`const mode=${JSON.stringify(mode)};
let calls=0;
globalThis.fetch=async()=>{
 calls++;
 if(mode==='network')throw Object.assign(new TypeError('fetch failed PRIVATE_ERROR_CANARY'),{cause:{code:'ENOTFOUND'}});
 if(mode==='unknown-error')throw new TypeError('Other GEMINI_API_KEY PRIVATE_ERROR_CANARY');
 if(mode==='http-503')return Response.json({error:{code:503,status:'UNAVAILABLE',message:'PRIVATE_ERROR_CANARY',details:[{reason:'PRIVATE_KEY_CANARY'}]}},{status:503});
 return Response.json({candidates:[{finishReason:mode==='max-tokens'?'MAX_TOKENS':'STOP',content:{parts:[{text:'PRIVATE_SUMMARY_CANARY'}]}}]});
};
(async()=>{
 await import(${JSON.stringify('file://'+observer)});
 if(!process.env.GEMINI_API_KEY){console.log('[FAIL] ไม่มี GEMINI_API_KEY ใน environment');process.exitCode=1;return;}
 try{
 const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent',{method:'POST',headers:{'x-goog-api-key':process.env.GEMINI_API_KEY},body:JSON.stringify({generationConfig:{maxOutputTokens:4096}})});
 if(!r.ok)throw Error('Clinical summary agent call failed: '+r.status);
 const b=await r.json();if(b.candidates[0].finishReason!=='STOP')throw Error('Gemini clinical summary did not finish normally');
 for(let i=0;i<3;i++)console.log('[PASS] synthetic assertion');
 console.log('PRIVATE_SUMMARY_CANARY');
 }catch(e){console.error('[FAIL]',e);process.exitCode=1;}
 if(mode==='key-format'&&calls!==0)process.exitCode=99;
})();`);
  const env={...process.env,GEMINI_API_KEY:mode==='key-missing'?'':mode==='key-format'?'PRIVATE_KEY_CANARY\x1b[200~':'PRIVATE_KEY_CANARY',HYDRA_G02_MODE:mode,HYDRA_G02_REPORT:report};
  const child=spawnSync(process.execPath,[script],{env,encoding:'utf8',timeout:10000});
  assert.equal(child.status,mode==='stop'?0:1,mode);
  const raw=readFileSync(report,'utf8'),r=JSON.parse(raw);
  for(const canary of ['PRIVATE_KEY_CANARY','PRIVATE_SUMMARY_CANARY','PRIVATE_ERROR_CANARY'])assert(!(raw+child.stdout+child.stderr).includes(canary),mode+' leaked a canary');
  if(mode==='stop'){assert.equal(r.requests[0].http,200);assert.equal(r.requests[0].finishReason,'STOP');assert.equal(r.checks.pass,3);}
  if(mode==='max-tokens')assert(r.errors.includes('NON_STOP_FINISH'));
  if(mode==='http-503'){assert.equal(r.requests[0].http,503);assert.equal(r.requests[0].apiErrorStatus,'UNAVAILABLE');assert.deepEqual(r.requests[0].apiErrorReasons,[]);assert(r.errors.includes('HTTP_503'));}
  if(mode==='key-missing'){assert.equal(r.requests.length,0);assert(r.errors.includes('KEY_MISSING'));}
  if(mode==='key-format'){assert.equal(r.requests[0].credentialFormatValid,false);assert(r.errors.includes('KEY_FORMAT_INVALID'));assert(!r.errors.includes('KEY_MISSING'));}
  if(mode==='network')assert.equal(r.requests[0].fetchCauseCode,'ENOTFOUND');
  if(mode==='unknown-error'){assert(r.errors.includes('UNCLASSIFIED_TEST_ERROR'));assert(!r.errors.includes('KEY_MISSING'));}
  console.log('PASS observer '+mode+' metadata, exit status and privacy canaries');
 }finally{rmSync(dir,{recursive:true,force:true});}
}
