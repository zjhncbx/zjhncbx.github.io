#!/usr/bin/env node
/**
 * optimize-images.mjs — P1 image optimization CLI for the hncbx GitHub Pages site.
 *
 * Commands:
 *   node scripts/optimize-images.mjs audit     - read-only stats (no writes)
 *   node scripts/optimize-images.mjs optimize  - generate WebP twins for referenced static jpg/jpeg/png >= threshold (KEEPS originals)
 *   node scripts/optimize-images.mjs report    - aggregate before/after report
 *
 * Design rules:
 *   - NEVER deletes an original. Historical /wp-content/uploads/... URLs stay valid.
 *   - WebP twins are written next to the original (same basename, .webp extension)
 *     so a render-layer <picture> can prefer them while the original is the fallback.
 *   - Animated GIFs and tiny images are NOT converted (content / negligible).
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const DEFAULTS = { minBytes: 100 * 1024, quality: 80 };
const CMD = process.argv[2] || "audit";

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// Referenced uploads paths (robust: handles JSON escaping + srcset + css url()).
function readTexts() {
  const t = [];
  for (const s of ["src/data/posts.meta.json", "src/data/render_blocks.json", "src/data/livepages.json", "src/data/assets.json"]) {
    if (fs.existsSync(s)) t.push(fs.readFileSync(s, "utf-8"));
  }
  if (fs.existsSync("src/data/posts")) for (const p of walk("src/data/posts")) t.push(fs.readFileSync(p, "utf-8")); // batch ② per-post bodies
  for (const p of walk("src")) if (p.endsWith(".astro")) t.push(fs.readFileSync(p, "utf-8"));
  for (const p of walk("public")) if (p.endsWith(".css")) t.push(fs.readFileSync(p, "utf-8"));
  return t;
}
function referencedSet() {
  const refs = new Set();
  for (const t of readTexts()) {
    for (const m of t.matchAll(/\/wp-content\/uploads\/([^"'()<>\s?#]+)/g)) {
      let r = m[1].replace(/&quot;/g, "");
      r = decodeURIComponent(r).replace(/\\/g, "/").replace(/\/$/, "").replace(/&quot;$/, "");
      if (/\.(jpe?g|png)$/i.test(r)) refs.add(r);
    }
  }
  const basenames = new Set();
  for (const r of refs) basenames.add(r.split("/").pop());
  return basenames;
}

function isAnimated(p) {
  // JPEG is never animated; animated PNG (APNG) is extremely rare in this WP set.
  // Only GIFs carry meaningful page counts, and GIFs are excluded from conversion already.
  return false;
}

async function audit() {
  const files = walk("public/wp-content/uploads");
  const refBases = referencedSet();
  const staticRef = files.filter((p) => /\.(jpe?g|png)$/i.test(p) && refBases.has(path.basename(p)));
  let overThreshold = staticRef.filter((p) => fs.statSync(p).size >= DEFAULTS.minBytes && !isAnimated(p));
  let total = staticRef.reduce((s, p) => s + fs.statSync(p).size, 0);
  let target = overThreshold.reduce((s, p) => s + fs.statSync(p).size, 0);
  console.log("referenced static jpg/png files:", staticRef.length, "MB:", Math.round(total / 1048576));
  console.log("convertible (>=%dKB, not animated): %d  MB: %d", Math.round(DEFAULTS.minBytes / 1024), overThreshold.length, Math.round(target / 1048576));
  console.log("projected WebP (~%d quality) MB: ~%d", DEFAULTS.quality, Math.round(target * 0.55 / 1048576));
}

async function optimize() {
  const refBases = referencedSet();
  const files = walk("public/wp-content/uploads").filter((p) => /\.(jpe?g|png)$/i.test(p) && refBases.has(path.basename(p)));
  const candidates = files.filter((p) => fs.statSync(p).size >= DEFAULTS.minBytes && !isAnimated(p));
  console.log("optimizing candidates:", candidates.length);
  let before = 0, after = 0, made = 0, skipped = 0;
  for (const p of candidates) {
    const webp = p.replace(/\.(jpe?g|png)$/i, ".webp");
    if (fs.existsSync(webp)) { before += fs.statSync(p).size; after += fs.statSync(webp).size; made++; continue; }
    try {
      const inSize = fs.statSync(p).size;
      const buf = await sharp(p, { animated: false })
        .rotate()
        .webp({ quality: DEFAULTS.quality, effort: 4 })
        .toBuffer();
      fs.writeFileSync(webp, buf);
      before += inSize; after += buf.length; made++;
    } catch (e) { skipped++; }
  }
  console.log("webp twins written/skipped-dup:", made, "skipped(err):", skipped);
  console.log("before MB:", Math.round(before / 1048576), "after MB:", Math.round(after / 1048576), "saved MB:", Math.round((before - after) / 1048576), "ratio:", Math.round((1 - after / before) * 100) + "%");
}

function gifReferencedSet() {
  const refs = new Set();
  for (const t of readTexts()) {
    for (const m of t.matchAll(/\/wp-content\/uploads\/([^"'()<>\s?#]+)/g)) {
      let r = m[1].replace(/&quot;/g, "");
      r = decodeURIComponent(r).replace(/\\/g, "/").replace(/\/$/, "").replace(/&quot;$/, "");
      if (/\.gif$/i.test(r)) refs.add(r.split("/").pop().replace(/\.gif$/i, ""));
    }
  }
  return refs;
}

async function gifOptimize() {
  const gifBases = gifReferencedSet();
  console.log("DEBUG gifReferencedSet size:", gifBases.size);
  const allGif = walk("public/wp-content/uploads").filter((p) => /\.gif$/i.test(p));
  const files = allGif.filter((p) => gifBases.has(path.basename(p).replace(/\.gif$/i, "")));
  console.log("DEBUG all gif files:", allGif.length, "matched:", files.length);
  const targets = files.filter((p) => fs.statSync(p).size >= DEFAULTS.minBytes);
  console.log("referenced animated GIF candidates:", targets.length);
  let before = 0, after = 0, made = 0, skipped = 0, kept = 0;
  for (const p of targets) {
    const webp = p.replace(/\.gif$/i, ".webp");
    if (fs.existsSync(webp)) { before += fs.statSync(p).size; after += fs.statSync(webp).size; made++; continue; }
    try {
      const m = await sharp(p).metadata();
      if ((m.pages || 1) <= 1) { skipped++; continue; }
      const inSize = fs.statSync(p).size;
      const buf = await sharp(p, { animated: true }).webp({ quality: 80, effort: 4 }).toBuffer();
      if (buf.length >= inSize) { kept++; continue; } // don't grow
      fs.writeFileSync(webp, buf);
      before += inSize; after += buf.length; made++;
    } catch (e) { skipped++; }
  }
  console.log("animated webp twins written:", made, "skipped:", skipped, "kept-original(no-gain):", kept);
  console.log("before MB:", Math.round(before / 1048576), "after MB:", Math.round(after / 1048576), "saved MB:", Math.round((before - after) / 1048576), "ratio:", Math.round((1 - after / before) * 100) + "%");
}

function report() {
  const before = walk("public/wp-content/uploads").filter((p) => /\.(jpe?g|png)$/i.test(p));
  let origBytes = 0, webpBytes = 0, webpCount = 0;
  for (const p of before) {
    origBytes += fs.statSync(p).size;
    const webp = p.replace(/\.(jpe?g|png)$/i, ".webp");
    if (fs.existsSync(webp)) { webpBytes += fs.statSync(webp).size; webpCount++; }
  }
  console.log("originals MB:", Math.round(origBytes / 1048576));
  console.log("webp twins count:", webpCount, "MB:", Math.round(webpBytes / 1048576));
  console.log("aggregate saved MB (webp twin vs its original):", Math.round((origBytes - webpBytes) / 1048576), "ratio:", Math.round((1 - webpBytes / origBytes) * 100) + "%");
}

(async () => {
  if (CMD === "audit") await audit();
  else if (CMD === "optimize") await optimize();
  else if (CMD === "gif-optimize") await gifOptimize();
  else if (CMD === "report") report();
  else console.log("usage: optimize-images.mjs <audit|optimize|gif-optimize|report>");
})();
