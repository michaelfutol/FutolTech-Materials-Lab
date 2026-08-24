# M4 Roof Fastener Capacity Evidence Acceptance

Status date: 2026-08-24

## Purpose

This M4 slice creates the evidence gate that must exist before any roof-fastener demand/capacity utilization can be calculated. PR #136 established exact physical screw locations and tributary rectangles. PR #137 routed verified M3 field/edge/corner pressures into signed individual-screw demand. This slice does **not** calculate a connection capacity or utilization. It establishes which physical attachment detail is being evaluated and whether a supplied pull-out or pull-over capacity reference actually states applicability to that detail.

Schema: `futoltech.roof-fastener-capacity-evidence/1`

Status: `ROOF_FASTENER_ATTACHMENT_DETAIL_AND_CAPACITY_EVIDENCE_ACCEPTED_UTILIZATION_UNRESOLVED`

## Why an evidence gate is required

A generic label such as “Tek screw” is not a capacity definition. Roofing self-drilling-screw behavior depends on the actual attachment assembly and on the basis of the cited capacity value. At minimum, the accepted detail therefore keeps the following identities explicit rather than inferring them:

- roof-sheet product/profile, base-metal thickness, material grade, Fy and Fu;
- purlin section identity, substrate base-metal thickness, material grade, Fy and Fu;
- fastener system identity, diameter, thread description, head/bearing component and effective bearing diameter;
- drill point, fastener material description and attachment position;
- installed thread penetration and the explicitly sourced minimum installation penetration; and
- the coordinated detail/source reference tying the sheet, screw and purlin together.

The record must match the fastener system, purlin section and attachment position already accepted by the PR #136 physical fastener-layout record.

## Capacity evidence is stored by mechanism

This acceptance slice recognizes two initial roof-sheet-to-purlin uplift mechanisms:

1. **Pull-out** — fastener withdrawal/pull-out from the purlin substrate.
2. **Pull-over** — roof sheet or bearing region pulling over the screw head/washer.

Each selected evidence record stores:

- unique evidence ID and mechanism;
- evidence source type;
- exact source/document reference and date checked;
- capacity value in kN;
- capacity type: nominal, allowable, design, or ultimate-test reference;
- design basis: LRFD, ASD, manufacturer-rated, test-reference, or explicitly unclassified;
- a separate source reference explaining that capacity basis; and
- the applicability limits actually stated by the evidence source.

This layer performs no conversion among nominal, ASD allowable, LRFD design, manufacturer-rated and ultimate-test values.

## Required applicability coverage

### Pull-out

For evidence to be marked `APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL`, the source applicability must explicitly cover:

- accepted fastener system identity;
- fastener diameter;
- purlin/substrate base-metal thickness;
- substrate ultimate strength; and
- minimum thread penetration.

### Pull-over

For evidence to be marked `APPLICABILITY_COMPLETE_FOR_ACCEPTED_DETAIL`, the source applicability must explicitly cover:

- accepted fastener system identity;
- roof-sheet product identity;
- roof-sheet profile identity;
- attachment position;
- screw-head/washer bearing diameter;
- roof-sheet base-metal thickness; and
- roof-sheet ultimate strength.

If a required applicability field is absent from the supplied source record, the evidence is retained as `REFERENCE_ONLY_INCOMPLETE_APPLICABILITY`. Missing information is never treated as an implicit match. If a supplied applicability limit explicitly excludes the accepted detail, acceptance fails visibly.

## Integrity and mutation protection

The accepted attachment-detail object and normalized evidence set receive deterministic fingerprints. Validation recomputes those fingerprints and also deterministically rebuilds the record from the stored upstream layout/detail/evidence inputs. Post-acceptance editing of accepted geometry/evidence values therefore fails validation instead of silently changing the engineering record.

The fingerprints are engineering record-integrity guards, not cryptographic signatures or legal document authentication.

## Synthetic regression values are not product data

The deterministic unit tests use clearly labeled synthetic fixture values for roof-sheet thickness/strength, purlin thickness/strength, screw geometry, pull-out reference and pull-over reference. These numbers exist only to test acceptance/rejection behavior. They are **not** Philippine product data, manufacturer capacities, project design values or recommendations.

No synthetic fixture value may be promoted into a selectable engineering product catalog.

## Explicitly unresolved after this slice

Even when pull-out and pull-over evidence applicability is complete, this record still does **not** implement:

- strength-vs-ASD demand/capacity basis alignment;
- pull-out utilization;
- pull-over utilization;
- governing pull-out versus pull-over selection;
- screw tensile or shear capacity;
- combined fastener tension/shear interaction;
- fastener-group load redistribution or group reduction;
- roof-sheet bending/structural capacity;
- purlin local bearing/tear-out/web/flange effects at the screw;
- purlin-to-rafter cleat/bolt/weld capacity; or
- any roof-system PASS.

All of those remain explicit later M4 gates.

## Next dependency

After this evidence-acceptance slice passes the preliminary Engineering Checks and its authority records are synchronized, the next M4 slice may align the already-verified individual screw demand with capacity evidence **only where**:

1. source applicability is complete for the accepted physical detail;
2. demand and capacity design bases are demonstrably compatible; and
3. no hidden resistance/safety-factor conversion is required.

Only then may pull-out or pull-over utilization be computed. If basis compatibility is unresolved, utilization must remain `UNRESOLVED` rather than forcing a numerical ratio.

## Permanent M4 rule

A member-level or screw-level numerical result never implies a roof-system PASS. The M4 exit condition remains unchanged: every required modeled connection in the load path must be checked or explicitly marked unresolved before any roof-system PASS can exist.
