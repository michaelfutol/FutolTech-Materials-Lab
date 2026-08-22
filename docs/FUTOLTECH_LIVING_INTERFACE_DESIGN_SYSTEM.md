# FutolTech Living Interface — Design System v1

Status: **LOCKED MASTER VISUAL LANGUAGE / reusable across FutolTech products**

## 1. Identity

The FutolTech Living Interface is the shared visual and interaction language for FutolTech websites, engineering tools, dashboards, reports, future apps, and public-facing experiences.

Its visual character deliberately combines four influences without copying any one of them literally:

1. **Da Vinci / masters' working notebook** — visible thinking, sketches, margin intelligence, equations, annotations, paper texture, study rather than decoration.
2. **Claude Monet / atmospheric light** — time, weather-like softness, gentle color transitions, nature and light as environmental context.
3. **1990s National Geographic editorial discipline** — documentary credibility, strong hierarchy, restrained typography, confident image/diagram framing, thin warm-gold accents, evidence-first storytelling.
4. **Modern FutolTech engineering clarity** — exact numbers, accessible contrast, deterministic states, explicit provenance, calm interaction, no decorative element allowed to weaken technical truth.

Core personality: **curious, humane, rigorous, alive, quiet, Filipino-rooted, technically credible.**

Permanent principle:

> **The engineering content stays sober and exact; the world surrounding it carries the poetry.**

## 2. Master composition

The interface has three visual layers.

### Layer A — Technical surface

The actual working surface: forms, calculations, diagrams, tables, drawings, controls, code references and PASS/FAIL states.

- High legibility and strong contrast.
- No moving object may cross or obscure a critical result.
- PaperMatte and Lab Dark are technical-surface modes inside the larger Living Interface identity, not separate brands.
- Calculation geometry and visual geometry must remain driven by the same project/solver state.

### Layer B — Editorial frame

The visual structure around the work.

- Restrained warm-gold rule/accent inspired by documentary/editorial framing.
- Strong title hierarchy.
- Small uppercase/eyebrow metadata where useful.
- Notebook-like secondary notes and source annotations.
- No ornamental fake data, fake stamps or faux-document aging that could be mistaken for evidence.

### Layer C — Living atmosphere

A low-intensity, pointer-transparent environmental layer that changes with the **user's local browser time**.

This layer may contain light gradients, paper/air texture and sparse nature objects such as dandelion seeds, pollen motes, tiny leaves, fireflies or stars.

The Living Atmosphere is never part of engineering geometry and is never included in printed calculations.

## 3. Time-of-day system

Use the user's local device/browser time. No location permission is required.

| Period | Local time | Atmosphere | Optional living objects |
| --- | --- | --- | --- |
| Dawn | 05:00–07:59 | pale blue, warm cream, faint rose/gold | dew motes, sparse seed fluff |
| Day | 08:00–15:59 | clear paper/sky, restrained green-blue | dandelion seeds / light drifting motes |
| Golden hour | 16:00–17:59 | amber, ochre, muted peach | pollen, tiny leaf/seed drift |
| Dusk | 18:00–19:59 | indigo-lavender with remaining amber | first fireflies, a few slow motes |
| Night | 20:00–04:59 | deep ink/indigo, quiet warm highlights | fireflies and sparse stars |

The ambient period updates automatically while a page is open.

### Technical-surface independence

Time-of-day ambience **must not forcibly override an engineer's chosen PaperMatte/Lab Dark workspace mode**. The environment can become night while a user deliberately keeps a paper calculation surface open. This preserves user control and avoids hiding data during long technical sessions.

## 4. Motion doctrine

Motion is environmental, not performative.

- Slow, sparse and asynchronous.
- No bounce-heavy or gaming-style motion.
- No large parallax behind calculation tables.
- Ambient objects use `pointer-events: none`.
- Respect `prefers-reduced-motion: reduce`; in reduced-motion mode the atmosphere remains visually present but essentially static.
- Avoid continuous heavy canvas/WebGL work for decorative ambience. Prefer CSS transforms/opacity on a very small number of DOM particles.
- Animations must never be used to imply engineering deformation or failure unless a solver produces that state.

## 5. FutolTech visual tokens

