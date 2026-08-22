# FutolTech Interface Design System v1

Status: **LOCKED MASTER VISUAL LANGUAGE / reusable across FutolTech products**

## 1. Identity

The FutolTech visual language is the shared design personality for FutolTech websites, engineering tools, dashboards, reports, future apps and public-facing experiences.

Its character combines four influences without copying any one of them literally:

1. **Da Vinci / masters' working notebook** — visible thinking, sketches, margin intelligence, equations, annotations, study rather than decoration.
2. **Claude Monet / atmospheric sensitivity** — humane color, softness and nature-aware visual sensibility where appropriate.
3. **1990s National Geographic editorial discipline** — documentary credibility, strong hierarchy, restrained typography, confident image/diagram framing, thin warm-gold accents and evidence-first storytelling.
4. **Modern FutolTech engineering clarity** — exact numbers, accessible contrast, deterministic states, explicit provenance, calm interaction and no decorative element allowed to weaken technical truth.

Core personality: **curious, humane, rigorous, quiet, Filipino-rooted and technically credible.**

Permanent principle:

> **The engineering content stays sober and exact; poetry belongs only where it does not compete with truth.**

## 2. Two product modes under one FutolTech identity

### A. FutolTech Engineering Mode — LOCKED for engineering applications

Use for Structural Lab, RPE engineering workspaces, FutolStructure, design/checking tools, technical dashboards and professional engineering outputs.

Engineering Mode uses:

- Da Vinci notebook logic through visible calculations, annotations, sketches and source notes;
- National Geographic-like editorial hierarchy and restrained framing;
- FutolTech teal as the primary engineering/action accent;
- restrained documentary gold as a thin rule/highlight only;
- PaperMatte and Lab Dark as user-controlled technical-surface modes;
- exact technical diagrams, tables, PASS/FAIL states and provenance;
- static, quiet visual depth only.

**Engineering Mode does not use time-of-day ambience, fireflies, dandelions, stars, floating leaves, animated nature particles or decorative environmental overlays.**

This prohibition is intentional. Engineering applications must remain calm, sober and immediately legible during long technical sessions.

### B. FutolTech Living Mode — RESERVED for selected non-engineering experiences

Living Mode may be used later for corporate storytelling, portfolio experiences, Dignity Homes public-facing experiences, community products, educational storytelling and other contexts where ambient personality improves rather than distracts.

Living Mode may include:

- local-time atmosphere;
- dawn/day/golden-hour/dusk/night visual adaptation;
- sparse dandelion seeds, pollen, tiny leaves, fireflies or stars;
- gentle Monet-like atmospheric color transitions;
- slow, low-resource environmental motion.

Living Mode is **not mounted in current engineering applications**.

## 3. Engineering Mode composition

### Technical surface

The actual working surface: forms, calculations, diagrams, tables, drawings, controls, code references and PASS/FAIL states.

- High legibility and strong contrast.
- PaperMatte and Lab Dark are technical-surface modes inside the larger FutolTech identity, not competing brands.
- Calculation geometry and visual geometry must remain driven by the same project/solver state.
- No visual treatment may change the meaning or salience of a technical result.

### Editorial frame

The visual structure around the work.

- Restrained warm-gold rule/accent inspired by documentary/editorial framing.
- Strong title hierarchy.
- Small eyebrow/meta labels where useful.
- Notebook-like secondary notes and source annotations.
- Thin rules, keyed captions and confident spacing.
- No ornamental fake data, fake stamps or faux-document aging that could be mistaken for evidence.

### Notebook intelligence

Da Vinci influence appears primarily through **how technical thought is exposed**, not through costume styling.

Preferred patterns:

- visible formula substitutions;
- margin/source notes;
- diagram callouts;
- optional pencil/ink technical-figure mode where exact coordinates remain unchanged;
- hand-check blocks beside automated results;
- compact provenance cards;
- explanatory arrows tied to real solver quantities.

## 4. FutolTech visual tokens

These are conceptual tokens; individual products may tune exact values while preserving relationships.

- **Ink / graphite:** primary technical text and linework.
- **Paper / warm ivory:** PaperMatte technical reading surface.
- **Deep lab ink:** Lab Dark technical surface.
- **FutolTech teal:** primary engineering/action accent.
- **Documentary gold:** thin editorial rule or highlight; never a dominant button color.
- **Quiet neutral borders:** structural organization without visual noise.
- **PASS / FAIL:** semantic colors remain stronger than all brand accents and are never recolored decoratively.

For non-engineering Living Mode only, additional Monet-atmosphere colors may include pale blue, sage, rose, amber, lavender and indigo.

