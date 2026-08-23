#!/usr/bin/env node
/**
 * import-wechat-articles.mjs — Migrate 微信公众号 articles into the hncbx Astro site.
 *
 * Usage:
 *   node scripts/import-wechat-articles.mjs --all          fetch + import every article in the manifest
 *   node scripts/import-wechat-articles.mjs --article 3    import a single article (1-indexed)
 *   node scripts/import-wechat-articles.mjs --resume       import only articles not already imported
 *   node scripts/import-wechat-articles.mjs --dry-run      parse + stage assets, do not touch posts.json
 *
 * Rules honoured (from the task book):
 *   - Keeps the ORIGINAL image bytes (historical URLs stay valid).
 *   - Generates a .webp twin next to every jpg/png/gif (animated for gif) so the render
 *     layer <picture> can prefer it, with the original as the fallback.
 *   - Localises every mmbiz.qpic.cn / mmbiz.qlogo.cn / gtimg cover resource.
 *   - 视频号/受保护视频流 are NOT downloaded: translated to a cover+info+entry card.
 *   - 腾讯视频 iframes are kept as legitimate responsive embeds.
 *   - Inline content is stripped of WeChat JS/dead data attrs; images rewritten to local URLs.
 */
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CACHE = path.join(ROOT, '_import_tmp', 'cache');
const WORK = path.join(ROOT, '_import_tmp');
const POSTS_FILE = path.join(ROOT, 'src', 'data', 'posts.json');
const WECHAT_ROOT = path.join(ROOT, 'public', 'wp-content', 'uploads', 'wechat');
const IMPORTED_FILE = path.join(WORK, 'imported.json');
const SITE = 'https://www.hncbx.org.cn';

for (const d of [CACHE, WECHAT_ROOT]) if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });

