# Report Layout and Brand Governance

Status: adopted project direction, August 2026

## 1. Readability-first report doctrine

Tools reports must use the paper efficiently, but **paper utilization is subordinate to readability, continuity and engineering clarity**.

Do not force content onto a page merely to eliminate blank space. Blank space is acceptable when it:

- prevents a table from being split at an awkward point;
- keeps a figure with its caption, legend and related result;
- preserves continuity between a section heading and its content;
- prevents a result card, schedule, note or comparison block from being clipped;
- keeps the next table or figure intact and understandable;
- provides deliberate visual separation between engineering topics.

The target is not maximum fill. The target is a report that is easy to audit, read and print.

### Page-break rules

1. Never place text, table borders or figures outside the printable safe area.
2. Never shrink tables or illustrations below a comfortably readable size only to save a page.
3. Prefer a clean new page when the remaining space cannot contain the next logical block without damaging continuity.
4. Repeat table headers when a long table legitimately continues to another page.
5. Keep short tables intact where practical.
6. Keep engineering figures with their title, load case, dimensions and explanatory legend.
7. Do not overlay fixed headers or footers on paged content.
8. Allow intentional white space at the end of a page when the next block belongs together.
9. Use compact spacing where it improves clarity, not merely to compress the report.
10. Printed browser controls, tooltip icons and interactive-only decorations must be hidden.

## 2. Direct Compare report figure

The Direct 2–3 Member Comparison report should include a simple engineering illustration of the exact test situation.

For beam bending, the figure should show:

- undeformed member line;
- selected left and right supports;
- total span and dimension line;
- point-load magnitude and position;
- deflection criterion;
- Member A, B and optional C section symbols or labels;
- a note that every candidate receives the same idealised test condition.

For column compression, the figure should show:

- member height;
- top and bottom restraint;
- axial load and eccentricity;
- intermediate brace levels and governing unbraced segment;
- Member A, B and optional C section symbols or labels;
- a note that bracing is an assumed restraint and requires a verified real load path.

The figure is explanatory, not a substitute for calculations.

## 3. Proposed report flow

The exact page count may change with the amount of data. The following is a preferred logical flow, not a rigid page-fill requirement:

1. Letterhead, report identity, shared inputs and test-situation figure.
2. Selected members, section visuals, source basis and assumptions.
3. Direct result cards and governing summary.
4. Detailed comparison table, limitations and engineering notice.

If a complete table or figure does not fit cleanly, move it to the next page rather than compressing or splitting it badly.

## 4. Product and governance hierarchy

The public-facing hierarchy is deliberately simple:

```text
FutolTech Engineering and Project Systems
└── Tools
    └── Native Structures
        ├── Materials Lab
        ├── Direct Compare
        ├── Load Recommender
        ├── Section Library
        ├── Steel Yield Lab
        ├── Bamboo Culm Lab
        ├── Stock and Splice
        └── Concrete Slab Shoring
```

### Roles

- **FutolTech Engineering and Project Systems** — the governing engineering and project-systems platform responsible for technical standards, validation, traceability and project workflow.
- **Tools** — the practical software-tool family.
- **Native Structures** — the structural-materials and native-structures product within Tools.
- **Materials Lab and related modules** — individual applications or simulations within Native Structures.

The broader Futol Ethical Technology Ecosystems identity remains the umbrella entity, but it should appear only where organizational context is useful. It does not need to be repeated in ordinary calculator screens or every report page.

## 5. Report identity direction

Future report letterheads should be restrained and avoid repeated Futol naming.

Preferred visual order:

```text
TOOLS
Native Structures
FutolTech Engineering and Project Systems
```

A lighter alternative is:

```text
TOOLS | Native Structures
by FutolTech Engineering and Project Systems
```

The broader ecosystem identity may appear in a website About page, legal footer, governance document or formal corporate material—not as recurring report furniture.

## 6. Engineering boundary

Branding must not overstate engineering authority. Reports remain preliminary unless the applicable module, sources, project inputs, code checks and professional review establish otherwise.

Every report should preserve a visible notice that results require verification of:

- actual material source and grade;
- measured dimensions;
- load assumptions;
- supports and connections;
- workmanship and site conditions;
- applicable codes and project-specific checks;
- final professional engineering judgement.
