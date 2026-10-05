# EC-011 — G-02 investigation and evidence capture improvement

Source: phone diagnostic, HEAD `0ed5f52ab45daca58a9998d0abe38f82d2c852af`, 2026-10-05T09:36:42.649Z through 09:37:01.416Z (16:36–16:37 Asia/Bangkok). Original JSON: `g02-diagnostic-after-key-fix.json`, 3430 bytes, SHA-256 `e6080ad3bc7aa4f8e80ee1d91fc1ab5e1b3c3c3a9e47d0bcb0dd0a82addc3b50`; original bytes preserved. Codex received and parsed the file on 2026-10-05.

| Run | Result | Provider response | Observation |
|---|---|---|---|
| collector-env | exit 0; 3 checks pass | HTTP 200 / STOP | headers 10342 ms; full body 10375 ms; textCharacters 553; prompt/candidate/thought/total tokens 482/205/755/1442 |
| direct-env | exit 1 | HTTP 503 / UNAVAILABLE | headers 7183 ms; HTTP_503 error; no generated summary accepted |

Both request bodies hash to `db0ada67fb9c972f8fe2f4f209707860c6a6c1405f1ba0178c15db21a9d6250f`. Five targeted source/lockfile hashes match before/after. These are two standalone calls through the unchanged synthetic test, not a full collector or proof that the entire checkout is clean. Request body equality does not compare credential headers or prove environment causality.

Earlier screenshots 1000018452–8455 show a separate malformed credential value: control characters and whitespace, headerRejected, TypeError before HTTP. Private key re-entry yielded keyReady=true (1000018457). No original JSON of that earlier failure is bundled. The original external observer's KEY_MISSING substring classifier was too broad; that label was not proof that the key was absent.

Observed latest failure: Google returned 503 UNAVAILABLE. Official GenerateContent error reference describes temporary overload/down/capacity shortage: https://ai.google.dev/gemini-api/docs/generate-content/api-errors (checked 2026-10-05). Intermittent provider availability is a plausible inference from these results. The internal service cause is not independently verified.

Historical failed collector at executable candidate 3f6d45b retains FAIL. Its raw error/HTTP/finish reason were discarded; the historical 14428 ms is whole-gate duration. New 503 or malformed-key evidence cannot establish that old exact cause. This artifact does not certify clinical quality, uptime, full-suite success or human acceptance.

Patch scope: collector key-format preflight and safe live-gate metadata observer; test coverage for exact missing-key classification, malformed credentials, HTTP 503 failures and assignment-scoped fallback. Raw provider messages, keys and generated text are not retained by the observer. No agent/endpoint/security/dependency/model configuration changes or automatic retries. Existing fallback and clinical authority remain.

Before delivery, Codex tested an external temporary HTTP503 probe on the reconstructed fixture: existing handler returned unavailable plus assigned synthetic source A, omitted other-case source/raw provider error/AI text, and made no provider call for unassigned case. This is local mock evidence, not phone/live/UI verification. The permanent payload observer, agent contract, authorization/fallback and typecheck checks passed locally; installer and mocked collector orchestration checks also passed. Results are recorded in package VALIDATION.json. The local reconstructed fixture lockfile differs from the phone report lockfile, and local Node is v24.19.0 versus phone v22.23.2, so phone Ubuntu execution remains required; local mocks are not current phone verification.

Owner chose further investigation before G-02 acceptance. No new human decision or signature is added. **G-02 / RISK-001 / RISK-007 and W0 OPEN**. G-01/G-06 decisions retain their existing scope. No final baseline/tag/freeze/main merge or patch commit/push is implied by these files.


## EC-012 — Actual updated collector run and original JSON receipt

Original JSON received from owner on 2026-10-05 18:18:21 Asia/Bangkok: 4490 bytes, SHA-256 7a931f0d1732b1222a964b78a97271873f3c43bdcd9cffc1d756fd224ffb3d05; bytes preserved. Run 2026-10-05T11:00:11.749Z through 11:03:31.773Z, sourceBefore clean=true, HEAD 3f4b5cf917c3edf39a7aba34f4811b5579317b3f, tracked source SHA-256 946b186911dd3536cf2bf7e46d4d8bdee6eab3d9db0f6a59bb9c50774441b417, lock SHA-256 83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0. Node v22.23.2 / npm 10.9.8; tagsAtHead empty.

Fresh checkout /tmp/hydra-g02-verify-lW8QX7; record originally /tmp/hydra-w0-Fux8Gw/w0-evidence.json. Byte-preserved repo file: hydra-w0-live-503-3f4b5cf-2026-10-05.json. The record identifies the source before execution; no sourceAfter/sourceStable is present because the collector stopped on failure.

| Item | Actual evidence |
|---|---|
| First 14 gates | PASS, including contract and clinician-authorization regressions |
| Fifteenth gate | test:clinical-summary-gemini FAIL; exit1, failMarkers0, duration9962ms |
| Provider | One request; HTTP503, UNAVAILABLE, code503, reasons[]; headers8034ms |
| Request | maxOutputTokens4096; body SHA256 db0ada67fb9c972f8fe2f4f209707860c6a6c1405f1ba0178c15db21a9d6250f |
| Credential/model | Format accepted, key present; effective gemini-3.8-flash / modelMatches=true |
| Observer | Report produced, errors HTTP_503; checks0/0; child exit1 |
| Collector | commandGatesPassed=false; typecheck/build not reached |

Non-OK response makes the existing agent throw before summary assertions. checks0/0 is not a PASS; child exit1 correctly fails the collector even without a textual FAIL marker. jsonParsed=null refers to absence of successful-generation parsing in this record; parsed error status/code are separately recorded. No accepted generation or sample review from this run. Terminal typo EMINI_MODEL did not cause a different effective model in this invocation. Format validity does not certify key permissions or future provider health.

