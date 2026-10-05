import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
// Metadata-only observer, active solely in the existing synthetic Gemini test.
export function validGeminiCredential(key){
 if(typeof key!=='string'||!key||!/^[\x21-\x7E]+$/.test(key))return false;
 try{new Headers({'x-goog-api-key':key});return true;}catch{return false;}
}
export function classifyGeminiError(x){
 const s=typeof x==='string'?x:'';
 if(s==='GEMINI_API_KEY ไม่ได้ตั้งค่า')return 'KEY_MISSING';
 if(s==='Gemini credential format is invalid')return 'KEY_FORMAT_INVALID';
 if(/header value|invalid character|ByteString/i.test(s))return 'HEADER_VALUE_INVALID';
 if(s.includes('did not finish normally'))return 'NON_STOP_FINISH';
 if(s.includes('empty clinical summary'))return 'EMPTY_SUMMARY';
 const m=s.match(/^Clinical summary agent call failed: (\d{3})$/);if(m)return 'HTTP_'+m[1];
 if(/timeout|timed out/i.test(s))return 'TIMEOUT';
 if(/abort/i.test(s))return 'ABORT';
 if(/json|unexpected token/i.test(s))return 'JSON_PARSE';
 if(/fetch failed/i.test(s))return 'FETCH_FAILED';
 return 'UNCLASSIFIED_TEST_ERROR';
}
if(process.env.HYDRA_G02_REPORT&&/[\/]test-clinical-summary-gemini\.ts$/.test(process.argv[1]||'')){
const report={mode:process.env.HYDRA_G02_MODE,at:new Date().toISOString(),checks:{pass:0,fail:0},requests:[],errors:[]};
const safeEnums=new Set(['STOP','MAX_TOKENS','SAFETY','RECITATION','LANGUAGE','OTHER','BLOCKLIST','PROHIBITED_CONTENT','SPII','MALFORMED_FUNCTION_CALL','UNEXPECTED_TOOL_CALL','FINISH_REASON_UNSPECIFIED','BLOCK_REASON_UNSPECIFIED','IMAGE_SAFETY','IMAGE_PROHIBITED_CONTENT','IMAGE_OTHER','NO_IMAGE','OK','CANCELLED','UNKNOWN','INVALID_ARGUMENT','DEADLINE_EXCEEDED','NOT_FOUND','ALREADY_EXISTS','PERMISSION_DENIED','UNAUTHENTICATED','RESOURCE_EXHAUSTED','FAILED_PRECONDITION','ABORTED','OUT_OF_RANGE','UNIMPLEMENTED','INTERNAL','UNAVAILABLE','DATA_LOSS','API_KEY_INVALID','API_KEY_EXPIRED','API_KEY_SERVICE_BLOCKED','API_KEY_HTTP_REFERRER_BLOCKED','API_KEY_IP_ADDRESS_BLOCKED','API_KEY_ANDROID_APP_BLOCKED','API_KEY_IOS_APP_BLOCKED','RATE_LIMIT_EXCEEDED','MODEL_CAPACITY_EXHAUSTED']);
const enumValue=x=>safeEnums.has(x)?x:null;
const number=x=>Number.isSafeInteger(x)&&x>=0?x:null;
console.log=(...a)=>{if(typeof a[0]==='string'){if(a[0].startsWith('[PASS]'))report.checks.pass++;if(a[0].startsWith('[FAIL]')){report.checks.fail++;if(a[0].startsWith('[FAIL] ไม่มี GEMINI_API_KEY'))report.errors.push('KEY_MISSING');}}};
console.error=(...a)=>{const kind=classifyGeminiError(a[1] instanceof Error?a[1].message:a[1]);if(!report.errors.includes(kind))report.errors.push(kind);};
console.warn=()=>{};console.info=()=>{};
const send=globalThis.fetch;
globalThis.fetch=async(...args)=>{
 const u=new URL(String(args[0]?.url??args[0]));
 if(u.origin!=='https://generativelanguage.googleapis.com')return send(...args);
 const m={http:null,elapsedMs:null,jsonParsed:null};report.requests.push(m);
 const started=Date.now();
 const credential=args[1]?.headers?.['x-goog-api-key'];
 m.credentialFormatValid=validGeminiCredential(credential);
 if(!m.credentialFormatValid){m.elapsedMs=Date.now()-started;report.errors.push('KEY_FORMAT_INVALID');throw Error('Gemini credential format is invalid');}
 try{
  const body=typeof args[1]?.body==='string'?JSON.parse(args[1].body):{};
  m.maxOutputTokens=number(body.generationConfig?.maxOutputTokens);
  m.requestBodySha256=createHash('sha256').update(args[1].body).digest('hex');
 }catch{m.requestJsonParsed=false;}
 try{
  const res=await send(...args);m.http=res.status;m.elapsedMs=Date.now()-started;
  if(!res.ok){try{const b=await res.clone().json();m.apiErrorStatus=enumValue(b.error?.status);m.apiErrorCode=number(b.error?.code);m.apiErrorReasons=(Array.isArray(b.error?.details)?b.error.details:[]).map(x=>enumValue(x.reason)).filter(Boolean);}catch{m.errorBodyParsed=false;}}
  const parse=res.json.bind(res);
  res.json=async()=>{try{
   const b=await parse();m.jsonParsed=true;m.bodyElapsedMs=Date.now()-started;
   const c=b.candidates?.[0];m.candidateCount=Array.isArray(b.candidates)?b.candidates.length:0;
   m.finishReason=enumValue(c?.finishReason);m.promptBlockReason=enumValue(b.promptFeedback?.blockReason);
   const parts=Array.isArray(c?.content?.parts)?c.content.parts:[];
   m.textCharacters=parts.reduce((n,p)=>n+(typeof p.text==='string'?p.text.length:0),0);
   m.safetyBlocked=Array.isArray(c?.safetyRatings)&&c.safetyRatings.some(x=>x.blocked===true);
   m.usage={};for(const k of ['promptTokenCount','candidatesTokenCount','thoughtsTokenCount','totalTokenCount'])m.usage[k]=number(b.usageMetadata?.[k]);
   return b;
  }catch(e){m.jsonParsed=false;report.errors.push('RESPONSE_JSON_PARSE_FAILED');throw e;}};
  return res;
 }catch(e){m.elapsedMs=Date.now()-started;m.fetchError=['TimeoutError','AbortError','TypeError','SyntaxError'].includes(e?.name)?e.name:'OTHER';const codes=['ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNREFUSED','ETIMEDOUT','ENETUNREACH','EHOSTUNREACH','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','DEPTH_ZERO_SELF_SIGNED_CERT','ERR_TLS_CERT_ALTNAME_INVALID','UND_ERR_CONNECT_TIMEOUT','UND_ERR_INVALID_ARG'];m.fetchCauseCode=codes.includes(e?.cause?.code)?e.cause.code:null;throw e;}
};
process.on('exit',code=>{
 report.exitCode=code;report.finishedAt=new Date().toISOString();
 report.environment={node:process.version,nodeEnv:['test','production','development'].includes(process.env.NODE_ENV)?process.env.NODE_ENV:'OTHER',geminiKeyPresent:Boolean(process.env.GEMINI_API_KEY),modelMatches:process.env.GEMINI_MODEL==='gemini-3.8-flash',demoDisabled:process.env.DEMO_AUTH_ENABLED==='false'};
 writeFileSync(process.env.HYDRA_G02_REPORT,JSON.stringify(report,null,2)+'\n',{mode:0o600});
});

}
