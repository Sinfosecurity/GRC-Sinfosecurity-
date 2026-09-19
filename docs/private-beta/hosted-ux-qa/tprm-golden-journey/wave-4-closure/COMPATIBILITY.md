# Legacy Onboard compatibility

## What is legacy

`/vendor-onboarding` and `/vendor-onboarding/:id` remain reachable as compatibility routes.

They are not primary Golden Journey navigation.

`VendorOnboarding` / `VendorOnboardingWorkspace` remain for historical Third Party onboarding records that never received a Golden Journey Engagement.

## Deep-link resolution

`GET /api/v1/tprm/legacy-onboard/:id` inspects the vendor key (id or publicId).

| Condition | Behavior |
| --- | --- |
| One Golden Journey Engagement exists | Redirect to `/engagements/:engagementId` |
| More than one Engagement exists | Show the Engagement list for that Third Party. Do not pick a residual score. |
| No Engagement exists | Keep the read-compatible legacy onboarding workspace. Do not create an Engagement. |

## What is not redirected blindly

Email CTAs and attention items that still point at `/vendor-onboarding/:id` are valid deep links. They now resolve through the compatibility endpoint.

`/third-parties/engagements/:id/*` redirects to `/engagements/:id/*`:

- `tier-review` → `inherent-risk`
- `assessment-review` → `evidence`
- `risk` → `residual-risk`

## Duplicate path audit

| Action | Authoritative route | Compatibility |
| --- | --- | --- |
| IRA / Tier Review | `/engagements/:id/inherent-risk` | `/third-parties/engagements/:id/tier-review` |
| Due-diligence plan / send | `/engagements/:id/due-diligence` | previous sibling route |
| Specialist review / evidence | `/engagements/:id/evidence` | `/assessment-review` |
| Finding candidates / determination | `/engagements/:id/findings` | global Findings register keeps Engagement context |
| Control effectiveness | `/engagements/:id/controls` | not a Shared Control global rating |
| Residual risk | `/engagements/:id/residual-risk` | Third Party page only aggregates Engagements |

Normal users should open the Engagement workspace. Global Assessments / Findings / Decisions remain portfolio registers.

## What was not manufactured

No new Engagement is created to satisfy an Onboard URL.
No Vendor User is created.
No Wave 5 treatment, acceptance, contract gate, or Engagement ACTIVE path is added.
