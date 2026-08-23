import type { APIRoute } from 'astro';
import postsData from '../data/posts.json';

// Auto-generated XML sitemap (P0-08). Emits every canonical route so the
// sitemap always matches the built site. Canonical domain comes from astro.config.
const base = 'https://www.hncbx.org.cn';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
}

function entry(e: SitemapEntry): string {
  return `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`;
}

export const GET: APIRoute = ({ site }) => {
  const SITE = (site?.toString() || base).replace(/\/$/, '');

  const staticPages: SitemapEntry[] = [
    { loc: `${SITE}/` },
    { loc: `${SITE}/blog/` },
    { loc: `${SITE}/team/` },
    { loc: `${SITE}/services/` },
    { loc: `${SITE}/contact/` },
  ];

  const postPages: SitemapEntry[] = postsData
    .filter((p) => p.status === 'publish' && p.title)
    .map((p) => ({
      loc: `${SITE}/blog/${p.id}/`,
      lastmod: (p.modified || p.date || '').slice(0, 10),
    }));

  const urls = [...staticPages, ...postPages]
    .map(entry)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
