#!/usr/bin/env node
// make-thumbnails.mjs — generate ~480px thumbnail twins (<stem>-480.webp + <stem>-480.jpg)
// next to each featured thumb. Keeps the original. Used by the news list <picture>
// (webp preferred, jpeg fallback — so the full-size original never goes to the list page).
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const posts = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "posts.meta.json"), "utf-8"));
const thumbs = new Set();
for (const p of posts) {
  if (p.status !== "publish" || !p.title || !p.thumb) continue;
  const m = /\/wp-content\/uploads\/([^?"\s]+)/.exec(p.thumb);
  if (m) thumbs.add(m[1]);
}
// batch ④: also emit <stem>-480.jpg so the news-list <picture> can fall back to a
// SMALL jpeg instead of the full-size original (which forced prune to keep every
// featured-image original in the published dist).
let madeWebp = 0, madeJpg = 0, skipped = 0;
for (const rel of thumbs) {
  const abs = path.join(root, "public", "wp-content", "uploads", rel.replace(/\//g, path.sep));
  if (!fs.existsSync(abs)) { skipped++; continue; }
  const stem = abs.replace(/\.(jpe?g|png|gif)$/i, "");
  for (const [suffix, kind] of [["-480.webp", "webp"], ["-480.jpg", "jpg"]]) {
    const out = stem + suffix;
    if (fs.existsSync(out)) { kind === "webp" ? madeWebp++ : madeJpg++; continue; }
    try {
      let img = sharp(abs, { animated: false }).rotate().resize({ width: 480, withoutEnlargement: true });
      if (kind === "jpg") img = img.flatten({ background: "#ffffff" }).jpeg({ quality: 78 });
      else img = img.webp({ quality: 78 });
      fs.writeFileSync(out, await img.toBuffer());
      kind === "webp" ? madeWebp++ : madeJpg++;
    } catch (e) { skipped++; }
  }
}
console.log("thumb twins — webp:", madeWebp, "jpg:", madeJpg, "skipped:", skipped);
