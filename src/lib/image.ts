// Image render pipeline for the hncbx static site (P1/P2).
//
// Transforms applied to HTML strings before set:html:
//   1. lazyImages()  — append loading="lazy" decoding="async" to below-fold <img>
//                       (keeps first-screen hero + logo eager).
//   2. webpImages()  — wrap an <img src="....jpg|png|gif"> in a <picture> that prefers the
//                       .webp twin and falls back to the original URL. Historical URLs preserved.
//   3. sizeImages()  — (batch ④ P1-4) inject width/height from the src/data/image-sizes.json
//                       sidecar into body <img> tags lacking them, so lazy loading cannot
//                       shift layout (CLS). Files with no sidecar entry are left untouched.
//
// P2-05: the webp twin lookup is keyed by RELATIVE uploads path (e.g. "2020/10/a.jpg" ->
// "2020/10/a.webp"), NOT by basename. This avoids collisions when two directories contain a
// file with the same name (2020/photo.jpg vs 2021/photo.jpg).
import fs from 'node:fs';
import path from 'node:path';
import sizes from '../data/image-sizes.json';

/** uploads-relative stem (no extension) -> [width, height] of that image (build-time sidecar). */
const SIZES = sizes as unknown as Record<string, [number, number]>;

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

// "/wp-content/uploads/2020/12/a.jpg" -> "2020/12/a.jpg" (uploads-relative, query-stripped)
function uploadsRel(src: string): string | undefined {
  if (!src.startsWith('/wp-content/uploads/')) return undefined;
  const rel = src.split('?')[0].replace(/^\/wp-content\/uploads\//, '');
  return rel || undefined;
}

// ---- batch ④ public helpers -------------------------------------------------

/** Option C for direct <img> uses (e.g. article header thumbnail): return the .webp twin
 *  when one exists, otherwise the URL unchanged. */
export function webpTwinUrl(src: string): string {
  const rel = uploadsRel(src);
  if (!rel) return src;
  const twin = webpTwinFor(rel);
  return twin ? '/wp-content/uploads/' + twin : src;
}

export interface ThumbVariants {
  /** <img> fallback URL: small -480.jpg when generated, else the original thumb */
  src: string;
  /** <source> webp URL (-480.webp), undefined when absent */
  webp?: string;
  width: number;
  height: number;
}

const PUBLIC_DIR = path.join(process.cwd(), 'public');
function publicFile(relUrl: string): boolean {
  try {
    return fs.existsSync(path.join(PUBLIC_DIR, relUrl));
  } catch {
    return false;
  }
}

/** List-thumbnail triple (batch ④): -480.webp / -480.jpg twins + intrinsic size,
 *  falling back per-file so a thumb without generated twins still renders. */
export function thumbVariants(thumb: string): ThumbVariants {
  const rel = uploadsRel(thumb);
  const m = rel && /^(.*)\.(jpe?g|png|gif)$/i.exec(rel);
  if (!m) return { src: thumb, width: 480, height: 300 };
  const stemUrl = '/wp-content/uploads/' + m[1];
  const jpg = stemUrl + '-480.jpg';
  const webp = stemUrl + '-480.webp';
  const dims = SIZES[m[1] + '-480'];
  return {
    src: publicFile(jpg) ? jpg : thumb,
    webp: publicFile(webp) ? webp : undefined,
    width: dims ? dims[0] : 480,
    height: dims ? dims[1] : 300,
  };
}

/** Intrinsic size of an uploads URL from the sidecar (extension-agnostic). */
export function imageSize(src: string): [number, number] | undefined {
  const rel = uploadsRel(src);
  if (!rel) return undefined;
  return SIZES[rel.replace(/\.(jpe?g|png|gif|webp)$/i, '')];
}

/** Inject missing intrinsic width/height (build-time sidecar) into uploads <img> tags. */
export function sizeImages(html: string): string {
  return html.replace(/<img\b[^>]*?\/*>/g, (tag) => {
    if (/\swidth=/.test(tag) || /\sheight=/.test(tag)) return tag;
    const src = /src="([^"]+)"/.exec(tag)?.[1];
    if (!src) return tag;
    const rel = uploadsRel(src);
    if (!rel) return tag;
    const dims = SIZES[rel.replace(/\.(jpe?g|png|gif|webp)$/i, '')];
    if (!dims) return tag;
    const base = tag.replace(/\/\s*>$/, '>');
    return base.replace(/>$/, ` width="${dims[0]}" height="${dims[1]}">`);
  });
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
      // Option C (P3): when a .webp twin exists, serve WebP directly. The original file
      // is kept in the repo (archive) but is no longer referenced by body content, so it
      // can be pruned from the published dist to stay under the GitHub Pages size limit.
      const inner = tag.replace(/src="[^"]*"/, `src="${webp}"`);
      return `<picture><source srcset="${webp}" type="image/webp">${inner}</picture>`;
    }
    return tag;
  });
}

export function imagePipeline(html: string): string {
  return lazyImages(sizeImages(webpImages(html)));
}
