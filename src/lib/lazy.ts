// Add loading="lazy" decoding="async" to <img> tags in rendered HTML strings
// that lack them, EXCEPT a hero image (matched by src). This defers off-screen
// images (e.g. large WeChat GIFs) so they do not block initial page load.
const HERO_SRCS = ['mmexport1602400234695']; // homepage hero (must stay eager)

export function lazyImages(html: string): string {
  return html.replace(/<img\b[^>]*?\/*>/g, (tag) => {
    if (tag.includes('loading=')) return tag;
    if (HERO_SRCS.some((h) => tag.includes(h))) return tag;
    if (tag.includes('data:image')) return tag;
    // remove a trailing slash (optional) then append lazy + decoding
    const base = tag.replace(/\/\s*>$/, '>');
    return base.replace(/>$/, ' loading="lazy" decoding="async">');
  });
}
