# HYDRA Audit Trace Review — Public Handoff

**Review date:** 2026-10-21  
**Scope:** Focused source review and previously reported checks in a local synthetic-data environment  
**Status:** Engineering handoff; not a production security assessment or certification

## Executive summary

The inspected implementation has session checks and role/capability checks around the reviewed clinical and trace endpoints. The patient-summary route also checks current clinical capability and an active care assignment before returning a summary. The trace endpoint applies role and patient-assignment scoping for non-security users.

Several areas need further verification before relying on audit traces for assurance: trace-wide patient ownership, correlation of pipeline events, audit-log persistence, integrity verification, and end-to-end frontend behavior.

## Findings and follow-up

### 1. Audit events are held in memory

The reviewed audit logger stores events in process memory with a bounded event history. Events are therefore not durable across a backend restart, and the bounded history can discard older events.

**Follow-up:** Define a separately reviewed persistence and retention design, including access controls, failure behavior, and operational monitoring. Do not treat the current in-memory log as a durable audit record.

### 2. Trace ownership must be consistent

At the time of the initial review, the trace builder derived a trace's patient association from the first event carrying a patient identifier. The implementation did not verify that every event sharing a correlation ID had the same patient association.

**Risk to verify:** If events from different patient contexts can share a correlation ID, selecting one patient from the trace may not safely represent every event in that trace. This is a potential invariant gap, not a confirmed cross-patient disclosure.

**Remediation under review:** [PR #5](https://github.com/torhummerkung-coder/Hydra-Mesh/pull/5) proposes a shared ownership invariant: conflicting patient IDs leave the trace without a single owner, Doctor/Staff access fails closed, and Security retains visibility with an explicit conflict marker. Synthetic regression assertions were added; execution and CI remain unverified.

**Follow-up:** Run the audit and clinician-authorization tests, verify the fail-closed behavior, and review the change before merging.

### 3. Timeline construction is not integrity verification

The reviewed event-chain builder orders events and calculates timeline information. The inspected implementation does not establish cryptographic hash-chain or signature verification.

**Follow-up:** If tamper evidence is a requirement, design and test it explicitly; do not describe timeline grouping as proof of event integrity.

### 4. Pipeline event context needs a complete call-site audit

The reviewed call sites show correlation IDs being used for some companion-flow events. The available excerpts were insufficient to confirm that all pipeline and security events consistently carry the context needed for safe trace scoping.

**Follow-up:** Inspect the event logger signature and every event producer. Document required fields by event type and add validation/tests for absent or inconsistent context.

### 5. Dashboard API wiring exists; end-to-end behavior remains unverified

The current `pages/dashboard.tsx` calls the doctor patient-list, review-queue, system-health, event-trace, and patient-summary endpoints. This confirms that API calls are wired in that dashboard source, but it does not establish that the running UI behaves correctly across authentication, authorization changes, timeout/error cases, or real deployment configuration. A separate `frontend/src/connected` slice inspected earlier did not establish equivalent clinical/trace integration there.

**Follow-up:** Exercise the intended dashboard flows end-to-end with synthetic accounts and records. Verify authorization failures, timeout/retry behavior, and that clinical payloads are not written to logs or shared artifacts.

## Test and CI status — 2026-10-21

The owner currently has access to an Android phone with Termux; a Mac is not yet available. Tests that depend on a compatible Linux/Prisma engine should be rerun in a suitable environment when available.

| Check | Reported status | Interpretation |
|---|---|---|
| `npm run typecheck` on Termux | PASS | TypeScript typecheck completed successfully in the reported local run. |
| `npm run test:audit` on Termux | PASS | Audit/resilience assertions completed successfully in the reported local run, including mixed-patient trace conflict handling. |
| `npm run test:clinician-authorization` on Termux | BLOCKED | Prisma schema-engine response failed before authorization assertions; Termux reported Android, while the selected Prisma engine was Linux x86-64. This is an environment/platform blocker, not a test pass and not by itself proof of an application-code defect. |
| GitHub Actions run [#2](https://github.com/torhummerkung-coder/Hydra-Mesh/actions/runs/39552988299) | BLOCKED before job execution | GitHub displayed: “The job was not started because your account is locked due to a billing issue.” Job logs/steps were not available from the workflow-run inspection. This is a billing/account execution blocker, not evidence that the test assertions failed. |
| Frontend end-to-end tests | NOT RUN / UNVERIFIED | No end-to-end runtime result is established by the checks above. |

The Ubuntu runner-image migration notice is informational and is separate from the reported billing lock. Do not attribute the blocked run to the runner-image notice without further evidence.

**Evidence limitation:** The Termux results above are previously reported outcomes, not a fresh rerun performed by this document update. Preserve raw logs privately if they contain account, credential, or clinical information; do not publish those details in this repository.

## Previously reported local authorization checks

The following results were reported from testing with synthetic local accounts and synthetic records:

- Requests without a valid session were rejected with an authentication error.
- A patient-role request to the doctor patient-list endpoint was denied.
- A doctor could retrieve the summary for an assigned synthetic patient; a request for a different, unassigned synthetic patient returned not found.
- Administrative care-assignment listing was permitted for an authorized administrator and denied for a security-role account without the required capability.

These are narrow local checks only. They do not demonstrate production readiness, complete authorization coverage, or the absence of other vulnerabilities. No real patient identifiers or credentials are included in this public handoff.

## Recommended next steps

1. Inspect the complete audit logger contract and all event producers, especially the semantics of unscoped events sharing a correlation ID with patient-scoped events.
2. Specify trace context and patient-ownership invariants, including how missing patient context is treated.
3. Add negative tests for conflicting or missing context and verify fail-closed behavior for Doctor/Staff and explicit conflict visibility for Security.
4. Verify endpoint authorization with synthetic data, keeping clinical response bodies out of logs and shared artifacts.
5. When a compatible Linux environment is available, run `npm ci`, `npm run typecheck`, `npm run test:audit`, and `npm run test:clinician-authorization`; record exact results and environment details.
6. Resolve the GitHub billing lock before relying on Actions checks; then rerun the workflow and retain its successful run link.
7. Decide on durable audit storage, retention, integrity, and monitoring as a separate design review.
8. Verify dashboard and any separate connected frontend end-to-end, including user-visible error handling.
9. Re-run the checks after changes and retain the evidence privately where it contains sensitive identifiers.

**Merge gate:** Keep PR #5 open and unmerged until the missing-context/correlation call-site review is resolved, the authorization integration tests have executed successfully in a compatible environment, and CI/equivalent independent evidence is available for the relevant regression checks.

## Evidence and privacy boundary

This handoff intentionally omits credentials, patient and account identifiers, local filesystem paths, and detailed per-record assignment data. Detailed operational evidence should remain in the owner's private records and should not be added to this public repository.

The review was based on selected source excerpts and previously reported local test outcomes. It did not modify application source, database records, care assignments, or running services during the review summarized here.
