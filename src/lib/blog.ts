// Blog archive helpers (src/lib/blog.ts).
//
// The news page (/blog/) historically rendered every published post on a single
// page. This module centralises the filtering, year grouping, pagination and URL
// building used by the news list routes so the archive can be paged and filtered
// by year without duplicating logic.

import postsData from '../data/posts.json';

export type Post = (typeof postsData)[number];

/** How many posts to render per page (instead of the whole archive at once). */
export const POSTS_PER_PAGE = 10;

/** Published, titled posts sorted newest-first (the "news" set). */
export function publishedPosts(): Post[] {
  return postsData
    .filter((p) => p.status === 'publish' && p.title)
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
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
export function fmtDate(d: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || '');
  return m ? `${m[1]}年${+m[2]}月${+m[3]}日` : d;
}

/** Strip HTML tags and collapse whitespace (for the excerpt). */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
