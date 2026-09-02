#!/usr/bin/env node
/**
 * audit-orphans.mjs — find and (optionally) delete unreferenced static resources.
 *
 * Two categories:
 *   1. uploads   : public/wp-content/uploads files that no source-of-truth text references,
 *                  directly or via their generated WebP twins (<stem>.webp / <stem>-480.webp / <stem>-480.jpg).
 *   2. framework : public/wp-content/{plugins,themes} + public/wp-includes files not needed by
 *                  the asset closure (assets.json + embedded <link>/<script> in captured HTML),
 *                  expanded transitively through CSS url()/@import and conservative basename
 *                  hits inside kept JS. Legacy font formats (eot/ttf/otf/svg-in-fonts-dir) are
 *                  intentionally NOT pulled into the closure: no modern browser fetches them.
 *
 * Modes:
 *   node scripts/audit-orphans.mjs                       # report only (default)
 *   node scripts/audit-orphans.mjs --plugins             # report category 2 as well
 *   node scripts/audit-orphans.mjs --delete              # actually delete (uploads)
 *   node scripts/audit-orphans.mjs --plugins --delete    # delete both
 *   node scripts/audit-orphans.mjs --manifest <path>     # write full deletion manifest
 *
 * Design rules (same as the image pipeline):
 *   - Reference detection is substring/token based on: src/data/*.json, src/**.{ts,astro},
 *     scripts/**.mjs, public/**.{css,html,js,xml,txt} and public/{CNAME,robots.txt}.
 *   - Filenames in this repo contain no spaces/parens (sanitized at import); refs are raw
 *     (no percent-encoding, no JSON-escaped slashes) — verified 2026-08.
 *   - A missing-file ref is ignored; sanity thresholds abort on extraction bugs.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const DO_PLUGINS = argv.includes('--plugins');
const DO_DELETE = argv.includes('--delete');
const manifestPath = argv.includes('--manifest') ? argv[argv.indexOf('--manifest') + 1] : null;

const PUB = path.join(ROOT, 'public');
const UPLOADS = path.join(PUB, 'wp-content', 'uploads');
const FW_DIRS = ['wp-content/plugins', 'wp-content/themes', 'wp-includes'].map((d) => path.join(PUB, d));

const TEXT_EXT = new Set(['.css', '.html', '.js', '.xml', '.txt', '.json', '.svg']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const pubRel = (p) => '/' + path.relative(PUB, p).split(path.sep).join('/');
const bytes = (p) => (fs.existsSync(p) ? fs.statSync(p).size : 0);

// ---------------------------------------------------------------- corpus ---
// All files that may *contain* references (public text files included: an
// orphan file's own text never counts as a ref to itself because refs always
// carry the /wp-... path and live in other files; over-keep is fine anyway).
const corpusFiles = [
  ...walk(path.join(ROOT, 'src')),
  ...walk(path.join(ROOT, 'scripts')),
  ...walk(PUB).filter((p) => TEXT_EXT.has(path.extname(p).toLowerCase())),
];
const corpusParts = [];
for (const f of corpusFiles) {
  if (f.includes(`${path.sep}uploads${path.sep}`)) continue; // data never lives under public/uploads except elementor css
  if (path.extname(f).toLowerCase() === '.svg') continue; // svg fonts contain glyph paths, not refs
  try { corpusParts.push(fs.readFileSync(f, 'utf8')); } catch { /* binary */ }
}
// elementor custom css lives under uploads and IS referenced by assets.json — include it.
for (const p of walk(UPLOADS)) if (/\.css$/i.test(p)) corpusParts.push(fs.readFileSync(p, 'utf8'));
const CORPUS = corpusParts.join('\n');
console.log('corpus chars:', CORPUS.length);

