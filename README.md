# 潮百相公益 (hncbx)

海宁市潮百相公益发展协会官方网站，由 WordPress 站点迁移而来，现为基于 **Astro 7** 的静态站点。

## 技术栈

- [Astro 7](https://astro.build/)（静态输出，GitHub Pages 部署）
- Node.js >= 22.12
- 复用原 Sydney 主题 + Elementor 的渲染样式与静态资源

## 本地开发

```bash
npm install
npm run dev            # 开发服务器
npm run build          # 构建到 dist/
npm run build:prune    # 构建 + 移除 dist 中无引用且带 WebP 孪生的原图（发布体积瘦身，CI 使用）
npm run check          # Astro 类型检查（CI 构建门禁）
npm run preview        # 预览构建产物

# 图片优化（只生成 WebP 副本，不删除原图）
npm run images:audit     # 只读统计
npm run images:optimize  # 静态 jpg/png -> webp 副本
npm run images:gif       # 动态 gif -> 动画 webp 副本
npm run images:thumbs    # 新闻列表缩略图 480px
npm run images:report    # 前后对比
npm run images:orphans   # 孤儿/未引用资源审计（加 --delete 才删除；每次导入文章后建议跑一遍）

# 微信公众号历史文章迁移（--all / --article N / --resume / --dry-run）
npm run wechat:import    # node scripts/import-wechat-articles.mjs --all
```

## 部署

仓库内包含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，在 `main` 分支推送后由 GitHub Actions 自动执行
`npm ci → npm run check → npm run build → Pages deploy` 并发布到 GitHub Pages。

站内所有链接与 canonical 均使用正式域名 `https://www.hncbx.org.cn`，域名单一来源为 `src/consts.ts`（`astro.config.mjs` 的 `site` 亦由此导入）；仓库同时可经由 `https://zjhncbx.github.io` 访问。自定义域凭 `public/CNAME` 随构建产物发布。

## SEO / 内容优化

- `src/components/seo/SEO.astro`：全站统一的 title / description / canonical / Open Graph / Twitter Card 组件。
- `src/pages/sitemap.xml.ts`：根据实际路由自动生成的 XML sitemap（含文章 lastmod）。
- `public/robots.txt`：允许全站抓取，sitemap 指向 canonical 域名。
- `public/404.html`：统一视觉的 404 页，含返回首页入口。
- `src/lib/image.ts`：图片渲染管线——为正文大图追加 `loading="lazy"`、并用 `<picture>` 优先加载 WebP（首屏 Hero / Logo 保持 eager），历史原图 URL 作为回退保留。

## 响应式与前端性能（P2）

- `src/components/ResponsiveImage.astro`：统一图片组件，输出 `<picture>`（WebP）+ 原图回退，支持 `loading`/`decoding`/`fetchpriority`/`width`/`height`/自定义 `webpSrc`。
- 全局布局覆盖样式统一放在 `public/assets/inline.css`（批次①起；此前由 BaseLayout 以 `<style>` 逐页重复输出约 6KB×295 页，现外置可缓存）。
- 字体资源只保留现役 `@font-face` 实际使用的 woff2/woff 与现代图片格式；legacy eot/ttf/otf 与字体目录内 svg（IE 时代回退）已从仓库移除。
- 首页 Footer：全宽居中（CSS 规整，消除宽屏偏左），移动端正常。
- 首页 Hero：WebP + `eager` + `fetchpriority="high"`，并提供移动 768w 变体。
- 图片 WebP 映射按**相对上传路径**匹配（避免不同目录同名文件冲突）。

## 微信公众号文章归档

微信公众号历史文章迁移至官网时：

- 保留原始发布日期；
- 正文图片本地化；
- 图片按现有优化机制处理；
- 普通可获取视频本地化；
- 视频号保留封面、标题、账号及原始入口；
- 不绕过微信平台鉴权；
- 所有内容使用官网正式 URL。

迁移由 `scripts/import-wechat-articles.mjs` 执行（`npm run wechat:import`），统一媒体展示使用
`src/components/VideoEmbed.astro`。文章元数据写入 `src/data/posts.meta.json`（含预生成摘要字段
`excerpt`/`desc`，`sourcePlatform: 'wechat'`），正文写入 `src/data/posts/<id>.html`，
自动参与首页「近期资讯」按实际发布日期排序与 sitemap 生成。迁移清单见
[`docs/wechat-import-2026-08.md`](docs/wechat-import-2026-08.md)。

## 新闻列表页（/blog/）

新闻通告列表不再一次性列出全部文章，而改为**分页 + 按年份筛选**：

- 每页仅展示 10 篇（`src/lib/blog.ts` 的 `POSTS_PER_PAGE`），旧的全量一页渲染已移除；
- 右侧「按年份筛选」侧边栏列出各年份及篇数，点击进入对应年份归档页；
- 路由结构：
  - `/blog/` —— 全部年份第 1 页；
  - `/blog/page/N/` —— 全部年份第 N 页；
  - `/blog/year/YYYY/` —— 某年份第 1 页；
  - `/blog/year/YYYY/page/N/` —— 某年份第 N 页；
- 共享渲染组件：`src/components/BlogArchive.astro`（文章列表 + 年份侧边栏 + 分页）；
- 分页/年份逻辑集中在 `src/lib/blog.ts`（排序、分组、分页、URL 拼接）；
- 数据分两层：列表/年份/首页/sitemap 只读轻量的 `src/data/posts.meta.json`（约 240KB，含预生成摘要），
  文章正文按篇存于 `src/data/posts/<id>.html`，仅文章页按需加载（批次② 拆分自原 12MB 单体 `posts.json`）；
- 年份归档入口已写入 sitemap（`src/pages/sitemap.xml.ts`）。

## 图片优化（P1）

网站图片（大量来自 WordPress 文章正文）通过 `scripts/optimize-images.mjs` 批量生成 `.webp` 副本，
渲染层用 `<picture>` 优先加载 WebP，支持 WebP 的浏览器下载更小体积，其余回退原图。

> 说明：为保留历史 `/wp-content/uploads/...` URL 与动画，**不删除任何原图**；WebP 副本与原图并存。
>
> **P3 体积治理（已执行）**：发布层对带 WebP 孪生的图片只输出 WebP；`build:prune` 在构建后从 `dist` 移除无引用且带孪生的原图（原图仍保留于仓库）；对 SHA-256 相同的历史图片做了统一去重，把 `dist` 由 ~1013 MB 降到 **295 MB**、`public` 由 ~997 MB 降到 **674 MB**。详见 [`docs/P3-size-optimization-report.md`](docs/P3-size-optimization-report.md)。
>
> **批次① 死资源清理（2026-08-27）**：新增 `scripts/audit-orphans.mjs`（引用闭包审计），删除 uploads 孤儿 19 个（0.9MB）与 plugins/themes/wp-includes 未引用文件 145 个（10.0MB，含 PHP、demo-content、管理后台 CSS、legacy 字体）；同时移除数据文件中的零引用死键（`render_blocks.home_full`、`livepages.blog.body/css/content_prefix`）。清单见 [`docs/orphans-2026-08.md`](docs/orphans-2026-08.md)。
>
> ⚠️ 站点体积仍受历史原图 + WebP 孪生制约（prune 后发布约 290MB），后续建议将图片迁对象存储/CDN 或 Git LFS。

## 优化文档

- [`docs/resource-audit.md`](docs/resource-audit.md)：资源依赖审计（CSS / JS / 图片，含引用关系与可删性结论）。
- [`docs/image-audit.md`](docs/image-audit.md)：图片审计（规模、体积分档、引用、分类、优化结果）。
- [`docs/gif-audit.md`](docs/gif-audit.md)：GIF 专项审计（动态 GIF 分类与动画 WebP 处理）。
- [`docs/P0-optimization-report.md`](docs/P0-optimization-report.md)：P0 阶段性能 / 图片 / SEO 优化报告。
- [`docs/P1-image-optimization-report.md`](docs/P1-image-optimization-report.md)：P1 图片性能优化报告与 P2 建议。
- [`docs/P2-responsive-performance-report.md`](docs/P2-responsive-performance-report.md)：P2 响应式布局 / Hero / srcset / 性能报告与 P3 建议。
- [`docs/wechat-import-2026-08.md`](docs/wechat-import-2026-08.md)：微信公众号历史文章完整迁移清单与核验结果。
- [`docs/structure-optimization-2026-08.md`](docs/structure-optimization-2026-08.md)：项目结构全面审计与分批次优化方案（本 README 各批次的执行依据）。
- [`docs/orphans-2026-08.md`](docs/orphans-2026-08.md)：批次① 孤儿与死资源删除清单（方法、安全校验、164 个文件逐项列表）。

## 目录结构

- `src/pages/`：页面（首页、博客列表 `[...slug]` 与文章 `[id]`、`[page]` 静态栏目页 = 团队/服务/联系）及 `sitemap.xml.ts`
- `src/components/`：SEO 组件、`ResponsiveImage.astro` 统一图片组件、`BlogArchive.astro` 新闻列表组件
- `src/lib/`：图片渲染管线（lazy + webp picture）、`blog.ts`（列表分页/年份归档、正文按需加载）等工具函数
- `src/consts.ts`：全站正式域名（单一来源，供 canonical / og / sitemap / astro.config 复用）
- `src/data/`：WordPress 导出数据——`posts.meta.json`（文章元数据 + 预生成摘要）、`posts/<id>.html`（正文）、`livepages.json`（栏目页快照）、`render_blocks.json`（首页块）、`staticPages.ts`（栏目页文案）、`organization.ts`
- `scripts/`：图片审计 / 优化 / 缩略图脚本，`audit-orphans.mjs`（孤儿与死资源审计/删除），`split-posts.mjs`（批次② 一次性数据拆分），`prune-dist.mjs`（发布瘦身），`import-wechat-articles.mjs`（微信文章导入）
- `public/`：静态资源（Sydney/Elementor 样式、字体、图片与下载文件，含 404 / robots / 验证文件）

## 迁移说明

- 首页保留原 Sydney 主题 + Elementor 渲染样式（Hero 轮播、团队介绍、宣传片等）。
- 首页「近期资讯」由 `src/pages/index.astro` 自动按文章发布时间取最新 10 篇（无需手工维护）。
- 团队介绍、服务项目、联系我们等页面保留原 Elementor 渲染。
- 230 篇已发布文章迁移为静态文章页，保留分类、日期与配图。
- 引导页脚 / 子页面顶部导航为实心深色，保证未滚动时可读。
