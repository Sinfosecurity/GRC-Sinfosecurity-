# Supreme premium experience audit

**Date:** 2026-09-14  
**Starting SHA:** `10746ea4f76aeccc6ee27cb62e5760910aad53fe`  
**Authorization:** Product Leadership — Premium Experience & Brand Closure  
**#19 / #20:** NOT AUTHORIZED  
**Commercial production:** NO-GO  

This audit precedes redesign. It classifies customer-facing routes and names consolidations. It does not declare Premium Platform PASS.

## Current identity split

| Surface | What the user sees | Problem |
|---|---|---|
| Marketing hero | TPRM-first ("Govern the third parties…") | Platform is secondary |
| Marketing product pages | Third Party is real; Risk/Compliance/Privacy/AI are stubs | Undermines accepted products |
| App sidebar | "Supreme · Third Party" | Daily identity is one module |
| Home | TPRM metrics only | Other personas land in the wrong job |
| Login / platform console | "SUPREME RISK" | Old product name |
| Vendor portal | Standalone, not in the design kit | Family resemblance is weak |
| Status labels | `StatusBadge` + `humanizeLabel` + raw enums | Two language systems |

## Navigation decision

Keep one authenticated shell. Group by customer job, not implementation order.

**Keep:** Home, Third Parties, Risk, Compliance, Privacy, AI Governance, Governance (controls/evidence/graph), Reports, Administration.

**Trim from primary nav:** Import, every AI readiness/regulatory leaf, duplicate "Supreme X" overview labels.

**Move:** Evidence from Third Parties into Governance (shared evidence).

**Do not add:** Intelligence, Automation, semantic search.

## Route inventory

### PUBLIC

| Route | Purpose | Persona | Job | Primary action | Issue | Decision |
|---|---|---|---|---|---|---|
| `/` | Sell Supreme | Prospect | Understand the platform | Request demo / tour | TPRM-first hero | Rewrite as connected platform |
| `/demo` | Product tour | Prospect | See the story | Walk through | Raw enums in samples | Humanize |
| `/request-demo` | Lead form | Prospect | Ask for a conversation | Submit | Fine | Keep honest |
| `/pricing` | Plan comparison | Prospect | Understand commercial shape | Contact | TPRM-only outcomes | Reframe outcomes; no live purchase |
| `/trust` | Trust capabilities | Prospect / security | See real controls | Read | Strong | Keep no-certification honesty |
| `/security` | Security overview | Prospect | Same as trust | Read | Overlaps trust | Keep; align copy |
| `/frameworks` | Framework labels | Prospect | See supported labels | Read | Fine | Keep readiness language |
| `/products/third-party` | Flagship product | Prospect | Understand TPRM | Request demo | Strong | Polish to platform connection |
| `/products/:slug` | Other products | Prospect | Understand a module | Read | Placeholder stubs | Real pages for accepted products; roadmap stays labelled |
| `/solutions` `/resources` `/company` | Reserved | Prospect | — | — | Coming soon | Keep reserved |
| `/privacy` `/terms` `/subprocessors` `/status` | Legal / status | Prospect | — | — | Drafts | Do not invent |

### AUTH

| Route | Purpose | Issue | Decision |
|---|---|---|---|
| `/login` `/register` `/forgot-password` `/activate` `/reset-password` | Customer identity | "SUPREME RISK" banner | Rebrand |
| `/admin/login` `/admin/mfa` `/admin/activate` | Platform identity | Separate plane | Keep distinct; align tokens |
| `/vendor-assessment/*` | Vendor plane | Simpler than app; raw status | Premium-simple; no customer nav |

### PLATFORM HOME

| Route | Purpose | Issue | Decision |
|---|---|---|---|
| `/dashboard` | Attention | TPRM-only | Role-aware attention + decisions |

### THIRD PARTY

| Route | Purpose | Issue | Decision |
|---|---|---|---|
| `/vendor-management` | Directory | "Vendors" vs "Third Parties" | Rename |
| `/vendor-onboarding` `/vendor-onboarding/:id` | Lifecycle | Stepper overcrowded; Phase C tabs functional | Compact header; keep one workspace |
| `/assessments` | Assessment list | Raw statuses | Humanize |
| `/findings` | Findings | Raw severity in places | Humanize + clearer states |
| `/monitoring` | Monitoring | Honest empty intel | Keep honesty |
| `/decision-briefs` | Decisions | Raw codes | Humanize |
| `/documents` | Evidence | Lived under Third Parties | Also Governance |

### RISK / COMPLIANCE / PRIVACY / AI

Module dashboards already use the design kit. Primary issues: siloed nav titles, raw attention types, calculation-first density. Keep architecture; clarify attention and language.

### GOVERNANCE

| Route | Purpose | Issue | Decision |
|---|---|---|---|
| `/control-center` `/control-center/:id` | Controls | Implemented ≠ effective | Keep; clarify copy |
| `/framework-coverage` | Mapping | Dense | Keep |
| `/governance-graph` | Impact | Can feel experimental | List/workspace first; humanize edges |

### REPORTS / ADMIN / PLATFORM OWNER / HELP

Reports catalog and selector already exist (UX-031). Admin must stay out of ordinary nav. Platform Owner stays a separate plane. Help exists at `/help`.

## Design system

One token file (`frontend/src/design/tokens.ts`) already exists. Divergence: marketing.css gold/radius, PlatformLayout amber, vendor portal standalone, legacy GRC gradients (quarantined).

**Consolidate toward tokens.** Do not create a second kit.

## Terminology

Route all customer enums through `humanizeLabel`. StatusBadge `plain` currently shows raw values.

## Consolidation candidates

| Overlap | Action |
|---|---|
| Trust vs Security | Keep both; same honesty |
| Documents vs Evidence language | Call it Evidence |
| Onboard vs vendor list | Keep both; same header language |
| Marketing placeholders vs accepted products | Replace stubs for #15–#18 |
| Intelligence / Automation pages | Remain roadmap; do not sell as live |

## What this sprint will change first

1. Information architecture and shell identity  
2. Role-aware home  
3. Shared language and badges  
4. Public homepage and accepted product pages  
5. Third Party lifecycle header and vendor portal family resemblance  
6. Auth branding  

Later polish (if time): report identity, emails, graph relationship language, every empty/error state.
