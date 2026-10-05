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
