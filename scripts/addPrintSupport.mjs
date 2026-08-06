import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const version = '20260806-report3';
const printCss = `    <link rel="stylesheet" href="./src/printReport.css?v=${version}" />`;
const printScript = `    <script type="module" src="./src/printReport.js?v=${version}"></script>`;

const entries = await readdir(root, { withFileTypes: true });
const htmlFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name)
  .sort();

let changedCount = 0;
for (const fileName of htmlFiles) {
  const path = resolve(root, fileName);
  let html = await readFile(path, 'utf8');
  const original = html;

  if (html.includes('printReport.css')) {
    html = html.replace(/<link\s+rel="stylesheet"\s+href="\.\/src\/printReport\.css\?v=[^"]+"\s*\/>/, printCss.trim());
  } else {
    if (!html.includes('</head>')) throw new Error(`${fileName} has no closing head tag.`);
    html = html.replace('</head>', `${printCss}\n  </head>`);
  }

  if (html.includes('printReport.js')) {
    html = html.replace(/<script\s+type="module"\s+src="\.\/src\/printReport\.js\?v=[^"]+"><\/script>/, printScript.trim());
  } else {
    if (!html.includes('</body>')) throw new Error(`${fileName} has no closing body tag.`);
    html = html.replace('</body>', `${printScript}\n  </body>`);
  }

  if (html !== original) {
    await writeFile(path, html, 'utf8');
    changedCount += 1;
  }
}

console.log(`Print support checked on ${htmlFiles.length} HTML pages; ${changedCount} file(s) updated to ${version}.`);