Google primary GenerateContent error reference describes503UNAVAILABLE as possible temporary overload/down/capacity shortage: https://ai.google.dev/gemini-api/docs/generate-content/api-errors (checked2026-10-05). Latest provider unavailability is identified, but the internal cause or global incident is not verified. Request-body equality with EC-011 200/STOP and503 observations supports intermittent availability only as an inference, not a controlled proof of environment causality.

Delivery continuity: owner reported all four targeted offline checks passed with G02_OFFLINE_CHECKS_EXIT=0 on Ubuntu, with visible 503 authorized-source fallback/typecheck output. Subsequent push at 3f4b5cf confirmed local/remote identity. These outcomes resolve the prior pending patch-execution note within their scope; they do not substitute for missing current full-suite/build or live UI evidence.

Historical 3f6d45b failed collector remains FAIL with unrecoverable exact cause from retained metadata. No new API call, runtime/code/config/dependency change or automatic retry is introduced by this documentation-only update. **G-02 / RISK-001 / RISK-007 and W0 OPEN**; no new human acceptance/signature, risk closure, baseline/tag/freeze/main merge.


## EC-013 — Current non-live verification and bounded investigation conclusion

Current non-live collector at HEAD b51d55d54b8d4f4430762ea0204cb68aa5febe16 ran 2026-10-05T11:38:47.072Z through 11:46:23.131Z (18:38:47–18:46:23 Asia/Bangkok). All 16 gates PASS, including typecheck/build; commandGatesPassed=true, liveRequested=false, sourceStable=true. Before/after both clean=true and identical commit/tracked-source SHA256 f0249dd42b24dc916fd3c657219d7e4f61b787f5ef6758488904086fde0cd0ef / lock SHA256 83452ab15b8b7bf720b861a8abf720d153187a29f0387d5b751edcae0e02a8f0. Nodev22.23.2/npm10.9.8. Original JSON received2026-10-05 18:55:03 Asia/Bangkok: 3967 bytes, SHA256 6c1104c884414f2800cf3751a2b29e444e486ab55ca89e07c0cb293a88d38130; original bytes preserved.

Original record: hydra-w0-nonlive-b51d55d-2026-10-05.json, originally /tmp/hydra-w0-PW61N5/w0-evidence.json. All16gates exit0/errorCode=null/failMarkers0/pass=true, including current modified clinician-authorization/contract suites, typecheck and production build. Synthetic DB/temporary keys; production build with demo auth disabled. Key absent is intentional non-live scope. Tags empty and deploymentEnvironmentVerified=false; verification does not start/certify the normal server.

| Question | Evidence-supported conclusion | Remaining limit |
|---|---|---|
| Earlier key/header failure | Control characters/whitespace made header construction fail; private re-entry corrected format | Source of those characters not proven; this does not identify the old collector cause |
| Current live collector failure | One actual request returned503UNAVAILABLE with accepted key format/correct effective model; observer preserved reason and exit1 | Internal Google cause/global outage not independently verified |
| Collector observability | Real live gate produced safe providerDiagnostics and truthful FAIL | Historical discarded error metadata cannot be recovered by new runs |
| Runtime handling | Existing mocked503 endpoint regression retains assigned source data and omits AI/raw error/unassigned data | Not live UI503 evidence or complete clinical safety validation |
| Current offline/source integrity | All16non-live gates PASS, clean/stable source-before-after atb51d55d | Does not convert failed live run or separate generations into17-live-gate PASS |

Evidence accessible for this bounded investigation has identified separate key-format and latest provider503 failure modes and repaired the capture gap. It does not establish that all possible code/network/provider defects are absent. No further repeat API or full non-live calls are required just to obtain green output; investigate again for a new failure/change/defined unanswered question.

Proposed residual-risk review is documented at docs/decisions/W0_G02_LOCAL_DEMO_PROPOSAL_2026-10-05.md; it is not owner approval. Preserve all failure records and existing unavailable/source-data fallback. G-02/RISK-001/RISK-007 and W0 OPEN, prior G-01/G-06 decisions unchanged. No runtime/config/dependency/retry change, signature, clinical/public/baseline approval.


## G-02 temporary human acceptance — 2026-10-05 19:35:51 Asia/Bangkok

Human Decision **HD-W0-G02-TEMP-2026-10-05**: นายศุภกร โคตะมา — Project Owner & System Architect — explicitly approved the explained G-02 proposal within its existing local synthetic MVP/Portfolio demo scope, **temporarily and revocably**. Accepted limitations: intermittent Gemini summary availability and insufficient historical failure metadata. Full chat-authorized record: `docs/decisions/W0_G02_TEMPORARY_ACCEPTANCE_2026-10-05.md` (repository-root path).

The owner may reconsider the model, provider/affiliation or API-key access readiness and withdraw this temporary approval at that review to continue according to the Roadmap. No new model/provider choice or API-credit purchase/access request is authorized by this record. Record any withdrawal/superseding decision against HD-W0-G02-TEMP-2026-10-05; retain prior history and re-verify the actual model/provider/source before claiming verified behavior.

**G-02 / RISK-001 / RISK-007 and W0 OPEN.** Acceptance applies only to these demo limitations; existing risks and required follow-up stay open. Preserve live/historical FAIL, unavailable/assigned-source fallback, disclaimer and human review. No 17-live-gate PASS, uptime/clinical correctness guarantee or acceptance of actual privacy/auth/safety defects. G-01/G-06 decisions and other gaps unchanged; no W0 closure/baseline/tag/freeze/main merge. Re-review on recurring failures, source/model/intended-use change, boundary failure or before real-data/public use. Earlier PENDING statements remain historical and are supplemented by this explicit decision; no new test run is claimed.