## 5. Typography

- Primary UI/body: highly readable modern sans serif.
- Technical numbers/formulas: tabular-capable sans or mono where useful.
- Notebook/handwritten character may appear only in optional non-critical annotations or figure modes.
- Handwritten styling must never reduce readability of dimensions, equations, code citations, warnings, PASS/FAIL or report data.

## 6. Engineering editorial details

Allowed:

- thin documentary-gold rules;
- source cards and provenance badges;
- marginal notes;
- pencil/ink figure mode where exact engineering coordinates are preserved;
- subtle static paper/grid hints inside non-critical blank space;
- quiet panel depth and disciplined spacing;
- strong photograph/diagram framing on explanatory or educational pages.

Not allowed in engineering applications:

- time-of-day UI shifts;
- ambient particle overlays;
- fireflies, dandelions, stars or floating nature objects;
- fake coffee stains, torn edges or exaggerated vintage filters;
- decorative handwriting on critical calculations;
- animation that can be confused with physical/engineering response.

## 7. Engineering safety boundaries

The design system must not:

- modify solver inputs or outputs;
- change geometry coordinates;
- change a PASS/FAIL result;
- alter print pagination unexpectedly;
- hide warnings;
- intercept mouse/touch/keyboard interaction;
- become evidence/provenance itself;
- weaken contrast of code references, assumptions or governing results.

Professional print/PDF calculations should use a static restrained FutolTech identity only.

## 8. Accessibility and performance

Required for every implementation:

- WCAG-conscious contrast for all real content.
- No decorative element required to understand a workflow.
- Functional pages remain usable if styling enhancements fail.
- Prefer CSS and existing DOM structure over heavy visual frameworks for branding.
- Respect reduced-motion wherever functional engineering animation exists.
- Print styles remain deterministic and separate from screen-only presentation.

## 9. Product adaptation

### Structural Lab / RPE / FutolStructure / engineering tools

**Engineering Mode only.** Static editorial/notebook identity, PaperMatte/Lab Dark, no living ambience.

### FutolTech corporate / portfolio

May use Living Mode. Moderate atmosphere, editorial photography, notebook annotations and time-sensitive visual transitions may be appropriate.

### Dignity Homes public configurator

May use Living Mode where it improves warmth and accessibility. Price, quantities, structural status, financing assumptions and exclusions remain visually dominant.

### Commerce / community products

May use a warmer Living Mode adaptation while preserving FutolTech hierarchy and restraint.

## 10. Time-of-day / living-object reserve specification

Reserved for future non-engineering FutolTech products only.

| Period | Local time | Atmosphere | Optional living objects |
| --- | --- | --- | --- |
| Dawn | 05:00–07:59 | pale blue, warm cream, faint rose/gold | dew motes, sparse seed fluff |
| Day | 08:00–15:59 | clear light, restrained green-blue | dandelion seeds / light drifting motes |
| Golden hour | 16:00–17:59 | amber, ochre, muted peach | pollen, tiny leaf/seed drift |
| Dusk | 18:00–19:59 | indigo-lavender with remaining amber | first fireflies, sparse motes |
| Night | 20:00–04:59 | deep ink/indigo, quiet warm highlights | fireflies and sparse stars |

If Living Mode is later implemented, it must use the user's local device/browser time, require no location permission, remain optional, respect reduced-motion and never obscure functional content.

## 11. Current Structural Lab implementation contract

For the current engineering repository, integration is intentionally limited to the static FutolTech Engineering Mode.

The shared engineering identity should be mounted through `src/publicBrand.js` so supported Structural Lab pages inherit one visual language rather than accumulating page-specific styling.

Current safe targets for shared integration:

- restrained documentary-gold topbar/editorial rule;
- standardized panel depth/borders;
- PaperMatte/Lab Dark harmony;
- source/provenance-card hierarchy;
- consistent headings, eyebrow labels and technical-note treatment;
- preservation of all existing engineering geometry, tests, print behavior and semantic colors.

No ambient Living Mode module is mounted in Structural Lab.

## 12. Expansion roadmap

Future shared design-system work may add:

- reusable CSS/token package for all FutolTech repos;
- React/Web Component implementation for non-static apps;
- standardized source/provenance card;
- notebook margin-note component;
- documentary image-caption component;
- shared illustration/icon grammar;
- separate optional Living Mode package for approved non-engineering products;
- seasonal/local nature sets appropriate to the Philippines;
- centralized design tokens consumed by websites and apps.

Until those are implemented, every new FutolTech UI should use this document as the master visual doctrine and should not invent a competing house style.