# Shared Control & Evidence — customer guide

Supreme lets you implement a control once and reuse evidence with a recorded reason.

## What you will see

**Control Center** shows how many controls exist, how many are implemented, how many have been tested, which are ineffective, which have expiring evidence, and which have findings.

**Control detail** is a workspace: overview, mapped requirements, evidence, tests, findings, risks, relationships, and history.

**Framework coverage** shows mapped, implemented, tested, evidence path, and gaps for a selected framework version.

**Evidence Library** lets you upload a file to a vendor or reuse a file that is already in the organization.

## Words that matter

- **Mapped** means a Supreme control is associated with a framework identifier.
- **Implemented** means someone recorded that the control is in place.
- **Tested** means a person recorded a test result.
- **Evidence available** means a CLEAN file is explicitly linked.
- **Gap** means a requirement has no implemented mapped control yet.
- **Readiness** is an operating view.

These words do **not** mean certified, compliant, or attested.

## Evidence once

When you need evidence for another control:

1. Search existing files.
2. Confirm the malware scan is CLEAN.
3. Choose the relationship (supports, partially supports, related, or contradicts).
4. Write why this file supports this control.
5. Submit the link.

Supreme will not assume that one document proves every mapped requirement.

## Tests and findings

A test result can be pass, fail, partial, not tested, or not applicable. Not applicable is not a pass. A failed or partial test can link an existing finding. It will not create a finding for you.

## If evidence expires

Supreme can show which controls, requirements, vendors, assessments, and findings may be affected. Residual risk scores are not changed by that view. Treat it as potential governance impact and decide the next action.

## Who can do what

Viewers can read Control Center, coverage, and the library. They cannot change controls, record tests, or link evidence. Assessors can test and link. Approvers can review. Risk managers and organization admins can manage controls and mappings.
