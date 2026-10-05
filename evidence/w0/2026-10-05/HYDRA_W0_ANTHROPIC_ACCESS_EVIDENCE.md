# Historical Anthropic access evidence — received 2026-10-05

Codex transcribed the owner's screenshots; it did not execute these GitHub jobs or inspect their full workflow source. These runs concern Hydra-Mesh01 / wif-oidc-smoke, not the current Hydra-Mesh W0 candidate. Screenshots display approximately 5 days ago; exact run timestamps/URLs were not supplied.

| Evidence | Observed result | Limit |
|---|---|---|
| 1000018439–8441 | Run #1 f25b165: OIDC smoke job successful | Workflow status only; no full token/assertion logs reviewed |
| 1000018442–8443 | Run #2 569d114: OIDC fetch and Anthropic exchange steps successful; cleanup successful | Does not establish Messages API success or current-repo authentication |
| 1000018444–8445 | Run #3: OIDC fetch/exchange steps successful; Claude API smoke HTTP400, invalid_request_error, credit balance too low; exit1 | No successful generation or HYDRA agent behavior proof; exact run commit not shown |
| 1000018433 | Current Billing page prompts purchase of credits | Account UI observation; not a new API test |
| 1000018434/8436/8437/8438 | Existing issuer/rule and test-connection UI | Rule presence is not a successful current authentication event |

Owner approved local synthetic-demo limitation at 2026-10-05 15:01:39 Asia/Bangkok. Decision HD-W0-ANTHROPIC-2026-10-05 is recorded in docs/decisions/W0_G01_LOCAL_DEMO_ACCEPTANCE_2026-10-05.md. G-01/RISK-003 and W0 remain OPEN. No new live test, credit purchase, federation-rule edit or workflow modification is claimed.
