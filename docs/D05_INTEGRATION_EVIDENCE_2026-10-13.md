# D05 Integration Evidence — 2026-10-13 (Owner Review)

**Scope:** feature/d05-ledger-integration-20261013, Draft PR #2. This is a local/isolated synthetic verification report, **not** a release certificate or a global D04 ledger balance.

## Source lineage and integrity

- Frozen Python Gateway v1.0.40 source snapshot: `tools/d05/synthetic-gateway-v1.0.40.zip`.
- Archive SHA-256: `7b012325bb8fbd9da9464ade922989863aac201c3250f39070f12ae2e730c88f`.
- Git blob SHA: `64d95aec626bee8a2e3307f4d7645266ab4eba57`, matching the source snapshot's locally computed `git hash-object`.
- TypeScript adapter blob after correction: `fdba3e0290590d2762a1e728803a196517bba7e3`.
- Offline TS test blob: `f3b891b7e140a0493d59eae7c42fc589bbfdff5e`.
- Real-loopback TS test blob: `4f81730989a79f53e415e085d873b32c0df99c50`.
- Those TypeScript files were recreated in a scratch runtime, each locally confirmed byte-for-byte using `git hash-object` before test execution.

## Execution environment and results (LOCAL SYNTHETIC)

- Node v22.16.0, TypeScript 5.8.3 (global compiler), Python 3.13.5.
- Original v1.0.40 Python Gateway regression: **55/55 pytest PASS** (warnings from Python multiprocessing fork under multithreading were reported, not suppressed).
- Original v1.0.40 Python loopback HTTP smoke: **13/13 PASS**.
- Actual GitHub TypeScript adapter after correction compiled locally with `tsc` and no TypeScript errors.
- The exact GitHub offline adapter test compiled and executed: **9/9 PASS** (mocked fetch).
- The exact GitHub TypeScript real-loopback script compiled and executed with a fresh Python FastAPI service, random synthetic secrets and ephemeral SQLite: **9/9 PASS**.
- An independent additional Node integration harness using the compiled exact adapter against the v1.0.40 Gateway: **15/15 PASS**.
- All test case identities, grants, evidence digests, and database content were synthetic. No real Git runner operations, PHI, clinical processing, production admission or actual installed Skill invocation occurred. Synthetic tests are **not** D04-billed production/canonical attempts.

## Defect preserved and fixed

A reproducible initial local `tsc` compile failed with **three TS2345 errors**:
`D05Start`, `D05Finish`, and `D05Unknown` were not assignable to `Record<string, unknown>` in the transport helper.

- Fix: change the private JSON-serializing transport helper parameter to `payload: object`, without broadening admission authorization semantics.
- Corrected adapter: `fdba3e0290590d2762a1e728803a196517bba7e3`.
- After fix: independent adapter typecheck PASS, offline adapter tests 9/9 PASS, live TypeScript→Python tests 9/9 PASS.
- Two test entry points were earlier wrapped in `async main()` to avoid top-level await limitations in CommonJS `tsx` environments; this was a preventive compatibility fix, not independently proven to be a prior CI failure.

## GitHub Actions status — **FAIL / ROOT CAUSE UNVERIFIED**

GitHub Actions run 38326785770 (commit `ec4bad71fc27dc3ff4ae7c80d69f819f3103832b`):
- `typescript-offline`: FAILED.
- `python-gateway-smoke`: FAILED.
- `cross-language-loopback`: FAILED.

Connector job metadata provided **no steps and no logs**. Attempting to obtain GitHub Actions job logs returned a 404 `BlobNotFound` response from the log-storage redirect. Therefore the failing step and root cause remain **UNKNOWN**, and a successful local test **must not** be represented as successful GitHub Actions CI.

## Explicit non-claims / remaining gates

- Not a deployed PostgreSQL Shared Ledger; cross-host and crash recovery tests are outstanding.
- Real Owner grant signatures, exact executor START evidence and production enforcement remain UNVERIFIED.
- The archived source is staged as a checksum-verified ZIP; an independent reviewer should promote it into reviewable plaintext files before considering merge.
- No source change to patient encryption, DEK lifetime, CareAssignment, FHIR workflows or clinical authorization in this PR.
- Historical provisional Manual D05 +4 Minor is not reconciled to an independently verified atomic ledger.
- F-006/F-018 remain open for runtime assurance; G-03/RISK-008/W0 remain OPEN.
- **Merge/release blocked** pending reviewed integration, CI evidence, a security review and the Owner's final release decision.
