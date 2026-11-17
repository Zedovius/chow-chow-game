// Convierte la presentación (docs/presentación-chow-chow-game.md) en un PDF con los colores de la
// marca: fondo negro, texto blanco y títulos y líneas en rojo (el logo de Firio Studio, naranja). El
// .md queda sin estilos, así se lee bien en cualquier visualizador; los colores solo van en el PDF.
//
// Uso:   node tools/presentacion.mjs        (o npm run presentacion)
// Crea:  docs/presentación-chow-chow-game.html y docs/presentación-chow-chow-game.pdf
//
// El PDF lo imprime Chrome (o Edge) sin ventana. Si no lo encuentra, se puede indicar con la variable
// CHROME (la ruta al ejecutable). Sin dependencias: entiende el Markdown que usa la presentación
// (títulos, párrafos, negritas, cursivas, enlaces, imágenes, listas, citas, tablas, líneas y HTML).

import { readFile, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'docs', 'presentación-chow-chow-game.md');
const htmlFile = source.replace(/\.md$/, '.html');
const pdfFile = source.replace(/\.md$/, '.pdf');

const CSS = `
  @page { size: A4; margin: 0; }
  html, body { background: #000; }
  body {
    margin: 0;
    padding: 18mm 18mm 14mm;
    color: #fff;
    font: 11pt/1.5 "Segoe UI", Helvetica, Arial, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1, h2, h3 { color: #e0262f; line-height: 1.2; }
  h1 { font-size: 26pt; margin: 0.4em 0 0.2em; text-align: center; }
  h2 { font-size: 16pt; margin: 1.2em 0 0.4em; break-after: avoid; }
  h3 { font-size: 13pt; }
  p { margin: 0.5em 0; }
  a { color: #e0262f; }
  strong { color: #fff; }
  hr { border: 0; border-top: 2px solid #e0262f; margin: 1.4em 0; }
  img { max-width: 100%; }
  .figure { margin: 0.8em 0; text-align: center; break-inside: avoid; }
  .figure img { border: 1px solid #333; }
  ul { margin: 0.5em 0; padding-left: 1.3em; }
  li { margin: 0.3em 0; }
  li::marker { color: #e0262f; }
  blockquote { margin: 0.8em 0; padding: 0.2em 0 0.2em 14px; border-left: 4px solid #e0262f; }
  table { border-collapse: collapse; margin: 0.8em 0; break-inside: avoid; }
  th { color: #e0262f; text-align: left; }
  th, td { border: 1px solid #fff; padding: 4px 10px; }
`;

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Negritas, cursivas, código, enlaces e imágenes dentro de una línea. */
function inline(text) {
  return escape(text)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** El Markdown de la presentación, en HTML. */
function toHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let i = 0;
  const take = (test) => {
    const block = [];
    while (i < lines.length && test(lines[i])) block.push(lines[i++]);
    return block;
  };
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
    } else if (/^<\w/.test(line.trim())) {
      out.push(line); // HTML tal cual (el logo, el pie)
      i++;
    } else if (/^#{1,3} /.test(line)) {
      const level = line.match(/^#+/)[0].length;
      out.push(`<h${level}>${inline(line.slice(level + 1).trim())}</h${level}>`);
      i++;
    } else if (/^---+\s*$/.test(line)) {
      out.push('<hr>');
      i++;
    } else if (/^!\[[^\]]*\]\([^)]+\)\s*$/.test(line)) {
      out.push(`<p class="figure">${inline(line.trim())}</p>`);
      i++;
    } else if (line.startsWith('>')) {
      const block = take((l) => l.startsWith('>')).map((l) => l.replace(/^>\s?/, ''));
      out.push(`<blockquote><p>${inline(block.join(' '))}</p></blockquote>`);
    } else if (/^- /.test(line)) {
      const items = [];
      while (i < lines.length && (/^- /.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^- /.test(lines[i])) items.push(lines[i].slice(2).trim());
        else items[items.length - 1] += ` ${lines[i].trim()}`;
        i++;
      }
      out.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`);
    } else if (line.startsWith('|')) {
      const rows = take((l) => l.startsWith('|')).filter((l) => !/^\|[\s|:-]+\|?$/.test(l));
      const cells = (row) => row.trim().replace(/^\||\|$/g, '').split('|').map((cell) => inline(cell.trim()));
      const [head, ...body] = rows;
      out.push(`<table><thead><tr>${cells(head).map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${cells(row).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    } else {
      // Un párrafo: hasta la siguiente línea vacía o el siguiente bloque. Una línea que termina en
      // texto y la siguiente sigue el mismo párrafo
      const block = take((l) => l.trim() && !/^(#{1,3} |---|>|- |\||<\w|!\[)/.test(l));
      out.push(`<p>${inline(block.join(' '))}</p>`);
    }
  }
  return out.join('\n');
}

const exists = (file) => access(file).then(() => true, () => false);

async function findChrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean);
  for (const file of candidates) if (await exists(file)) return file;
  return null;
}

const markdown = await readFile(source, 'utf8');
const title = markdown.match(/^# (.+)$/m)?.[1] ?? 'Presentación';
const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${escape(title)}</title>
<style>${CSS}</style>
</head>
<body>
${toHtml(markdown)}
</body>
</html>
`;
await writeFile(htmlFile, html);
console.log(`HTML: ${path.relative(root, htmlFile)}`);

const chrome = await findChrome();
if (!chrome) {
  console.error('No encontré Chrome ni Edge para hacer el PDF. Abre el HTML e imprímelo como PDF (con «Gráficos de fondo»), o indica la ruta con CHROME=...');
  process.exit(1);
}
const result = spawnSync(chrome, [
  '--headless=new',
  '--disable-gpu',
  '--allow-file-access-from-files',
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfFile}`,
  pathToFileURL(htmlFile).href,
], { encoding: 'utf8' });
if (result.status !== 0 || !(await exists(pdfFile))) {
  console.error('No se pudo hacer el PDF.', result.stderr || result.error || '');
  process.exit(1);
}
console.log(`PDF: ${path.relative(root, pdfFile)}`);