// The exact full URLs from the task book (must keep chksm to avoid the captcha wall).
const ARTICLES = [
  { n: 1, url: 'https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507366&idx=1&sn=306fa9f3531a021b297d5320daf02c14&chksm=e8fc2f5547edc300215d59d03649a6240c6e5a8ad497457349aaa62207b7ab55a94a00771556&mpshare=1&scene=1&srcid=0823DpAZZrNm2lrmXFjPhdAI' },
  { n: 2, url: 'https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507494&idx=1&sn=79e5bc4ab9d3f2d92be0413046f70ad9&chksm=e81711f59a84e73fe509158669b5fd91017070cd8a12bd7347a4298bf4bf678902ffd89bd7c1&mpshare=1&scene=1&srcid=0823o3e5rgKKZwLjA6yDL2Yy' },
  { n: 3, url: 'https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507530&idx=1&sn=6b773a2c551905e86a3536e44c118e22&chksm=e833c5d621e317425cdc865af3e5d2c519f23b030ddded86016d15aed469237a00e9439639ca&mpshare=1&scene=1&srcid=0823pmKMeXxhlCViimXUu2pz' },
  { n: 4, url: 'https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507598&idx=1&sn=85942d42c8d336b0a4db6babc77a1b39&chksm=e8cd16c49f111a6d37e39375d565fb8b41642538ce4ea5dacbdc0b53fb2ff65d89e02e31ed19&mpshare=1&scene=1&srcid=0823myluviKcPqgsMsYRnXYQ' },
  { n: 5, url: 'https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507633&idx=1&sn=27308d95e7d9f1b4e1cac858e2d1b9ef&chksm=e868427665da247f31f16e6bd5ae9436ae95417129c9b8d2335b2713844adbb8da4a959cc540&mpshare=1&scene=1&srcid=082377zIQoAb9wv9qFH2RmHF' },
  { n: 6, url: 'https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548652&idx=1&sn=c27d9e6fcf0b30a16ea3fa51cdbbde2d&chksm=c40bb0fd7987cb737bd1f9a0c2971e47a523384ef8b520f962ede2f3ac2a955e2ec0f1c6df5a&mpshare=1&scene=1&srcid=0823qd5FurLi5bBf8dQFt9zu' },
  { n: 7, url: 'https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548890&idx=2&sn=fd85d306aa391e90f19241a4ccdce767&chksm=c42ba979365e84a785f026c0b8a342bd1830306e8ca5db8441e4cb01dc071243a18ee900e0bd&mpshare=1&scene=1&srcid=0823318g1VSMQCfTwKr6zmCn' },
  { n: 8, url: 'https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548890&idx=1&sn=815099acabdb6778f6521dc6d1d59d7d&chksm=c40aff949d15acfa778078bb69a6be63482df1e57e992303cc07bce4868d8cf7484be2c0d6a5&mpshare=1&scene=1&srcid=0823tfRTHDMUnprhhv6rVX31' },
  { n: 9, url: 'https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548927&idx=2&sn=6835d26561871b777887d56602c0345e&chksm=c4d29cd0a67f31a0801432434c75210e2832f52b356b3bf12ffeb57ba076c9a0b04acf3ce51d&mpshare=1&scene=1&srcid=0823QHkPkQMMyr9fXKkWlZJ2' },
  { n: 10, url: 'https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548982&idx=1&sn=6ad250a149bb8bcf2e0e078677170006&chksm=c48002dfdae36ddf0495bf9bc862596d62e01b952396c45a8fdf5f33d87891b80ef401789035&mpshare=1&scene=1&srcid=0823MPfgadqyKgjO7XZV8Y2g' },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36';

// ---------- helpers ----------
const escAttr = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const htmlDecode = (s) =>
  String(s ?? '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function slugify(s) {
  let t = String(s ?? '').toLowerCase().trim();
  // keep CJK Han + latin/digits, drop punctuation
  // eslint-disable-next-line no-control-regex
  t = t.replace(/[^\p{Script=Han}a-z0-9]+/gu, '-').replace(/^-+|-+$/g, '');
  t = t.slice(0, 44).replace(/-+$/, '');
  return t || 'article';
}

// ---------- fetch ----------
async function getHtml(a) {
  const cacheFile = path.join(CACHE, `art${String(a.n).padStart(2, '0')}.html`);
  if (fs.existsSync(cacheFile)) return { html: fs.readFileSync(cacheFile, 'utf8'), cached: true };
  const r = await fetch(a.url, { headers: { 'User-Agent': UA, Referer: 'https://mp.weixin.qq.com/' } });
  const html = await r.text();
  if (!html.includes('id="js_content"')) {
    throw new Error(`art${a.n}: js_content not found (status ${r.status}, len ${html.length})`);
  }
  fs.writeFileSync(cacheFile, html);
  return { html, cached: false };
}

// ---------- parse ----------
function meta(html) {
  const title = htmlDecode((html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || '');
  const date =
    (html.match(/var createTime = '([^']*)'/) || [])[1] ||
    (html.match(/var createTime = "([^"]*)"/) || [])[1] ||
    (html.match(/id="publish_time"[^>]*>([^<]*)</) || [])[1] ||
    '';
  const nickname = htmlDecode(
    (html.match(/var nickname = htmlDecode\("([^"]*)"\)/) || [])[1] ||
      (html.match(/var nickname = "([^"]*)"/) || [])[1] ||
      '',
  );
  // account public name
  const account = htmlDecode(
    (html.match(/var nickname = htmlDecode\("([^"]*)"\)/) || [])[1] ||
      (html.match(/id="js_name"[^>]*>([\s\S]*?)</) || [])[1] ||
      '',
  );
  return { title: title.trim(), date: date.trim(), nickname, account };
}

function jsContent(html) {
  const m = html.match(/<div[^>]*id="js_content"[^>]*>([\s\S]*?)(<\/div>\s*<script|$)/);
  if (m && m[1]) return m[1];
  return '';
}

// ---------- asset manager ----------
function loadImported() {
  try { return JSON.parse(fs.readFileSync(IMPORTED_FILE, 'utf8')); }
  catch { return { posts: [] }; }
}
function saveImported(data) { fs.writeFileSync(IMPORTED_FILE, JSON.stringify(data, null, 2)); }

function sniffFormat(buf) {
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e) return 'png';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
const EXT = { jpeg: 'jpg', jpg: 'jpg', png: 'png', gif: 'gif', webp: 'webp' };

class AssetManager {
  constructor() {
    this.urlToRel = new Map(); // full url -> wechat rel path (e.g. 2026/03/wx01/001.jpg)
    this.articleCounters = new Map(); // slug -> next ordinal
    this.downloads = 0;
    this.skipped = 0;
  }
  async fetchBytes(url, referer = 'https://mp.weixin.qq.com/') {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: referer } });
    if (!r.ok) throw new Error(`HTTP ${r.status} for ${url}`);
    return { buf: Buffer.from(await r.arrayBuffer()), ctype: r.headers.get('content-type') || '' };
  }
  async download(url, slug) {
    const clean = url.replace(/&amp;/g, '&').split('#')[0];
    if (this.urlToRel.has(clean)) return { rel: this.urlToRel.get(clean), reused: true };
    const extFromUrl = (clean.match(/wx_fmt=([a-z0-9]+)/i) || [])[1];
    const { buf, ctype } = await this.fetchBytes(clean);
    let ext = EXT[sniffFormat(buf)] || EXT[httpExt(ctype)] || EXT[extFromUrl] || 'jpg';
    const ordinal = (this.articleCounters.get(slug) || 0) + 1;
    this.articleCounters.set(slug, ordinal);
    const rel = `${slug}/${String(ordinal).padStart(3, '0')}.${ext}`;
    this.urlToRel.set(clean, rel);
    const abs = path.join(WECHAT_ROOT, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    if (!fs.existsSync(abs)) { fs.writeFileSync(abs, buf); this.downloads++; }
    else this.skipped++;

    // webp twin (skip when already webp)
    if (ext !== 'webp') {
      const twin = abs.replace(/\.(jpe?g|png|gif)$/i, '.webp');
      const isAnimatedGif = ext === 'gif';
      if (!fs.existsSync(twin)) {
        try { await sharp(buf, { animated: isAnimatedGif }).webp({ quality: 80 }).toFile(twin); }
        catch { /* non-animatable */ }
      }
    }
    return { rel, reused: false };
  }

  // Ensure a -480.webp list thumbnail exists for a chosen cover (decoupled from dedup).
  async ensureThumb480(localSrc) {
    if (!localSrc) return;
    const abs = path.join(WECHAT_ROOT, localSrc.replace(/^\/wp-content\/uploads\/wechat\//, ''));
    if (!fs.existsSync(abs)) return;
    const ext = path.extname(abs).slice(1).toLowerCase();
    if (ext === 'webp') return;
    const t480 = abs.replace(/\.(jpe?g|png|gif)$/i, '-480.webp');
    if (!fs.existsSync(t480)) {
      try { await sharp(abs).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toFile(t480); }
      catch { /* ignore */ }
    }
  }
}
function httpExt(ctype) { return { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp' }[(ctype || '').split(';')[0]] || null; }

const wechatUrl = (rel) => '/wp-content/uploads/wechat/' + rel;

// ---------- content transforms ----------
function videoCard({ cover, title, account, sourceUrl }) {
  return `<div class="wechat-video-card"><a class="wechat-video-card__link" href="${escAttr(sourceUrl)}" target="_blank" rel="noopener">` +
    `<span class="wechat-video-card__cover"><img src="${escAttr(cover)}" alt="${escAttr(title)}" loading="lazy" decoding="async"><span class="wechat-video-card__play">▶</span></span>` +
    `<span class="wechat-video-card__meta"><strong>${escAttr(title)}</strong><span class="wechat-video-card__acct">${escAttr(account)} · 视频</span><span class="wechat-video-card__cta">查看原视频 →</span></span>` +
    `</a></div>`;
}
function audioCard({ cover, name, singer, sourceUrl }) {
  return `<div class="wechat-audio-card"><a class="wechat-audio-card__link" href="${escAttr(sourceUrl)}" target="_blank" rel="noopener">` +
    `<img class="wechat-audio-card__cover" src="${escAttr(cover)}" alt="${escAttr(name)}" loading="lazy" decoding="async">` +
    `<span class="wechat-audio-card__meta"><strong>${escAttr(name)}</strong><span>${escAttr(singer)}</span><span class="wechat-audio-card__cta">试听 / 原文 →</span></span>` +
    `</a></div>`;
}
function tencentEmbed(url) {
  return `<div class="wechat-video-frame"><iframe src="${escAttr(url)}" title="腾讯视频" loading="lazy" allowfullscreen allow="autoplay; encrypted-media" frameborder="0"></iframe></div>`;
}

async function transformContent(jc, ctx) {
  const { slug, account, sourceUrl, assets } = ctx;
  let html = jc
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // drop WeChat-only data attributes / leftover noise (full name="value" pairs)
    .replace(/\s(nodeleaf|data-mpa-action-id|data-pm-slice|data-aistatus|data-imgfileid|data-backw|data-backh|data-ratio|data-w|data-type|data-pluginname)(="[^"]*")?/g, '');

  // Drop images that carry no source at all (WeChat lazy placeholders)
  html = html.replace(/<img\b(?![^>]*(?:src=|data-src=))[^>]*>/gi, '');

  // --- images (mmbiz) ---
  html = await replaceAsync(html, /<img\b[^>]*>/gi, async (tag) => {
    const raw = (tag.match(/data-src="([^"]+)"/) || [])[1] || (tag.match(/src="([^"]+)"/) || [])[1];
    if (!raw || !/mmbiz\.(qpic|qlogo)\.cn/.test(raw)) return tag;
    const { rel } = await assets.download(raw, slug);
    const alt = escAttr((tag.match(/alt="([^"]*)"/) || [])[1] || ctx.title);
    return `<img src="${wechatUrl(rel)}" alt="${alt}" loading="lazy" decoding="async" style="max-width:100%;height:auto;">`;
  });

  // --- audio embed (mp-common-clmusic) -> audio card ---
  html = await replaceAsync(html, /<mp-common-clmusic\b[^>]*?\/?>(?:<\/mp-common-clmusic>)?/gi, async (tag) => {
    const name = htmlDecode((tag.match(/music_name="([^"]*)"/) || [])[1] || '音频');
    const singer = htmlDecode((tag.match(/singer="([^"]*)"/) || [])[1] || '');
    const coverUrl = htmlDecode((tag.match(/albumurl="([^"]*)"/) || [])[1] || '');
    let cover = '';
    if (coverUrl && /^https?:\/\//.test(coverUrl)) {
      try { cover = wechatUrl((await assets.download(coverUrl, slug)).rel); } catch { cover = ''; }
    }
    return audioCard({ cover: cover || '', name, singer, sourceUrl });
  });

  // --- WeChat mpvideo iframe -> video card (cannot legally download the protected stream) ---
  html = await replaceAsync(html, /<iframe\b[^>]*mp\.weixin\.qq\.com\/mp\/readtemplate[^>]*>[\s\S]*?(?:<\/iframe>|$)/gi, async (m) => {
    const coverEnc = htmlDecode((m.match(/data-cover="([^"]*)"/) || [])[1] || '');
    let cover = '';
    if (coverEnc) {
      try { cover = wechatUrl((await assets.download(htmlDecode(decodeURIComponent(coverEnc)), slug)).rel); } catch { cover = ''; }
    }
    return videoCard({ cover, title: ctx.title, account, sourceUrl });
  });

  // --- Tencent video iframe -> responsive embed ---
  html = await replaceAsync(html, /<iframe\b[^>]*v\.qq\.com[^>]*>[\s\S]*?(?:<\/iframe>|$)/gi, (m) => {
    const url = htmlDecode((m.match(/data-src="([^"]*)"/) || [])[1] || (m.match(/src="([^"]*)"/) || [])[1] || '');
    if (!url) return '';
    return tencentEmbed(url);
  });

  // --- inline background-image urls -> localize ---
  html = await replaceAsync(
    html,
    /url\(((?:&quot;|"|\x27)?)(https?:\/\/mmbiz\.(?:qpic|qlogo)\.cn\/[^"'&)]+)((?:&quot;|"|\x27)?)\)/gi,
    async (m) => {
      try {
        const { rel } = await assets.download(m[2], slug);
        const webpRel = rel.replace(/\.(jpe?g|png|gif)$/i, '.webp');
        const chosen = fs.existsSync(path.join(WECHAT_ROOT, webpRel)) ? wechatUrl(webpRel) : wechatUrl(rel);
        return `url("${chosen}")`;
      } catch {
        return m[0];
      }
    },
  );

  // --- strip WeChat mini-program / profile widgets & metadata (they cannot render) ---
  html = html
    .replace(/\sdata-miniprogram-[a-z-]+="[^"]*"/g, '')
    .replace(/<mp-common-profile\b[^>]*>[\s\S]*?<\/mp-common-profile>/gi, '')
    .replace(/<mp-common-profile\b[^>]*\/?>/gi, '')
    .replace(/<mp-miniprogram\b[^>]*>[\s\S]*?<\/mp-miniprogram>/gi, '')
    .replace(/<mp-miniprogram\b[^>]*\/?>/gi, '');
  // unwrap dead mini-program entry links, keeping the inner (already-localised) image
  html = html.replace(/<a\b[^>]*?(?:js_weapp_entry|weapp)[^>]*>([\s\S]*?)<\/a>/gi, '$1');
  // residual WeChat custom-element wrappers (non-clmusic, already handled above)
  html = html.replace(/<mp-common-[a-z-]+\b[^>]*>[\s\S]*?<\/mp-common-[a-z-]+>/gi, '');
  // final sweep: drop any remaining attribute whose value still carries an mmbiz URL
  // (WeChat extras like imgurl / data-style darkmode duplicates). Image src/data-src are
  // already localized so they never match here.
  html = html.replace(/\s(?!src\b)(?!data-src\b)(?!poster\b)([a-zA-Z-]+)="([^"]*mmbiz\.(?:qpic|qlogo)\.cn[^"]*)"/gi, '');

  // Drop only truly-empty residual iframes (no src / no data-src); keep valid embeds.
  html = html.replace(/<iframe\b(?![^>]*(?:src=|data-src=))[^>]*>[\s\S]*?<\/iframe>/gi, '');

  // Keep only safe attribute set on remaining img tags (no on*, no style injection)
  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    if (/on[a-z]+\s*=/i.test(tag)) return '';
    return tag;
  });

  return html;
}

// regex replace with async mapper preserving $ placeholders
async function replaceAsync(str, re, fn) {
  const out = [];
  let last = 0, m;
  while ((m = re.exec(str))) {
    out.push(str.slice(last, m.index));
    out.push(await fn(m[0], m));
    last = re.lastIndex;
  }
  out.push(str.slice(last));
  return out.join('');
}

// ---------- build a single post ----------
async function buildPost(a, assets) {
  const { html } = await getHtml(a);
  const m = meta(html);
  const jc = jsContent(html);
  const dateStr = m.date || '';
  const ym = /^(\d{4})-(\d{2})/.exec(dateStr) || [];
  const slugBase = `${ym[1] || '0000'}/${ym[2] || '00'}/${slugify(m.title)}`;
  const id = String(10000 + a.n); // distinct from existing WP numeric ids (<=4695)
  const sourceUrl = a.url;

  const ctx = { slug: slugBase, account: m.account || m.nickname || '潮百相公益', sourceUrl, assets, title: m.title };

  let content = await transformContent(jc, ctx);
  const residualMmbiz = (content.match(/mmbiz\.(?:qpic|qlogo)\.cn/g) || []).length;
  if (residualMmbiz) console.warn(`  !! art${a.n}: ${residualMmbiz} residual mmbiz ref in content`);

  // choose a representative static thumbnail: first non-gif local image (avoids the heavy
  // animated banner GIF), falling back to the very first image when everything is a gif.
  const localImgs = [...content.matchAll(/src="(\/wp-content\/uploads\/wechat\/[^"]+)"/g)].map((mm) => mm[1]);
  const cover = localImgs.find((s) => !/\.gif$/i.test(s)) || localImgs[0] || '';
  await assets.ensureThumb480(cover);
  const excerpt = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

  const post = {
    id,
    title: m.title,
    slug: slugify(m.title),
    url: `${SITE}/blog/${id}/`,
    date: dateStr ? dateStr.replace(' ', ' ') + (dateStr.length === 16 ? ':00' : '') : 'DATE_UNVERIFIED',
    modified: dateStr || 'DATE_UNVERIFIED',
    status: 'publish',
    content,
    excerpt,
    categories: ['微信公众号'],
    thumbnail: cover,
    views: 0,
    likes: 0,
    favs: 0,
    comments: 0,
    thumb: cover,
    sourceUrl,
    sourceAccount: m.account || m.nickname || '',
    sourcePlatform: 'wechat',
    publishedAt: dateStr || 'DATE_UNVERIFIED',
    imageCount: (content.match(/<img\b/gi) || []).length,
    videoCount: (content.match(/class="wechat-video-card"|class="wechat-video-frame"/g) || []).length,
    videoChannelCount: 0,
  };
  return post;
}

// ---------- main ----------
async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  let targets;
  if (argv.includes('--article')) {
    const n = parseInt(argv[argv.indexOf('--article') + 1], 10);
    targets = ARTICLES.filter((a) => a.n === n);
  } else if (argv.includes('--all')) {
    targets = ARTICLES;
  } else {
    targets = ARTICLES;
  }

  const imported = loadImported();
  const done = new Set(imported.posts.map((p) => p.n));
  if (argv.includes('--resume')) targets = targets.filter((a) => !done.has(a.n));

  const assets = new AssetManager();
  const posts = [];
  for (const a of targets) {
    try {
      console.log(`\n[${String(a.n).padStart(2, '0')}] processing…`);
      const post = await buildPost(a, assets);
      posts.push(post);
      console.log(`  -> ${post.title}`);
      console.log(`     date=${post.date}  imgs=${post.imageCount}  video=${post.videoCount}  acct=${post.sourceAccount}`);
    } catch (e) {
      console.error(`  !! art${a.n} failed: ${e.message}`);
      if (!argv.includes('--all')) throw e;
    }
  }

  // always write the staged posts to a scratch file for verification
  if (posts.length) fs.writeFileSync(path.join(WORK, 'staged-posts.json'), JSON.stringify(posts, null, 0));

  // merge into posts.json (replace any prior wechat posts, so re-runs stay idempotent)
  if (!dryRun && posts.length) {
    let all = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
    all = all.filter((p) => p.sourcePlatform !== 'wechat');
    for (const p of posts) {
      if (!all.some((x) => x.id === p.id)) all = all.concat(p);
    }
    fs.writeFileSync(POSTS_FILE, JSON.stringify(all, null, 0));
    for (const p of posts) {
      if (!imported.posts.some((x) => x.id === p.id)) {
        imported.posts.push({ n: parseInt(p.id, 10) - 10000, id: p.id, title: p.title, date: p.date });
      }
    }
    saveImported(imported);
    console.log(`\nWrote ${posts.length} wechat posts to ${POSTS_FILE} (total posts=${all.length})`);
  } else {
    console.log(`\n(dry-run) staged ${posts.length} posts; assets downloads=${assets.downloads} skipped=${assets.skipped}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
