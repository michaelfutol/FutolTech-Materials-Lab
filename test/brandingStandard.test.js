import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const branding = await readFile(new URL('../docs/BRANDING_STANDARD.md', import.meta.url), 'utf8');

test('branding standard distinguishes product and company identities', () => {
  assert.match(branding, /FutolTech Structural Lab/);
  assert.match(branding, /Virtual Materials, Members & Connection Testing/);
  assert.match(branding, /FUTOLTECH ENGINEERING AND PROJECT SYSTEMS/);
  assert.match(branding, /existing repository and GitHub Pages URL remain unchanged/i);
});
