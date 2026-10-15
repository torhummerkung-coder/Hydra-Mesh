"""Render/check two evidence views. Stdlib/document QA only; no candidate imports."""
from pathlib import Path
import argparse
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parents[1]

def render(ledger, digest, lane):
    demo = lane == 'demo'
    title = 'Demo — สถานะและเกณฑ์รับ' if demo else 'Production Readiness — สถานะตามหลักฐาน'
    status = ledger['overall'][lane]
    lines = ['# HYDRA-Mesh — ' + title, '',
      'Revision: ' + ledger['revision'] + ' · ' + ledger['as_of_date'] + ' · ' + ledger['timezone'],
      'Ledger SHA-256: `' + digest + '`', '', '**Overall: ' + status + '**', '',
      'Coverage: ' + ledger['coverage'], '',
      'Inspected GitHub base: ' + (ledger['live_repository_head'] or 'UNVERIFIED — supplied artifacts only'), '',
      'Gates: ' + ' · '.join(k+'='+v for k,v in ledger['gates'].items()), '',
      'ข้อเท็จจริงร่วมทุกแถวมาจากทะเบียนเดียวกัน ผลรับงานแต่ละขอบเขตแสดงแยกไว้ด้านล่าง', '',
      '## เกณฑ์รับขอบเขตนี้', '']
    if demo:
        lines += [
          '- กำหนด walkthrough, exact source/environment, synthetic inputs, expected outcomes และ mock boundaries ก่อนรัน',
          '- ฟังก์ชันที่สาธิตต้องทำงานตามเกณฑ์จริง รวม deny/fallback/timeout ที่อยู่ในขอบเขต',
          '- เก็บ failures และ UNKNOWN; accounting/isolation/admission prerequisites ต้องตรง operation',
          '- Owner review/freeze ตาม demo lane; independent review DEFERRED ไม่ใช่ PASS',
          '- Owner รับผลตามเกณฑ์ demo; ไม่สืบทอดเป็น production หรือ D05 operational attestation', '']
    else:
        lines += [
          '- ยืนยัน requirements และ current source/host/release identity; ชุดเอกสารนี้ยังไม่ใช่ full production audit',
          '- ปิด applicability ของ security/auth/revocation/crypto/clinical/PHI/isolation gaps ด้วยหลักฐานตามหน้าที่',
          '- มี real integration/DB/TLS/race/crash/recovery/monitoring และ capacity evidence ตาม workload',
          '- independent review/deferred findings และ Owner release decision ต้องเสร็จก่อน production',
          '- Demo PASS และ source/static review อย่างเดียวไม่พอสำหรับ release', '']
    for f in ledger['findings']:
        own=f[lane]
        lines += ['## '+f['id']+' — '+f['title'], '',
          '**สถานะ: '+own['status']+'**', '', 'ข้อเท็จจริง: '+f['fact'], '',
          'หลักฐาน: '+', '.join('`'+r+'`' for r in f['evidence_refs']), '',
          'เกณฑ์จบ: '+own['exit_criterion'], '']
    lines += ['## Evidence index', '', '| ID | Artifact | SHA-256 | Bytes |',
              '|---|---|---|---:|']
    for e in ledger['evidence']:
        lines.append('| '+e['id']+' | '+e['artifact_name']+' | `'+e['sha256']+'` | '+str(e['bytes'])+' |')
    lines += ['', 'Artifacts อ้างถึง supplied project files; raw/private evidence ไม่ถูกคัดลอกเข้า Repo โดยแพ็กนี้',
       'Hash ระบุ bytes ไม่ใช่ identity proof และไม่ได้รับรอง current GitHub HEAD', '',
       '## Shared change events', '']
    for ev in ledger['events']:
        lines += ['- **'+ev['id']+'**: '+ev['fact'],
          '  ผลต่อขอบเขตนี้: '+ev[lane+'_impact']]
    return '\n'.join(lines)+'\n'

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args=parser.parse_args()
    raw=(ROOT/'registry/ledger.json').read_bytes()
    ledger=json.loads(raw)
    refs={e['id'] for e in ledger['evidence']}
    if len(refs)!=len(ledger['evidence']):
        raise ValueError('Duplicate evidence ids')
    ids=[f['id'] for f in ledger['findings']]
    if len(set(ids))!=len(ids) or not all('H-0'+str(i) in ids for i in range(1,7)):
        raise ValueError('Duplicate finding or missing H item')
    for f in ledger['findings']:
        if set(f['evidence_refs'])-refs: raise ValueError('Unknown evidence reference')
        for lane in ('demo','production'):
            if not f[lane]['status'] or not f[lane]['exit_criterion']: raise ValueError('Incomplete dual impact')
    event_ids=[e['id'] for e in ledger['events']]
    if len(set(event_ids))!=len(event_ids): raise ValueError('Duplicate event')
    for f in ledger['findings']:
        if f['last_event'] not in event_ids: raise ValueError('Missing finding event')
    for ev in ledger['events']:
        if set(ev['evidence_refs'])-refs or not ev['demo_impact'] or not ev['production_impact']:
            raise ValueError('Incomplete event evidence or dual impact')
    digest=hashlib.sha256(raw).hexdigest()
    for lane,name in [('demo','DEMO.md'),('production','PRODUCTION-READINESS.md')]:
        target=ROOT/name
        expected=render(ledger,digest,lane)
        if args.check:
            if not target.is_file() or target.read_text(encoding='utf-8')!=expected:
                print('OUT_OF_SYNC: '+name, file=sys.stderr); return 1
        else: target.write_text(expected,encoding='utf-8')
    print('DOCUMENT_VIEWS_CONSISTENT' if args.check else 'DOCUMENT_VIEWS_GENERATED')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
