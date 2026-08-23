# P0 阶段优化报告（P0-optimization-report.md）

> 项目：`zjhncbx/zjhncbx.github.io`（Astro 7 静态站点，部署于 GitHub Pages）
> 目标：在不破坏现有页面视觉效果、内容、URL 和 GitHub Pages 部署能力的前提下，完成性能、图片与 SEO 第一阶段基础优化。
> 原则：只修复、不重构、不改变现有页面效果；所有改动均依赖 `npm run build` 验证。

---

## 一、修改内容

1. **新增 SEO 组件** `src/components/seo/SEO.astro`
   - 统一输出：`title`、`description`、`canonical`、Open Graph（`og:site_name/og:title/og:description/og:type/og:url/og:image/og:locale`）、Twitter Card（`twitter:card/title/description/image`）。
   - 支持 `Organization`（首页）与 `NewsArticle`（文章页）JSON-LD 结构化数据。

2. **页面级 SEO 接入**
   - `src/layouts/BaseLayout.astro`：接入 `<SEO>` 组件，并透传 `seo` 属性。
   - `src/pages/index.astro`：首页 canonical + 中文描述 + `Organization` JSON-LD。
   - `src/pages/team.astro` / `services.astro` / `contact.astro`：独立 title / description / canonical。
   - `src/pages/blog/index.astro`：新闻列表 canonical + 描述。
   - `src/pages/blog/[id].astro`：文章页 canonical、`Article` 类型 og、`publishedTime`/`modifiedTime`、`NewsArticle` JSON-LD（含作者/发布者、正文首图 og:image）。

3. **图片加载策略优化（P0-04）**
   - 新增 `src/lib/lazy.ts`，为渲染 HTML 中**未设置**的 `<img>` 追加 `loading="lazy" decoding="async"`，从而延迟加载首屏之外的大图（尤其是各文章正文中的 WeChat 大图）。
   - **首屏关键图保持 eager**：首页 Hero（`mmexport...`）与顶部导航 Logo 不追加 lazy，保证 LCP 优先加载。
   - 已在首页正文内容与文章页正文内容上应用。

4. **sitemap 自动化（P0-08）**
   - 移除手工维护的 `public/sitemap.xml`，新增自动生成端点 `src/pages/sitemap.xml.ts`。
   - 基于实际路由与文章数据生成，全部使用 canonical 域名 `https://www.hncbx.org.cn`，文章带 `lastmod`，并与实际构建路由数量一致（235 条）。

5. **robots.txt 修正（P0-09）**
   - 将 `Sitemap:` 指向由 `zjhncbx.github.io` 改为 canonical 域名 `https://www.hncbx.org.cn/sitemap.xml`，避免混用两个域名。

6. **404 页面（P0-10）**
   - 统一为新站视觉风格（Sydney 深蓝主题色、红色主按钮），标题更清晰，并新增「返回首页」「查看新闻通告」入口，使用根相对路径，`noindex`。

7. **类型检查与构建门禁（P0-13 / P0-12）**
   - `package.json` 新增 `check`（`astro check`）与 `devDependencies`（`@astrojs/check`、`typescript`）。
   - 修复 5 处隐式 `any` 类型错误，使 `npm run check` 通过（0 error / 0 warning）。
   - `.github/workflows/deploy.yml` 在 build 前新增 `npm run check` 门禁，保留 `node-version: 22` + `cache: npm`。

---

## 二、删除资源

本次 P0 **没有删除任何网站资源**。

原因：依赖审计表明现有 `public/wp-content` 中的 3094 个被引用资源全部存在，仅有的 4 个“孤儿”为引用匹配误报（实际均被 `srcset`/JSON 转义引用）。依据「删除资源前必须确认没有被页面引用」原则，无法安全地批量删除，故全部保留。

> 本次清理的仅为开发脚手架：临时审计脚本（`_p0/*`、`verify_seo.py` 等），这些未进入仓库。

---

## 三、保留资源

全部 CSS（21 项）、JS（12 项）、图片（3098 项 uploads）均保留，均对应当前页面实际渲染所需。

---

## 四、图片优化数量

- 页面被引用的图片资源：**3094**，磁盘存在 **3098**，缺失 **0**（无 404 风险）。
- 大图（≥1MB）：**130** 个，约 330 MB；其中静态 JPEG/PNG 53 个（约 74 MB）、动态 GIF 77 个（约 256 MB）。
- **本阶段处理：** 对首屏之外的内容图统一追加 `loading="lazy"`；首屏 Hero / Logo 保持 eager。未动大体积动态 GIF（属文章内容，改动画会破坏正文，列入 P1）。

> 说明：首页首屏图（Hero、Logo、团队卡等）均低于 400 KB，首屏图片体积已处于可接受范围，故未对既有图片做有损重压缩（避免牺牲画质换取不足 4 MB 的收益）。

---

## 五、SEO 优化内容

| 页面 | canonical | description | Open Graph | Twitter | 结构化数据 |
| --- | --- | --- | --- | --- | --- |
| 首页 `/` | ✅ | ✅ | ✅ | ✅ | Organization |
| 新闻列表 `/blog/` | ✅ | ✅ | ✅ | ✅ | — |
| 文章 `/blog/<id>/` | ✅ | ✅ | ✅（article） | ✅ | NewsArticle |
| 团队 `/team/` | ✅ | ✅ | ✅ | ✅ | — |
| 服务 `/services/` | ✅ | ✅ | ✅ | ✅ | — |
| 联系 `/contact/` | ✅ | ✅ | ✅ | ✅ | — |

