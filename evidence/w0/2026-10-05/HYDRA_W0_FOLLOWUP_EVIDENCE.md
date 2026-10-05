# W0 follow-up evidence — received 2026-10-05, Asia/Bangkok

This record transcribes the owner's phone screenshots and approval. Codex did not run these phone commands. Screenshots are identified by their supplied names; they are not copied into this package.

| Evidence | Observation | Boundaries |
|---|---|---|
| 1000018412, screen 12:28 | Normal npm start / next start on Ubuntu /root/Hydra-W0, Next 15.5.27, 127.0.0.1:3000, Ready in 3.6s | With prior production/demo-disabled/model/synthetic-DB preflight and exported-key metadata in the same shell; no new live request or clinical accuracy proof |
| 1000018414, screen 12:40 | Termux installer changed only scripts/test-clinician-authorization.ts, 29 insertions; chained diff check succeeded | No runtime source/config change |
| 1000018415, screen 12:44 | Ubuntu fast-forward: 12 paths / 708 insertions; seven authorization PASS messages including unowned trace denial for doctor/staff and security access; typecheck; AUTH_CHECKS_EXIT=0 | Targeted test only; full collector/build/live test not rerun |
| 1000018416, screen 12:50 | HEAD 0ed5f52ab45daca58a9998d0abe38f82d2c852af; production-subset audit 0, exit0, repeated with same result | Known-advisory result at the time, not universal security assurance |
| 1000018417, screen 12:53 | Full audit including dev: 5 high, exit1; braces GHSA-vfj7-8cjw-p6xm propagates through Tailwind chain; force suggests breaking Tailwind4 update | Failure is retained; no audit fix or dependency changes |
| 1000018418, screen 12:58 | tailwindcss3.4.19, chokidar3.6.0, fast-glob3.3.3, micromatch4.0.8, braces3.0.3; static pages/components globs, empty Tailwind plugins; PostCSS Tailwind/autoprefixer; git status --short empty | Clean Ubuntu working tree at observation; does not prove Termux untracked state or remote ref |
| Owner message 2026-10-05 13:04:20 | Explicit acceptance of G-06 per proposed section17, only within the current work context | Scope/conditions/residual risk/re-review in docs/decisions/W0_G06_ACCEPTANCE_2026-10-05.md; W0 OPEN |

Full non-live JSON remains bound to executable candidate 3f6d45ba7b28cee703d16c2eba6143cea7d5197d. The 3f6d45b→634c6cf comparison showed docs/evidence only; the subsequent fast-forward to 0ed5f52 additionally introduced only the 29-line authorization test. Do not relabel the original JSON as a complete run on 0ed5f52. The failed live collector result remains distinct from the separately successful ordinary Gemini run. Runtime/provider/model/config are not changed by this docs package.

Normal startup B-02 and targeted missing unowned-trace test evidence B-03 are now established in their bounded contexts. G-06 is accepted by the owner, not eliminated. Other gap and baseline decisions remain pending; no BLOCKER=0, freeze, tag, main merge or new remote push is claimed.
