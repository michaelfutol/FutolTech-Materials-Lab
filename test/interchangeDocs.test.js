import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const contractDoc = await readFile(new URL('../docs/STRUCTURAL_INTERCHANGE_V1.md', import.meta.url), 'utf8');
const checklist = await readFile(new URL('../docs/STRUCTURAL_LAB_MASTER_CHECKLIST.md', import.meta.url), 'utf8');

test('Structural Interchange v1 documentation preserves schema and no-invented-degradation boundary', () => {
  assert.match(contractDoc, /futoltech\.structural-interchange\/1/);
  assert.match(contractDoc, /Structural Lab → FutolStructure/);
  assert.match(contractDoc, /FutolStructure → Structural Lab/);
  assert.match(contractDoc, /Structural Lab → RPE/);
  assert.match(contractDoc, /UNAVAILABLE/);
  assert.match(contractDoc, /does not authorize RPE to invent|may be invented|does not.*invent/i);
  assert.match(contractDoc, /Unsupported schema versions.*fail|reject/i);
});

test('master scoreboard records all ten foundation milestones complete while deeper roadmap remains distinct', () => {
  assert.match(checklist, /10\. \[x\] \*\*FutolStructure \/ RPE interchange v1\*\*/);
  assert.match(checklist, /# 12 — FutolTech Ecosystem Integration — interchange v1 COMPLETE/);
  assert.match(checklist, /\[ \] \*\*CODA:\*\*/);
  assert.match(checklist, /\[ \] \*\*SARA:\*\*/);
  assert.match(checklist, /# 9 — Structural Forensics\s+\n- \[ \]/);
  assert.match(checklist, /# 10 — Field Mode\s+\n- \[ \]/);
});
