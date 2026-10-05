# W0 Human Decision — Clinical Summary model, 2026-10-05

- Decision ID: HD-W0-MODEL-2026-10-05.
- Decision authority: Tor (โต๋), project owner.
- Decision date/time: 2026-10-05 07:57:53 Asia/Bangkok (conversation submission time).
- Intended use confirmed in the preceding question: MVP/Portfolio Demo using synthetic data.
- Human Decision: Select Google `gemini-3.8-flash` instead of `gemini-3.7-flash` for Clinical Summary in this baseline.
- Reason supplied by Tor: model 3.7 had problems and could not run in his environment. This is the owner's reported operational experience; no 3.7 provider error log accompanies this decision, so it is not an independently established global model/service limitation.
- Source: Tor's explicit response in the conversation on 2026-10-05: “ถูกต้องครับ ผมเลือกใช้ gemini 3.8 flash แทน 3.7flash เนืองจาก model 3.7 มีปัญหาไม่สามารภ run ไก้ครับ”. Codex transcribes this decision; Codex is not its authority.
- Evidence: EC-004/EC-005; two collector JSONs and report under `evidence/w0/2026-10-05/`; separate Gemini live and synthetic UI observations retain their original provenance and failure history.
- Tested executable candidate: `3f6d45ba7b28cee703d16c2eba6143cea7d5197d`. Documentation evidence commit observed in screenshot 1000018381: `c18dd26` on `fix/w0-reconciliation`. This decision patch changes documentation only; no new live run is claimed.
- Scope of approval: Model selection only. Existing runtime is already configured as 3.8; no code/model fallback or timeout change is required by this record.
- Residual Risk: No new human assessment supplied for the existing risk entries; their residual-risk fields remain pending.
- Other Human Decisions: Synthetic-content review, gap classifications, baseline approval and risk acceptance/closure remain pending. This approval does not cover clinical use or real-patient deployment and does not approve the Phase 2 RISK-003 scenario proposal.
- Status: Model selection approved by Tor; W0 OPEN. RISK-001/RISK-007 remain open; no risk closure, BLOCKER=0, freeze/tag/push or clinical sign-off is asserted.
- Re-review trigger: Any later model/provider/version change needs its own Evidence Chain record, appropriate contract/live evidence and human decision under the existing change-control rules.
