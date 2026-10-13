# D05 Synthetic Admission Adapter — Phase 1 (2026-10-13)

**Status:** INTEGRATION_ADAPTER_PROPOSED — NOT production ready. D05 v1.0.40 is a separate Python/FastAPI **single-host SQLite prototype** and its frozen Python runtime source is **staged as a checksum-verified ZIP** under `tools/d05/` in this PR; it is not wired to the clinical service.

## Purpose and boundaries

The TypeScript adapter at `lib/d05/synthetic-runner-client.ts` is a manual, opt-in **server-side synthetic test runner client**. It is not connected to any clinician/patient API, Companion, G-03 code path, Prisma schema, or background job. This PR does **not** establish cross-host admission, actual Skill invocation, independent Owner signatures, or verified START.

- Calls go only to `http://127.0.0.1:<port>` (or IPv6 loopback), refusing remote hosts, redirects, or paths in the supplied origin.
- `HYDRA_D05_SYNTHETIC_ENABLED=true` required; production refuses the adapter regardless of the flag.
- Per-runner key remains server environment only, never `NEXT_PUBLIC_`, never logged or returned.
- `admit` uses explicit case/grant/intent/idempotency/severity; the server checks authorization and shared budget.
- `dispatch` does not mean a job started. Only call `start` with authentic evidence from a separately instrumented runner. This adapter does NOT create that evidence.
- On network/timeout uncertainty, return `UNKNOWN_REMOTE_STATE_HOLD`. Do NOT retry with a new idempotency key, refund a reservation, or assume the attempt did not start.
- `finish` sends the exact v1.0.40 outcomes `PASS`, `FAIL` or `TIMEOUT`.
- Never send patient identifiers, PHI, patient payloads, clinical review results, passwords, DEKs, or production secrets to the prototype.

## Required configuration (isolated local synthetic sandbox only)

```sh
HYDRA_D05_SYNTHETIC_ENABLED=true
HYDRA_D05_GATEWAY_URL=http://127.0.0.1:8765
HYDRA_D05_RUNNER_ACTOR=synthetic-runner
HYDRA_D05_RUNNER_KEY=<unique-secret-at-least-32-characters>
```

Use a unique secret shared with only this runner's entry in the synthetic gateway's runner credential map; do not commit any real key. Unpack the staged, checksum-verified v1.0.40 Python gateway into a disposable scratch directory using `python scripts/d05_unpack_verified.py --dest /tmp/d05-src`; start the gateway separately according to its original runbook. `HYDRA_D05_GATEWAY_URL` must not point to a shared/remote PostgreSQL gateway.

## Offline adapter checks

```sh
node --import tsx scripts/test-d05-synthetic-adapter.ts
npm run typecheck
```

The separate `HYDRA_D05_SOURCE_ROOT=/tmp/d05-src npm run test:d05-live` executes the actual TypeScript client against a temporary Python loopback Gateway with synthetic credentials. The offline checks use mocked `fetch`; neither mode proves D04 accounting atomicity, cross-runner concurrency, runtime tool enforcement, START authenticity, or clinical suitability. The pre-existing v1.0.40 local gateway has its own separate Python tests. **Do not convert this adapter test count into D04 case attempts.**

## Before future shared/production integration

1. Complete PostgreSQL backend with real atomic admission and multi-host contention/fault tests.
2. Verify independently signed Owner grants, canonical pre-registration and delegation constraints.
3. Add independent executor-start evidence, durable outbox reconciliation, signed audit export and fail-closed unknown-state handling.
4. Add mTLS/authn infrastructure, identity rotation, bounded network access, observability and security review.
5. Reconcile historical Owner-attested D05 debits with authoritative source before reporting remaining capacity.
6. Obtain explicit production/release decision after evidence review. Do not silently enable D05 in the clinical runtime.

## Current status

- F-006 / F-018 synthetic *response-level* regressions: PASS; installed Skill invocation: UNVERIFIED.
- Manual D05 known historical provisional Minor debit: +4, **not** a confirmed shared ledger balance.
- G-03, RISK-008 and W0: OPEN. No status or approval changes in this PR.

### Integration safety decisions

**Separate sidecar** rather than introducing D05 models into the patient SQLite database. No modifications to crypto primitives, ciphertext, DEK lifetime, patient authorization, assignment, revocation, middleware, or production policies. Merge/release require independent review.
