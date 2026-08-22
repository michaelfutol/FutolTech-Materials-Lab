# M3 Roof Zone Geometry Acceptance Candidate

Candidate branch: `feat/m3-roof-zone-geometry`

This slice is not milestone-complete until:

1. the implementation PR is green on its preliminary head;
2. all four project source-of-truth milestone/checklist files are synchronized to the verified result;
3. the documentation-updated exact final head passes the complete Engineering Checks suite; and
4. only then is the PR merged.

Current acceptance target:

- deterministic symmetric-gable zone geometry;
- explicit Roof Bay placement within whole-roof coordinates;
- exact field/edge/corner intersections for every physical purlin tributary band;
- area conservation at both band and whole-bay levels;
- no `GCp`, final pressure, overhang, roof-sheet, fastener, or capacity promotion.