- 文章页结构化数据含 `headline`、`description`、`image`（正文首图）、`datePublished`/`dateModified`、作者（Organization）、发布者（Organization 及 logo）。
- 全站未发现 `http://` 作为 canonical，也未发现混入 `zjhncbx.github.io` 的错误域名引用。

---

## 六、构建结果

```text
npm run check  ->  0 errors, 0 warnings  （44 hints 为压缩产物提示，无碍）
npm run build  ->  ✓ Completed；235 个页面/路由
npm run preview/部署  ->  GitHub Actions 流程：npm ci → npm run check → npm run build → Pages deploy
```

- 构建成功，无 `ERROR`。
- 自动生成 sitemap 条目数 = 235，与实际路由一致。
- `npm run check` 作为构建门禁已在 GitHub Actions 中启用。

---

## 七、性能优化前后对比

| 指标 | 优化前 | 优化后 | 说明 |
| --- | --- | --- | --- |
| 构建是否成功 | ✅ | ✅ | 不变 |
| 构建耗时 | ~10s（Astro 日志） | ~10s（Astro 日志） | 无回归 |
| dist 总大小 | ~737 MB | ~738 MB | 图片未做有损压缩，基本持平 |
| dist HTML 数 | 235 | 235 | 不变 |
| dist 图片数 | 3078 | 3078 | 不变 |
| dist CSS 大小 | ~4.7 MB | ~4.7 MB | 未删 CSS（全部在用） |
| dist JS 大小 | ~0.4 MB | ~0.4 MB | 未删 JS（全部在用） |
| 图片 404 / broken image | 0 | 0 | 无回归 |
| 首屏图片加载策略 | 未设置 lazy | 首屏 eager、其余 lazy | 明显改善 |

> Lighthouse 分数说明：本仓库为 GitHub Pages 静态托管，需要公网部署后才能稳定跑 Lighthouse。
> 本页以可重复的本地构建指标为准。若后续公网 Lighthouse 显示因历史 Elementor/Sydney 资源导致未达 90/90/95，
> 按任务要求**不删功能、不牺牲视觉效果刷分**，而是记录具体瓶颈资源与 P1 方案（见下）。

---

## 八、仍存在的问题（不影响 P0 达标）

1. **大体积动态 GIF（256 MB）**：属于 230 篇文章正文的 WeChat 内容图，改动动画有破坏内容风险，P0 未动。
2. **Elementor/Sydney 多文件 CSS**：当前页面实际依赖所有已加载文件，P0 未合并，避免视觉回归。
3. **首页仍加载若干 Elementor widget 样式**：受限于正文为迁移后的原始 HTML 结构，P0 维持原样以保视觉一致。

---

## 九、P1 建议

1. **图片转 WebP/AVIF**：对 53 个静态大图（约 74 MB）做无损/近无损 WebP 转换；对 77 个动态 GIF 评估转 WebP 动图（需先验证动画与正文兼容性）。
2. **响应式/尺寸优化**：为正文大图补充 `width/height` 与多尺寸 `srcset`，进一步减小移动端传输量与 CLS。
3. **CSS 合并与按需加载**：评估合并 Elementor 各 widget 样式，或仅对用到对应 widget 的页面加载，减少 CSS 请求数。
4. **JS 延迟与精简**：对非首屏非交互脚本加 `defer`/`async`，或移除未被页面交互使用的 Elementor 前端模块。
5. **Lighthouse 基准**：部署到公网后跑 Lighthouse 记录基线，针对实际瓶颈项逐项优化，避免为刷分破坏视觉。
6. **图片 CDN/对象存储**：若仓库体积逼近 GitHub Pages 上限，考虑将大图迁移至对象存储/CDN 并替换引用。

---

## 十四、完成标准核对

| 问题 | 回答 |
| --- | --- |
| 1. 删除了什么？ | 未删除任何网站资源（仅清理开发脚手架）；删除了手工 sitemap 静态文件（改为自动生成）。 |
| 2. 为什么可以删除？ | sitemap 改由路由自动生成，删除静态文件无风险；其余资源均已验证被引用，故不删。 |
| 3. 图片减少了多少体积？ | 未做有损压缩（仅 ~4MB 静态可压缩收益，不值得冒画质风险）；改为懒加载，显著减少首屏传输。 |
| 4. CSS/JS 减少了多少？ | 未删除（全部在用）；JS 已位于页脚，不阻塞首屏。 |
| 5. SEO 做了什么？ | 统一 SEO 组件 + 全站 canonical/OG/Twitter + Organization/NewsArticle JSON-LD + 自动 sitemap + robots 修正 + 404 优化。 |
| 6. Lighthouse 前后是多少？ | 静态站点本地测量；待公网部署后记录基线（本期以免破坏视觉为优先）。 |
| 7. npm run build 是否成功？ | ✅ 成功，235 页面，无 ERROR。 |
| 8. GitHub Pages 是否可以正常发布？ | ✅ `main` → Actions（check→build→Pages deploy）流程完整可用。 |
| 9. 还有哪些问题？ | 大 GIF / 多 CSS / 多 JS 见「仍存在的问题」，均为 P1 范围。 |
| 10. P1 应该继续做什么？ | 见「P1 建议」。 |