// ------------------------------------------------------- uploads orphans ---
const refTokens = new Set();
for (const m of CORPUS.matchAll(/\/wp-content\/uploads\/[^"'\\<>)\s?#]+/g)) {
  let t = m[0].replace(/&(quot|amp|#36);$/i, '').replace(/[,.]$/, '');
  refTokens.add(decodeURIComponent(t));
}
console.log('upload ref tokens:', refTokens.size);

// keep-set derived from references, expanded with generated twins:
//   for every referenced uploads path R we keep R itself, plus R's .webp twin
//   (served by the render pipeline) and R's -480.webp thumb (built by
//   make-thumbnails.mjs and referenced at build time, never in source).
// An upload file is an ORPHAN iff nothing (and no ref expands to it) names it.
const uploadKeep = new Set();
const stripUp = (t) => t.replace(/^\/wp-content\/uploads\//, '');
for (const tok of refTokens) {
  const rel = stripUp(tok);
  uploadKeep.add(rel);
  uploadKeep.add(rel.replace(/\.(jpe?g|png|gif)$/i, '.webp'));
  uploadKeep.add(rel.replace(/\.(jpe?g|png|gif)$/i, '-480.webp'));
  uploadKeep.add(rel.replace(/\.(jpe?g|png|gif)$/i, '-480.jpg')); // batch ④ jpeg fallback twin
  // if source references a .webp directly, keep its original too (fallback/archive)
  uploadKeep.add(rel.replace(/\.webp$/i, '.jpg'));
  uploadKeep.add(rel.replace(/\.webp$/i, '.jpeg'));
  uploadKeep.add(rel.replace(/\.webp$/i, '.png'));
  uploadKeep.add(rel.replace(/\.webp$/i, '.gif'));
}
const uploadFiles = walk(UPLOADS);
const uploadOrphans = [];
for (const abs of uploadFiles) {
  const rel = pubRel(abs).replace('/wp-content/uploads/', '');
  if (!uploadKeep.has(rel)) uploadOrphans.push(rel);
}
const orphanAbs = uploadOrphans.map((r) => path.join(UPLOADS, r.split('/').join(path.sep)));
const orphanBytes = orphanAbs.reduce((s, p) => s + bytes(p), 0);
console.log(`uploads: ${uploadFiles.length} files | orphans: ${orphanAbs.length} (${(orphanBytes / 1e6).toFixed(1)} MB)`);

// sanity: extraction must have found a healthy fraction, else abort.
const kept = uploadFiles.length - orphanAbs.length;
if (kept < 1500) { console.error(`ABORT: only ${kept} uploads kept — ref extraction looks broken.`); process.exit(1); }

// ------------------------------------------------------ framework closure ---
let fwOrphans = [];
if (DO_PLUGINS) {
  const fwFiles = FW_DIRS.flatMap((d) => walk(d));
  const fwByPath = new Map(fwFiles.map((abs) => [pubRel(abs), abs]));
  const keep = new Set();
  const queue = [];
  const addKeep = (absPath) => { if (absPath && !keep.has(absPath)) { keep.add(absPath); queue.push(absPath); } };

  // entries: any /wp-content/* or /wp-includes/* token present in the corpus
  for (const m of CORPUS.matchAll(/\/(?:wp-content|wp-includes)\/[^"'\\<>)\s?#]+/g)) {
    const t = decodeURIComponent(m[0].replace(/[?].*$/, '').replace(/&(quot|amp|#36);$/i, ''));
    const hit = fwByPath.get(t);
    if (hit) addKeep(hit);
  }
  console.log('framework entries:', keep.size, '/', fwFiles.length, 'files');

  const LEGACY_FONT = /\.(eot|ttf|otf)$/i;
  while (queue.length) {
    const f = queue.pop();
    const ext = path.extname(f).toLowerCase();
    const text = (() => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } })();
    if (ext === '.css') {
      const dir = path.dirname(f);
      for (const m of text.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)|@import\s+['"]([^'"]+)['"]/g)) {
        const raw = (m[1] || m[2] || '').split('?')[0].split('#')[0];
        if (!raw || /^data:/.test(raw)) continue;
        let target;
        if (raw.startsWith('/')) target = path.join(PUB, raw);
        else target = path.resolve(dir, raw);
        if (LEGACY_FONT.test(target)) continue; // never fetched by modern browsers
        if (/\.(svg)$/i.test(target) && /\/(webfonts|fonts)\//i.test(target)) continue;
        if (fs.existsSync(target) && fwByPath.has(pubRel(target))) addKeep(target);
      }
    }
  }
  // conservative JS pass: kept JS may reference files by bare basename at runtime
  const keptJsText = [...keep].filter((f) => f.endsWith('.js')).map((f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return ''; } }).join('\n');
  for (const [rel, abs] of fwByPath) {
    if (keep.has(abs)) continue;
    const base = path.basename(rel);
    if (/\.(js|css|woff2?)$/i.test(base) && keptJsText.includes(base)) addKeep(abs);
  }
  for (const [rel, abs] of fwByPath) if (!keep.has(abs)) fwOrphans.push(rel);
  const fwBytes = fwOrphans.reduce((s, r) => s + bytes(path.join(PUB, r.split('/').join(path.sep))), 0);
  console.log(`framework: ${fwFiles.length} files | orphans: ${fwOrphans.length} (${(fwBytes / 1e6).toFixed(1)} MB)`);
}

// ------------------------------------------------------------------ output ---
const totalOrphanBytes = orphanBytes + fwOrphans.reduce((s, r) => s + bytes(path.join(PUB, r.split('/').join(path.sep))), 0);
const byExt = {};
for (const r of uploadOrphans) { const e = path.extname(r).toLowerCase(); byExt[e] = (byExt[e] || 0) + 1; }
console.log('orphan ext histogram:', byExt);
console.log('top 15 orphans:');
console.log([...uploadOrphans, ...(DO_PLUGINS ? fwOrphans : [])]
  .map((r) => [bytes(path.join(PUB, r.split('/').join(path.sep))), r])
  .sort((a, b) => b[0] - a[0]).slice(0, 15)
  .map(([b, r]) => `${(b / 1e6).toFixed(2)}MB /${r}`).join('\n'));

if (manifestPath) {
  const lines = [
    '# 孤儿资源清单与删除记录（批次① · 2026-08-27）', '',
    '> 生成：`node scripts/audit-orphans.mjs --plugins --manifest docs/orphans-2026-08.md`', '',
    `## uploads 孤儿（${uploadOrphans.length} 个，${(orphanBytes / 1e6).toFixed(1)} MB）`, '',
    ...uploadOrphans.map((r) => `- /wp-content/uploads/${r}`), '',
    ...(DO_PLUGINS ? [`## framework 未引用（${fwOrphans.length} 个）`, '', ...fwOrphans.map((r) => `- ${r}`)] : []),
  ];
  fs.writeFileSync(manifestPath, lines.join('\n'));
  console.log('manifest written:', manifestPath);
}

if (DO_DELETE) {
  let n = 0, b = 0;
  for (const abs of orphanAbs) { b += bytes(abs); fs.rmSync(abs); n++; }
  for (const rel of fwOrphans) { const abs = path.join(PUB, rel.split('/').join(path.sep)); b += bytes(abs); fs.rmSync(abs); n++; }
  console.log(`DELETED ${n} files, freed ${(b / 1e6).toFixed(1)} MB`);
} else {
  console.log(`REPORT ONLY — would delete ${uploadOrphans.length + fwOrphans.length} files / ${(totalOrphanBytes / 1e6).toFixed(1)} MB`);
}
