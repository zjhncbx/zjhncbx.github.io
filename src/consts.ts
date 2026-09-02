// Site-wide canonical constants (Astro `src/consts.ts` convention).
//
// Single source of truth for the production origin. This same value is consumed
// by astro.config.mjs (`site:`) and every page/component for canonical + og tags,
// so there is exactly ONE literal across the repo.
export const SITE = 'https://www.hncbx.org.cn';
