# Supreme Automation hosted evidence

Staging only. SHA `7a5548eb4bd881562eadf64d801bff77a5d1d7b5`. Cursor does not declare #20 PASS.

## Screenshot index

| File | What |
|---|---|
| `home-375.png` `home-768.png` `home-1024.png` `home-1440.png` `home-1920.png` | `/automation` Active Automations |
| `templates-*.png` | Templates tab |
| `detail-*.png` | `AUT-00001` High finding follow-up |
| `run-*.png` | `RUN-00001` finding overdue execution |
| `builder-*.png` | Structured WHEN / IF / THEN editor |
| `results.json` | Hosted API golden journey |

## Hosted runs (Elite Claims)

| Run | Trigger | Actions | Human boundary |
|---|---|---|---|
| RUN-00001 | finding.overdue | review, notify, reminder | Required before finding close |
| RUN-00002 | control.test.failed | review, notify | Required before effectiveness/compliance |
| RUN-00003 | risk.acceptance.expiring | decision package, notify | Required before acceptance/residual write |

Second finding scan did not create a second run. Preview wrote no work items. Finding stayed OPEN until a person closed it. Other-tenant automation GET 404, forged organizationId 403, execution list did not leak AUT-00001.
