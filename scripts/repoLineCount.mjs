import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'docs']);
const ignoredFiles = new Set(['package-lock.json']);
const countedExtensions = new Set(['.js', '.mjs', '.css', '.html', '.json', '.yml', '.yaml']);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && countedExtensions.has(extname(entry.name)) && !ignoredFiles.has(entry.name)) files.push(full);
  }
  return files;
}

function bucket(path) {
  const rel = relative(root, path).replaceAll('\\', '/');
  if (rel.startsWith('src/')) return 'src application + solver';
  if (rel.startsWith('scripts/')) return 'QA / engineering scripts';
  if (rel.startsWith('test/') || rel.startsWith('tests/')) return 'tests';
  if (rel.startsWith('.github/')) return 'CI configuration';
  if (rel.endsWith('.html') || rel.endsWith('.css')) return 'public pages / styles';
  return 'project configuration';
}

const files = await walk(root);
const counts = new Map();
let total = 0;
let nonBlank = 0;
for (const file of files) {
  const text = await readFile(file, 'utf8');
  const lines = text.length ? text.split(/\r?\n/).length : 0;
  const substantive = text.split(/\r?\n/).filter((line) => line.trim()).length;
  total += lines;
  nonBlank += substantive;
  const key = bucket(file);
  const current = counts.get(key) ?? { files:0, lines:0, nonBlank:0 };
  current.files += 1;
  current.lines += lines;
  current.nonBlank += substantive;
  counts.set(key, current);
}

console.log(`REPO_LINE_COUNT files=${files.length} physical_lines=${total} nonblank_lines=${nonBlank}`);
for (const [name, value] of [...counts.entries()].sort((a,b) => b[1].lines - a[1].lines)) {
  console.log(`  ${name}: files=${value.files} physical_lines=${value.lines} nonblank_lines=${value.nonBlank}`);
}