These are conceptual tokens; individual products may tune exact values while preserving relationships.

- **Ink / graphite:** primary technical text and linework.
- **Paper / warm ivory:** technical reading surface.
- **Deep lab ink:** nighttime/dark technical surface.
- **FutolTech teal:** primary engineering/action accent.
- **Documentary gold:** thin editorial rule or highlight; never a dominant button color.
- **Monet atmosphere:** pale blue, sage, rose, amber, lavender and indigo used primarily outside critical information surfaces.
- **PASS / FAIL:** semantic colors remain stronger than atmosphere and are never recolored decoratively.

## 6. Typography

- Primary UI/body: highly readable modern sans serif.
- Technical numbers/formulas: tabular-capable sans or mono where useful.
- Notebook/handwritten character may appear in optional figure annotations or non-critical marginalia only.
- Handwritten styling must never reduce readability of dimensions, equations, code citations, warnings, PASS/FAIL, or report data.

## 7. Editorial / notebook details

Allowed:

- Thin rules and keyed captions.
- Source cards.
- Marginal notes.
- Pencil/ink figure mode where exact coordinates are preserved.
- Subtle paper fibers / ruled-grid hints.
- Documentary-gold framing at low intensity.

Not allowed:

- Fake coffee stains, torn edges or exaggerated vintage filters on engineering deliverables.
- Decorative handwriting on critical calculations.
- Nature objects covering plots, controls, tables or drawing dimensions.
- Dense animations or particles that compete with engineering information.

## 8. Engineering safety boundaries

The Living Interface is presentation only.

It must not:

- modify solver inputs or outputs;
- change geometry coordinates;
- change a PASS/FAIL result;
- alter print pagination;
- hide warnings;
- intercept mouse/touch/keyboard interaction;
- become evidence/provenance itself;
- appear inside professional print/PDF calculation pages unless deliberately designed as a static brand motif.

## 9. Accessibility and performance

Required for every implementation:

- `aria-hidden="true"` for ambient decorative layers.
- `pointer-events: none` for ambience.
- WCAG-conscious contrast for all real content.
- `prefers-reduced-motion` support.
- No ambient element required to understand a workflow.
- Sparse DOM population and transform/opacity animation only.
- Ambient layer disabled in print.
- Functional pages remain usable when JavaScript or animation is unavailable.

## 10. Product adaptation

The master identity is shared; intensity changes by product.

### Engineering / Structural / RPE tools

Lowest ambience intensity. Technical panels dominate. Nature lives mostly around page edges and open background. Diagrams remain sober.

### FutolTech corporate / portfolio

Moderate ambience. More editorial photography, notebook annotations and atmospheric transitions are allowed.

### Dignity Homes / public configurators

Warm, humane atmosphere with clearer nature presence, but price, quantities, structural status and exclusions remain visually dominant.

### Commerce / local community products

Warmer and friendlier adaptation; preserve the same gold-rule, paper/ink and living-time language without making stores look like engineering software.

## 11. V1 implementation contract

The first reusable browser implementation is `src/futolTechLivingInterface.js`.

V1 provides:

- local-time period resolution;
- shared `data-ft-living-period` state on `<html>`;
- atmosphere tokens for dawn/day/golden/dusk/night;
- sparse deterministic decorative particles;
- reduced-motion behavior;
- print suppression;
- subtle FutolTech editorial gold/topbar treatment;
- coexistence with PaperMatte and Lab Dark;
- no engineering-state mutation.

The module is mounted from the shared `publicBrand.js` bootstrap so supported Structural Lab pages inherit the visual language without independent page-specific copies.

## 12. Expansion roadmap

Future shared package work may add:

- reusable React/Web Component version for other FutolTech repos;
- opt-in ambient intensity control (Off / Quiet / Living);
- seasonal/local nature sets appropriate to the Philippines;
- weather-aware ambience only when explicit permission/data is available;
- shared illustration/icon grammar;
- documentary image-caption component;
- notebook margin-note component;
- standardized animated transitions between FutolTech products;
- centralized design tokens package consumed by websites and apps.

Until those are implemented, every new FutolTech UI should use this document as the master visual doctrine and should not invent a competing house style.