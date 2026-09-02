#!/usr/bin/env node
/**
 * split-posts.mjs — batch ②: split the 12MB single-file post store into
 *
 *   src/data/posts.meta.json   array of lightweight posts (id/title/date/modified/status/
 *                              categories/thumb + PRE-GENERATED summary fields + source*)
 *   src/data/posts/<id>.html   full article body, loaded per-page at build time
 *
 * The pre-generated fields freeze the EXACT current render formulas so rebuilt
 * pages are byte-identical:
 *   excerpt = collapse/strip(excerpt || content).slice(0, 140)   (news list <p>)
 *   desc    = strip(excerpt || content).trim().slice(0, 160)     (post meta description)
 *
 * Dropped fields (zero references in src/): slug, url, views, likes, favs,
 * comments, thumbnail (dup of thumb), publishedAt (dup of date), imageCount,
 * videoCount, videoChannelCount.
 *
 * One-shot: refuses to run if src/data/posts.json no longer exists.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const POSTS = path.join(ROOT, 'src', 'data', 'posts.json');
const META = path.join(ROOT, 'src', 'data', 'posts.meta.json');
const DIR = path.join(ROOT, 'src', 'data', 'posts');

if (!fs.existsSync(POSTS)) { console.error('posts.json not found — already split?'); process.exit(1); }
if (fs.existsSync(META)) { console.error('posts.meta.json already exists — refusing to overwrite.'); process.exit(1); }

const stripTags = (h) => h.replace(/<[^>]+>/g, ' ');
const collapse = (h) => stripTags(h).replace(/\s+/g, ' ').trim();

const posts = JSON.parse(fs.readFileSync(POSTS, 'utf8'));
fs.mkdirSync(DIR, { recursive: true });

const meta = [];
for (const p of posts) {
  const srcExcerpt = p.excerpt || '';
  const basis = srcExcerpt || p.content || '';
  const entry = {
    id: p.id,
    title: p.title,
    date: p.date,
    modified: p.modified,
    status: p.status,
    categories: p.categories,
    thumb: p.thumb || '',
    excerpt: collapse(basis).slice(0, 140),
    desc: stripTags(basis).trim().slice(0, 160),
  };
  for (const k of ['sourcePlatform', 'sourceUrl', 'sourceAccount']) if (p[k]) entry[k] = p[k];
  meta.push(entry);
  fs.writeFileSync(path.join(DIR, `${p.id}.html`), p.content || '', 'utf8');
}

fs.writeFileSync(META, JSON.stringify(meta, null, 0));
fs.rmSync(POSTS);

const metaKB = (fs.statSync(META).size / 1024) | 0;
const bodiesKB = (fs.readdirSync(DIR).reduce((s, f) => s + fs.statSync(path.join(DIR, f)).size, 0) / 1024) | 0;
console.log(`split done: ${meta.length} posts | meta ${metaKB}KB | bodies ${bodiesKB}KB in ${DIR}/`);

// self-check: every meta excerpt/desc must match what the render layer used to compute
let bad = 0;
for (const [i, p] of posts.entries()) {
  const basis = p.excerpt || p.content || '';
  if (meta[i].excerpt !== collapse(basis).slice(0, 140)) bad++;
  if (meta[i].desc !== stripTags(basis).trim().slice(0, 160)) bad++;
}
console.log('formula self-check mismatches:', bad);
