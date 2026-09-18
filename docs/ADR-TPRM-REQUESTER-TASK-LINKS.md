# ADR — Requester task links

**ADR ID:** ADR-TPRM-REQUESTER-TASK-LINKS  
**Status:** ACCEPTED — Product Leadership 2026-09-18  
**Does not replace:** ADR-TPRM-VENDOR-ACCESS  
**Does not create:** a customer User for the requester

## Decision

The business requester is not a Supreme user. GRC creates the third-party record. Supreme sends a purpose-built task link for the Inherent Risk Assessment and later requester tasks (clarification, finding recommendation, scope change, attestation, offboarding).

This is a fourth bounded access path, not the vendor plane.

```
CUSTOMER     PLATFORM     VENDOR              REQUESTER TASK
User+RBAC    operators    VendorContact       hashed task token
                          single-use activate reopen until submit
```

## Rules

1. Token is hashed at rest (SHA-256). Raw token appears only in the URL.
2. Purpose is bound: IRA opens only the IRA. A later task gets a new token.
3. IRA tokens may be reopened to save a draft until submit, then read-only. They expire 14 days after issue. Regenerating invalidates the previous token.
4. Vendor activation tokens stay single-use after activate. Do not reuse vendor invitation code for requester tasks.
5. Scope-change, attestation, and offboarding links are issued fresh. An old email does nothing.
6. Formal risk acceptance is signed by Supreme users. The requester only recommends Remediate or Accept.
7. Customer `authenticate()` does not accept a requester task token. Requester routes are purpose-scoped and rate-limited like activation.
8. Audit records who issued the link, email/copy, and when it was marked sent. The 5-day IRA clock starts at send or Mark as sent.
