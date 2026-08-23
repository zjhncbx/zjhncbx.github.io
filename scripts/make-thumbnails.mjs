#!/usr/bin/env node
// make-thumbnails.mjs — generate a ~480px wide WebP thumbnail twin next to each featured thumb.
// Keeps the original; only writes <stem>-480.webp. Used by the news list <picture>.
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const posts = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "posts.json"), "utf-8"));
const thumbs = new Set();
for (const p of posts) {
  if (p.status !== "publish" || !p.title || !p.thumb) continue;
  const m = /\/wp-content\/uploads\/([^?"\s]+)/.exec(p.thumb);
  if (m) thumbs.add(m[1]);
}
let made = 0, skipped = 0;
for (const rel of thumbs) {
  const abs = path.join(root, "public", "wp-content", "uploads", rel.replace(/\//g, path.sep));
  if (!fs.existsSync(abs)) { skipped++; continue; }
  const stem = abs.replace(/\.(jpe?g|png|gif)$/i, "");
  const out = stem + "-480.webp";
  if (fs.existsSync(out)) { made++; continue; }
  try {
    const buf = await sharp(abs, { animated: false }).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
    fs.writeFileSync(out, buf);
    made++;
  } catch (e) { skipped++; }
}
console.log("thumb webp twins written:", made, "skipped:", skipped);
