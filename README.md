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
npm run check          # Astro 类型检查（CI 构建门禁）
npm run preview        # 预览构建产物

# 图片优化（只生成 WebP 副本，不删除原图）
npm run images:audit     # 只读统计
npm run images:optimize  # 静态 jpg/png -> webp 副本
npm run images:gif       # 动态 gif -> 动画 webp 副本
npm run images:thumbs    # 新闻列表缩略图 480px
npm run images:report    # 前后对比
```

## 部署

仓库内包含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，在 `main` 分支推送后由 GitHub Actions 自动执行
`npm ci → npm run check → npm run build → Pages deploy` 并发布到 GitHub Pages。

站内所有链接与 canonical 均使用正式域名 `https://www.hncbx.org.cn`；仓库同时可经由 `https://zjhncbx.github.io` 访问。

## SEO / 内容优化

- `src/components/seo/SEO.astro`：全站统一的 title / description / canonical / Open Graph / Twitter Card 组件。
- `src/pages/sitemap.xml.ts`：根据实际路由自动生成的 XML sitemap（含文章 lastmod）。
- `public/robots.txt`：允许全站抓取，sitemap 指向 canonical 域名。
- `public/404.html`：统一视觉的 404 页，含返回首页入口。
- `src/lib/image.ts`：图片渲染管线——为正文大图追加 `loading="lazy"`、并用 `<picture>` 优先加载 WebP（首屏 Hero / Logo 保持 eager），历史原图 URL 作为回退保留。

## 图片优化（P1）

网站图片（大量来自 WordPress 文章正文）通过 `scripts/optimize-images.mjs` 批量生成 `.webp` 副本，
渲染层用 `<picture>` 优先加载 WebP，支持 WebP 的浏览器下载更小体积，其余回退原图。

> 说明：为保留历史 `/wp-content/uploads/...` URL 与动画，**不删除任何原图**；WebP 副本与原图并存。

## 优化文档

- [`docs/resource-audit.md`](docs/resource-audit.md)：资源依赖审计（CSS / JS / 图片，含引用关系与可删性结论）。
- [`docs/image-audit.md`](docs/image-audit.md)：图片审计（规模、体积分档、引用、分类、优化结果）。
- [`docs/gif-audit.md`](docs/gif-audit.md)：GIF 专项审计（动态 GIF 分类与动画 WebP 处理）。
- [`docs/P0-optimization-report.md`](docs/P0-optimization-report.md)：P0 阶段性能 / 图片 / SEO 优化报告。
- [`docs/P1-image-optimization-report.md`](docs/P1-image-optimization-report.md)：P1 图片性能优化报告与 P2 建议。

## 目录结构

- `src/pages/`：页面（首页、团队、服务、联系、博客列表与文章）及 `sitemap.xml.ts`
- `src/components/seo/`：SEO 组件
- `src/lib/`：图片渲染管线（lazy + webp picture）等工具函数
- `src/data/`：从 WordPress 数据库导出的页面/文章数据
- `scripts/`：图片审计 / 优化 / 缩略图脚本
- `public/`：静态资源（Sydney/Elementor 样式、字体、图片与下载文件，含 404 / robots / 验证文件）

## 迁移说明

- 首页保留原 Sydney 主题 + Elementor 渲染样式（Hero 轮播、团队介绍、宣传片等）。
- 首页「近期资讯」由 `src/pages/index.astro` 自动按文章发布时间取最新 10 篇（无需手工维护）。
- 团队介绍、服务项目、联系我们等页面保留原 Elementor 渲染。
- 230 篇已发布文章迁移为静态文章页，保留分类、日期与配图。
- 引导页脚 / 子页面顶部导航为实心深色，保证未滚动时可读。
