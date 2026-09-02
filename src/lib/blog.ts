// Blog archive helpers (src/lib/blog.ts).
//
// Centralises the filtering, year grouping and pagination used by the news list
// routes so the archive can be paged and filtered by year without duplicating
// logic. Since batch ② the article store is split: this module (and every list
// page) only touches the lightweight `posts.meta.json` — full bodies live in
// `src/data/posts/<id>.html` and are loaded per article page via loadPostBody().

import postsMeta from '../data/posts.meta.json';

export type Post = (typeof postsMeta)[number];

/** How many posts to render per page (instead of the whole archive at once). */
export const POSTS_PER_PAGE = 10;

/** Published, titled posts sorted newest-first (the "news" set). */
export function publishedPosts(): Post[] {
  return postsMeta
    .filter((p) => p.status === 'publish' && p.title)
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
}

/** Lazy map of article bodies (raw HTML), keyed like "../data/posts/<id>.html". */
const postBodies = import.meta.glob('../data/posts/*.html', { query: '?raw', import: 'default' });

/** Load one article body; returns '' when the post has no stored content. */
export async function loadPostBody(id: string): Promise<string> {
  const key = `../data/posts/${id}.html`;
  const load = postBodies[key];
  return load ? ((await load()) as string) : '';
}

/** ISO date (YYYY-MM-DD) from a WP datetime string, '' when absent. */
export function isoDate(d: string | undefined): string {
  return d ? String(d).slice(0, 10) : '';
}

/** Year (YYYY) a post was published, or '' if the date has no year. */
export function postYear(p: Post): string {
  return (p.date || '').slice(0, 4);
}

/**
 * Distinct years present in the set, newest-first, each with the number of posts
 * published in that year. Used to drive the "按年份筛选" (filter by year) sidebar.
 */
export function yearCounts(posts: Post[]): { year: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    const y = postYear(p);
    if (y) counts.set(y, (counts.get(y) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => (a.year > b.year ? -1 : 1));
}

/** Posts restricted to a given year ('' / undefined returns the whole set). */
export function postsInYear(posts: Post[], year?: string | null): Post[] {
  if (!year) return posts;
  return posts.filter((p) => postYear(p) === year);
}

/** 1-based page slice for an array. */
export function paginate<T>(items: T[], page: number, perPage = POSTS_PER_PAGE): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

/** Number of pages needed for a given count. */
export function pageCount(count: number, perPage = POSTS_PER_PAGE): number {
  return Math.max(1, Math.ceil(count / perPage));
}

/**
 * Human date like "2025年1月12日" (matches the rest of the site).
 */
export function fmtDate(d: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : (d ?? '');
}

/** Strip HTML tags and collapse whitespace (for the excerpt). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
