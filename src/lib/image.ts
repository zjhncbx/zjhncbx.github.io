// Image render pipeline for the hncbx static site (P1/P2).
//
// Transforms applied to HTML strings before set:html:
//   1. lazyImages()  — append loading="lazy" decoding="async" to below-fold <img>
//                       (keeps first-screen hero + logo eager).
//   2. webpImages()  — wrap an <img src="....jpg|png|gif"> in a <picture> that prefers the
//                       .webp twin and falls back to the original URL. Historical URLs preserved.
//
// P2-05: the webp twin lookup is keyed by RELATIVE uploads path (e.g. "2020/10/a.jpg" ->
// "2020/10/a.webp"), NOT by basename. This avoids collisions when two directories contain a
// file with the same name (2020/photo.jpg vs 2021/photo.jpg).
import fs from 'node:fs';
import path from 'node:path';

const HERO_SRCS = ['mmexport1602400234695']; // first-screen hero (must stay eager)

// Map of relative uploads path (without extension) -> path where the .webp twin exists.
// e.g. "2020/10/mmexport..." -> "2020/10/mmexport...webp"
const WEBP_TWINS = new Map<string, string>();
function scanWebpTwins() {
  const dir = path.join(process.cwd(), 'public', 'wp-content', 'uploads');
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.toLowerCase().endsWith('.webp')) {
        const rel = p
          .replace(/\\/g, '/')
          .split('/uploads/')[1]; // strip the public/wp-content/uploads/ prefix
        if (rel) {
          const stem = rel.replace(/\.webp$/i, '');
          WEBP_TWINS.set(stem, rel);
        }
      }
    }
  }
}
scanWebpTwins();

// relative uploads path (e.g. "2020/12/a.jpg") -> relative webp path if a twin exists
function webpTwinFor(relPath: string): string | undefined {
  const stem = relPath.replace(/\.(jpe?g|png|gif)$/i, '');
  return WEBP_TWINS.get(stem);
}

export function lazyImages(html: string): string {
  return html.replace(/<img\b[^>]*?\/*>/g, (tag) => {
    if (tag.includes('loading=')) return tag;
    if (HERO_SRCS.some((h) => tag.includes(h))) return tag;
    if (tag.includes('data:image')) return tag;
    const base = tag.replace(/\/\s*>$/, '>');
    return base.replace(/>$/, ' loading="lazy" decoding="async">');
  });
}

export function webpImages(html: string): string {
  return html.replace(/<img\b[^>]*?\/*>/g, (tag) => {
    if (tag.includes('data:image')) return tag;
    const src = /src="([^"]+)"/.exec(tag)?.[1];
    if (!src || !src.startsWith('/wp-content/uploads/')) return tag;
    const cleaned = src.split('?')[0].replace(/\/$/, '');
    const rel = cleaned.replace(/^\/wp-content\/uploads\//, '');
    if (!rel) return tag;
    const webpRel = webpTwinFor(rel);
    if (webpRel) {
      const webp = '/wp-content/uploads/' + webpRel;
      const inner = tag;
      return `<picture><source srcset="${webp}" type="image/webp">${inner}</picture>`;
    }
    return tag;
  });
}

export function imagePipeline(html: string): string {
  return lazyImages(webpImages(html));
}
