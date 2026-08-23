// Image render pipeline for the hncbx static site (P1).
//
// Two transforms applied to HTML strings before set:html:
//   1. lazyImages()   — append loading="lazy" decoding="async" to below-fold <img>
//                        (keeps first-screen hero + logo eager).
//   2. webpImages()   — wrap an <img src="....jpg|png"> in a <picture> that prefers the
//                        .webp twin (generated next to the original) and falls back to the
//                        original URL. This preserves historical /wp-content/uploads/... URLs.
//
// The webp twin set is computed once from the filesystem at module load so the transform
// is O(1) per image and never reads image bytes.
import fs from 'node:fs';
import path from 'node:path';

const HERO_SRCS = ['mmexport1602400234695']; // first-screen hero (must stay eager)

const WEBP_TWINS = new Set<string>();
function scanWebpTwins() {
  const dir = path.join(process.cwd(), 'public', 'wp-content', 'uploads');
  if (!fs.existsSync(dir)) return;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop()!;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.toLowerCase().endsWith('.webp')) WEBP_TWINS.add(path.basename(e.name, '.webp'));
    }
  }
}
scanWebpTwins();

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
    const bn = cleaned.split('/').pop() || '';
    const stem = bn.replace(/\.(jpe?g|png|gif)$/i, '');
    if (stem && WEBP_TWINS.has(stem)) {
      const webp = cleaned.replace(/\.(jpe?g|png|gif)$/i, '.webp');
      const inner = tag;
      return `<picture><source srcset="${webp}" type="image/webp">${inner}</picture>`;
    }
    return tag;
  });
}

export function imagePipeline(html: string): string {
  return lazyImages(webpImages(html));
}
