# Hosted #12 workbook / lifecycle reconciliation evidence

**Date:** 2026-09-15  
**Item:** #12 Supreme Third Party — Workbook / Lifecycle Reconciliation — Hosted Certification  
**Tenant:** Elite Claims (`report-proof-20260913@staging.supremerisk.test`)  
**Environment:** https://supreme-risk-staging.onrender.com  
**API:** https://supreme-risk-staging-api.onrender.com  
**Production:** NO  
**#12 PASS:** NOT DECLARED  
**#20:** PAUSED  
**#21:** NOT AUTHORIZED

This is one Third Party product. Phase C was reused. No second TPRM model was created.

## SHAs

| | SHA |
|---|---|
| Starting | `2904038f5607a3ed791eb9c2162fab6f70effafa` |
| Lifecycle implementation | `c7fc99527bfaf2a8f096168fad59890120b7b33d` |
| Email remainder | `e6fd30c794058767e6a7698ff3b47766ef7c8156` |
| D-01 register label | `980f717d19d527acc9567eb330c03a540841e4b4` |
| CI / hosted API tip | `e250493c7dba98d882701acd83907f8cfaff1886` |
| Hosted frontend | `980f717d19d527acc9567eb330c03a540841e4b4` |

`e250493` changed Jest ignore + a copy-link assertion only. Frontend source is the D-01 label commit. Not silently treated as the same SHA.

**CI:** https://github.com/Sinfosecurity/GRC-Sinfosecurity-/actions/runs/34925131005 PASS on `e250493`  
**Backend tests:** 412  
**Frontend tests:** 173

## Vendors

| Public ID | Role |
|---|---|
| `VND-2026-0013` | Golden: Unknown-blocked intake → 8 packs → copy link → portal → residual sync → Phase C → Active → reassessment |
| `VND-2026-0014` | Send invitation email only |
| `VND-2026-0015` | Cross-vendor isolation |
| `VND-2026-0016` | Human reject |

## Golden facts (`VND-2026-0013`)

- Canonical IR-01–IR-15 present in hosted intake. IR-07 / IR-11 / IR-14 / IR-15 hosted. Estimated spend is commercial context; spend points = 0.
- Unknown on privileged access returned 400: “Unknown cannot remain on a required scoping fact. Will the vendor have administrative or privileged access…” Ready to Send then 409 until intake completed.
- All 8 workbook packs recommended. Baseline always required. Customize without rationale 400; customize with rationale recorded.
- Copy secure link: deliveryMethod LINK, emailStatus “Not emailed”, emailTruth “not email delivery.” First activation 200, reuse 410, prior token after recopy 410.
- Send email on `VND-2026-0014`: Email queued. Provider accepted/queued. Queued ≠ Delivered. Real inbox not tested. Hosted template proof: `docs/private-beta/hosted-ux-qa/transactional-email/hosted/`.
- Vendor residual `supreme-risk-1.1.0`: 28 before submit, 100 after submit. Assessment control-gap 40.6% High. Register residual 100 matches workspace. Risk acceptance left residual at 100.
- Finding `556e091c-9aeb-4d4f-aae8-9beecc83370f` confirmed, remediated, closed only after CLEAN evidence. Contract renewal 2028-02-08. Approve with conditions. Active. Reassessment started; 9 historical assessment rows preserved.

## Accessibility

Serious axe on vendor landing (progressbar name + contrast), vendor questionnaire (progressbar name), intake (contrast, 20 nodes), register (contrast). Request / packs / send / review / findings / approval: 0 serious.

## Screenshot index

See `results.json` `shots` and the PNG files in this folder.
