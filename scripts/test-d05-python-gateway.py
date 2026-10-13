"""Synthetic-only D05 Python Gateway HTTP contract smoke.

Run with PYTHONPATH pointed to the verified v1.0.40 extracted source.
No network server, repo mutation, PHI, real Owner grant or clinical operations.
"""
from fastapi.testclient import TestClient
from tempfile import TemporaryDirectory
from pathlib import Path
import hashlib
import secrets

from hydra_d05.api import create_app

h=lambda x: hashlib.sha256(x.encode()).hexdigest()
key=lambda: secrets.token_hex(32)
admin, audit, runner1, runner2 = key(), key(), key(), key()

with TemporaryDirectory(prefix="d05-http-contract-") as scratch:
    client=TestClient(create_app(Path(scratch)/"ledger.db",
                                 admin_key=admin,audit_key=audit,
                                 runner_keys={"runner-1":runner1,"runner-2":runner2}))
    H=lambda k:{"x-api-key":k}
    checks=0
    def ok(test,description):
        global checks
        assert test,description
        checks+=1
        print("PASS",description)
    ok(client.get("/health").json()["production_ready"] is False,"prototype not production-ready")
    ok(client.get("/audit/integrity").status_code==401,"unauthorized audit rejected")
    for name,fp in (("CASE-A","fp-A"),("CASE-B","fp-B")):
        result=client.post("/admin/cases",headers=H(admin),json={
            "case_id":name,"group_id":"SYNTH-GROUP",
            "fingerprint":h(fp),"prereg_digest":h("prereg-"+name)})
        ok(result.status_code==200,"registered "+name)
        result=client.post("/admin/grants",headers=H(admin),json={
            "grant_id":"grant-"+name,"case_id":name,"actor":"runner-1",
            "environment":"isolated","operation":"synthetic-test",
            "severity":"MINOR","intent_digest":h("intent"),"ttl_seconds":90})
        ok(result.status_code==200,"grant "+name)
    def payload(name,identity):
        return {"case_id":name,"actor":"runner-1","environment":"isolated",
                "operation":"synthetic-test","intent_digest":h("intent"),
                "grant_id":"grant-"+name,"idempotency_key":identity,"severity":"MINOR"}
    admission=client.post("/runner/admit",headers=H(runner1),json=payload("CASE-A","first-a"))
    ok(admission.status_code==200 and admission.json()["kind"]=="FIRST","Case A first free")
    aid=admission.json()["attempt_id"]
    replay=client.post("/runner/admit",headers=H(runner1),json=payload("CASE-A","first-a"))
    ok(replay.status_code==200 and replay.json().get("idempotent_replay"),"idempotent replay")
    wrong=client.post("/runner/dispatch",headers=H(runner2),json={
        "attempt_id":aid,"actor":"runner-2","environment":"isolated","operation":"synthetic-test"})
    ok(wrong.status_code==403,"cross-runner dispatch blocked")
    claimed=client.post("/runner/dispatch",headers=H(runner1),json={
        "attempt_id":aid,"actor":"runner-1","environment":"isolated","operation":"synthetic-test"})
    ok(claimed.status_code==200,"dispatched synthetic case")
    started=client.post("/runner/start",headers=H(runner1),json={
        "attempt_id":aid,"single_use_token":claimed.json()["single_use_token"],
        "receipt_sha256":h("synthetic-receipt")})
    ok(started.status_code==200,"recorded synthetic start receipt")
    end=client.post("/runner/finish",headers=H(runner1),json={"attempt_id":aid,"outcome":"FAIL"})
    ok(end.status_code==200,"synthetic failed first remains consumed")
    retry=client.post("/runner/admit",headers=H(runner1),json=payload("CASE-A","alias-a"))
    ok(retry.status_code==200 and retry.json()["kind"]=="RETRY","alias charged as retry")
    b=client.post("/runner/admit",headers=H(runner1),json=payload("CASE-B","first-b"))
    ok(b.status_code==200 and b.json()["kind"]=="FIRST","distinct B first free in same group")
    snapshot=client.get("/audit/groups/SYNTH-GROUP",headers=H(audit))
    ok(snapshot.status_code==200 and snapshot.json()["retry_minor_reserved_or_consumed"]==1,
       "shared retry count")
    integrity=client.get("/audit/integrity",headers=H(audit))
    ok(integrity.status_code==200 and integrity.json()["chain_valid"] is True,"audit chain intact")
    print("D05 PYTHON HTTP CONTRACT",checks,"/",checks,"PASS, synthetic-only")
