#!/usr/bin/env node
/**
 * prune-dist.mjs — Option C (P3): drop redundant "original + WebP" duplicates from dist/.
 *
 * For each original (jpg/jpeg/png/gif) in dist/wp-content/uploads that has a sibling .webp
 * twin, the twin is the resource the site serves (see src/lib/image.ts). The original is only
 * needed as a non-WebP fallback; to stay under the GitHub Pages size limit we remove it from
 * the PUBLISHED dist. The repo keeps the original (it stays in public/, so it is archived and
 * re-transmittable). Originals that are still referenced verbatim in built HTML/CSS
 * (thumbnails, header/hero/footer assets, background-image url(...)) are kept.
 *
 * Run after `astro build`:  node scripts/prune-dist.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIST = path.join(ROOT, 'dist');
const UP = path.join(DIST, 'wp-content', 'uploads');

const IMG_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// 1) concatenate every built text file so we can do a SAFE substring keep-check.
//    Any occurrence of the exact original path (in src / href / url() / style / srcset / data-*)
//    keeps the original. Only paths absent from ALL built text are pruned.
const textParts = [];
function collectText(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p !== UP) n += collectText(p); }
    else if (/\.(html|css|js|xml|json|txt)$/.test(e.name)) { textParts.push(fs.readFileSync(p, 'utf8')); n++; }
  }
  return n;
}
if (!fs.existsSync(DIST)) { console.error('dist/ not found — run `astro build` first.'); process.exit(1); }
const builtFiles = collectText(DIST);
const ALL_TEXT = textParts.join('\n');
console.log('built text files scanned:', builtFiles, '| combined text chars:', ALL_TEXT.length);

// 1b) extract the unique set of uploads references once. An original is KEPT if
//     any reference starts with its exact path — identical semantics to the old
//     `ALL_TEXT.includes(srcPath)` substring check (it also kept originals that
//     merely prefix a longer referenced path, e.g. `x.jpeg` inside `x.jpeg-bar.png`),
//     but O(1)-ish membership via a sorted prefix scan instead of 1200 full-text
//     substring searches over ~16MB.
const re = /\/wp-content\/uploads\/[^"'\\<>)\s?#]+/g;
const refs = new Set();
for (const m of ALL_TEXT.matchAll(re)) refs.add(m[0]);
textParts.length = 0; // free the ~16MB blob; only the ref set is needed now
const sortedRefs = [...refs].sort();
console.log('unique uploads refs in built text:', refs.size);
function isReferenced(srcPath) {
  // binary-search the first ref >= srcPath; kept iff it starts with srcPath
  let lo = 0, hi = sortedRefs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedRefs[mid] < srcPath) lo = mid + 1; else hi = mid;
  }
  return lo < sortedRefs.length && sortedRefs[lo].startsWith(srcPath);
}

// 2) walk uploads, delete originals that have a webp twin and whose exact path is never referenced
if (!fs.existsSync(UP)) { console.log('wp-content/uploads not in dist; nothing to prune.'); process.exit(0); }
const all = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else all.push(p); } })(UP);

const byStem = new Map();
for (const p of all) {
  const ext = path.extname(p).toLowerCase();
  if (!IMG_EXT.includes(ext)) continue;
  const stem = p.replace(/\.(jpe?g|png|gif|webp)$/i, '');
  if (!byStem.has(stem)) byStem.set(stem, {});
  byStem.get(stem)[ext] = p;
}

let deletedBytes = 0, deletedCount = 0, keptCount = 0, keptBytes = 0;
for (const [stem, set] of byStem) {
  const webp = set['.webp'];
  if (!webp) continue; // no twin -> original is the only copy, keep it
  const origExt = Object.keys(set).find((e) => e !== '.webp');
  if (!origExt) continue;
  const orig = set[origExt];
  const rel = orig.replace(UP + path.sep, '').replace(/\\/g, '/');
  const srcPath = '/wp-content/uploads/' + rel;
  if (isReferenced(srcPath)) {
    keptCount++;
    keptBytes += fs.statSync(orig).size;
    continue;
  }
  const sz = fs.statSync(orig).size;
  fs.unlinkSync(orig);
  deletedCount++;
  deletedBytes += sz;
}

// 3) report
console.log(`pruned originals: ${deletedCount}  freed ${(deletedBytes / 1e6).toFixed(1)} MB`);
console.log(`kept originals (still referenced verbatim): ${keptCount}  ${(keptBytes / 1e6).toFixed(1)} MB`);
const distMb = (() => { let b = 0, n = 0; (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) w(p); else { b += fs.statSync(p).size; n++; } } })(DIST); return { mb: b / 1e6, n }; })();
console.log(`dist now: ${distMb.mb.toFixed(1)} MB / ${distMb.n} files`);
