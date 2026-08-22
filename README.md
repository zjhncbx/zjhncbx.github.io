# 潮百相公益 (hncbx)

海宁市潮百相公益发展协会官方网站，由 WordPress 站点迁移而来，现为基于 **Astro 7** 的静态站点。

## 技术栈

- [Astro 7](https://astro.build/)（静态输出，GitHub Pages 部署）
- Node.js >= 22.12
- 复用原 Sydney 主题 + Elementor 的渲染样式与静态资源

## 本地开发

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 构建到 dist/
npm run preview  # 预览构建产物
```

## 部署

仓库内包含 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)，在 `main` 分支推送后由 GitHub Actions 自动构建并发布到 GitHub Pages。

站内所有链接均为相对路径，因此同时支持以下两种域名访问：

- `https://zjhncbx.github.io`
- `https://www.hncbx.org.cn`（通过 CNAME 指向 `zjhncbx.github.io`）

仓库已包含 `public/CNAME`（内容 `www.hncbx.org.cn`）。要让 `www.hncbx.org.cn` 正式生效，还需在两端各配置一次：

1. GitHub 仓库 **Settings → Pages → Custom domain** 填 `www.hncbx.org.cn` 并保存。
2. 在域名服务商为 `www.hncbx.org.cn` 添加 **CNAME 记录**：主机记录 `www`，指向 `zjhncbx.github.io`。

记得在 **仓库 Settings → Pages** 将 Source 设置为 **GitHub Actions**。

## 目录结构

- `src/pages/`：页面（首页、团队、服务、联系、博客列表与文章）
- `src/data/`：从 WordPress 数据库导出的页面/文章数据
- `public/`：静态资源（Sydney/Elementor 样式、字体、图片与下载文件）

## 迁移说明

内容迁移自 `wordpress_2026-08-22_19-41-35_mysql_data_c3zlC.sql`：

- 首页保留原 Sydney 主题 + Elementor 渲染样式（Hero 轮播、团队介绍、宣传片等）。
- 首页「近期资讯」由 `src/pages/index.astro` 自动按文章发布时间取最新 10 篇（无需手工维护）。
- 团队介绍、服务项目、联系我们等页面保留原 Elementor 渲染。
- 230 篇已发布文章迁移为静态文章页，保留分类、日期与配图。
- 引导页脚 / 子页面顶部导航为实心深色，保证未滚动时可读。
- 缺失的媒体（文章配图、Logo 变体等）已从本地备份 `D:\www.hncbx.org.cn_20260822_192212.tar.gz` 恢复，未从远程主站下载。
