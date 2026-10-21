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

The reviewed trace builder derives a trace's patient association from the first event carrying a patient identifier. The inspected event type does not itself enforce that every event sharing a correlation ID has the same patient association.

**Risk to verify:** If events from different patient contexts can share a correlation ID, selecting one patient from the trace may not safely represent every event in that trace. This is a potential invariant gap, not a confirmed cross-patient disclosure.

**Follow-up:** Establish and enforce a trace invariant: a correlation ID must belong to one permitted context, and mixed-context traces must fail closed or be split safely. Add tests for missing, conflicting, and reassigned patient context.

### 3. Timeline construction is not integrity verification

The reviewed event-chain builder orders events and calculates timeline information. The inspected implementation does not establish cryptographic hash-chain or signature verification.

**Follow-up:** If tamper evidence is a requirement, design and test it explicitly; do not describe timeline grouping as proof of event integrity.

### 4. Pipeline event context needs a complete call-site audit

The reviewed call sites show correlation IDs being used for some companion-flow events. The available excerpts were insufficient to confirm that all pipeline and security events consistently carry the context needed for safe trace scoping.

**Follow-up:** Inspect the event logger signature and every event producer. Document required fields by event type and add validation/tests for absent or inconsistent context.

### 5. Dashboard API wiring exists; end-to-end behavior remains unverified

The current `pages/dashboard.tsx` calls the doctor patient-list, review-queue, system-health, event-trace, and patient-summary endpoints. This confirms that API calls are wired in that dashboard source, but it does not establish that the running UI behaves correctly across authentication, authorization changes, timeout/error cases, or real deployment configuration. A separate `frontend/src/connected` slice inspected earlier did not establish equivalent clinical/trace integration there.

**Follow-up:** Exercise the intended dashboard flows end-to-end with synthetic accounts and records. Verify authorization failures, timeout/retry behavior, and that clinical payloads are not written to logs or shared artifacts.

## Previously reported local checks

The following results were reported from testing with synthetic local accounts and synthetic records:

- Requests without a valid session were rejected with an authentication error.
- A patient-role request to the doctor patient-list endpoint was denied.
- A doctor could retrieve the summary for an assigned synthetic patient; a request for a different, unassigned synthetic patient returned not found.
- Administrative care-assignment listing was permitted for an authorized administrator and denied for a security-role account without the required capability.

These are narrow local checks only. They do not demonstrate production readiness, complete authorization coverage, or the absence of other vulnerabilities. No real patient identifiers or credentials are included in this public handoff.

## Recommended next steps

1. Inspect the complete audit logger contract and all event producers.
2. Specify trace context and patient-ownership invariants.
3. Add negative tests for conflicting or missing context and verify fail-closed behavior.
4. Verify endpoint authorization with synthetic data, keeping clinical response bodies out of logs and shared artifacts.
5. Decide on durable audit storage, retention, integrity, and monitoring as a separate design review.
6. Verify dashboard and any separate connected frontend end-to-end, including user-visible error handling.
7. Re-run the checks after changes and retain the evidence privately where it contains sensitive identifiers.

## Evidence and privacy boundary

This handoff intentionally omits credentials, patient and account identifiers, local filesystem paths, and detailed per-record assignment data. Detailed operational evidence should remain in the owner's private records and should not be added to this public repository.

The review was based on selected source excerpts and previously reported local test outcomes. It did not modify application source, database records, care assignments, or running services during the review summarized here.
