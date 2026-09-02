# 项目结构全面审计与优化方案（2026-08）

> 生成日期：2026-08-27 · 仓库：`zjhncbx/zjhncbx.github.io` · 基线 commit：`a68d051`（新闻列表分页 + 年份侧栏上线后）
> 性质：只读审计 + 方案设计；**批次① 已于同日实施完毕**（见文中 ✅ 注记与 `docs/orphans-2026-08.md`），其余批次待排期。

---

## 1. 现状快照

| 维度 | 数据 |
| ---- | ---- |
| 框架 | Astro 7.2 · `output: 'static'` · 无 UI 集成 |
| 页面 | 297 个（首页 1 + 栏目页 3 + 文章 240 + 列表/分页/年份 52 + sitemap + 404 等） |
| 源码 | `src/` 17 个文件 ≈ 1300 行；`scripts/` 4 个工具脚本 |
| 数据 | `posts.json` 12MB（240 篇含全文 HTML）· `livepages.json` 459K · `render_blocks.json` 109K · `assets.json` 2.1K |
| 静态资源 | `public/` 684MB（uploads 673M + plugins 5.7M + themes 4.3M + wp-includes 1.3M） |
| Git | `.git` 665MB · 跟踪文件 4443 个 · 未用 LFS |
| 构建产物 | 未 prune 的 dist 704MB；CI `build:prune` 后发布约 250MB |

架构模式：WordPress 页面快照以 HTML 字符串存于 JSON，Astro 经 `set:html` 回注 + `lib/image.ts` 渲染期改写（lazy / WebP Option C）+ `scripts/prune-dist.mjs` 发布期瘦身。

**既有的优点（保持）**
- `lib/blog.ts` 集中了分页/年份逻辑，`BlogArchive.astro` 纯展示，index 与 `[...slug]` 共用，无逻辑分叉。
- WebP 孪生按**相对路径**（非 basename）建索引，规避同名碰撞。
- `-480.webp` 列表封面（127/127 全覆盖）、子页 canonical、sitemap 含年份页。
- `docs/` 留有 P0–P3 各阶段审计报告，可追溯。

---

## 2. 问题清单

### P0 结构性风险

#### P0-1 `posts.json` 单文件巨石（12MB / 平均 48KB/篇）
- 首页、`[id]`、`index`、`[...slug]`、`sitemap.xml.ts` 全部整体 `import`，每次构建解析 12MB；任何一篇改动重写整个 JSON → 巨型 git diff，且只增不减地推高 `.git`。
- `BlogArchive` Props 每篇携带完整 `content`，而列表只用 `stripHtml(content).slice(0,160)` 级别的摘要（24 个分页 × 每页 10 篇 × 平均 48KB 的序列化浪费）。
- 死字段/坏字段：`slug`、`url`（值含 `//` 双斜杠 bug，如 `hncbx.org.cn//blog/666/`）、`views/likes/favs/comments`、`thumbnail`（附件数字 id，与 `thumb` URL 易混）——源码零引用。

**方案**：两层数据 + 预生成摘要。
```
src/data/posts.meta.json        # id/title/date/modified/categories/thumb/excerpt(纯文本,构建期生成) ≈ 250KB
src/data/posts/<id>.json        # { content }  仅 [id].astro 与导入脚本按需读写
```
- `lib/blog.ts` 改读 meta 层；`[id].astro` 用 `fs.readFileSync`/`import.meta.glob` 单篇读取。
- 迁移脚本一次转换 + `import-wechat-articles.mjs` 落盘方式同步调整。
- （更彻底可转 Astro Content Collections，但上述拆分已可解决 90% 痛点、迁移面最小。）

#### P0-2 仓库/发布体积逼近 GitHub 多重上限
Pages 站点软上限 1GB、仓库软上限 1GB、带宽 100GB/月；每导入一批微信文章都在消耗余量。实测浪费：

| 项 | 数量 | 体积 |
| --- | ---: | ---: |
| uploads 真孤儿（严格引用闭包下无任何引用、也非任何引用的孪生）| **19** | **0.9MB** |
| plugins/themes/wp-includes 未引用（PHP、demo-content、管理后台 CSS、legacy eot/ttf/otf/字体 svg、brands 字体组）| **145** | **10.0MB** |
| `render_blocks.home_full`（零引用，占该文件 49%） | — | 53KB |
| `livepages.blog` 死键 `body`/`css`/`content_prefix`（渲染只用 header/footer） | — | 48KB |

> **数字更正（2026-08-27 执行时）**：本报告初稿写「uploads 孤儿 1392 个 / 156.3MB」，系快速扫描将「被引用原图的 webp 服务副本」「归档原图」「-480 缩略孪生」误判为孤儿所致。`scripts/audit-orphans.mjs` 的严格闭包（引用 token ∪ 孪生扩展 ∪ CSS/JS 相对引用传递闭包）下真实值为 uploads **19 / 0.9MB**，framework **145 / 10.0MB**。uploads 的大头（673MB）几乎全部在用或属归档原图设计内保留，瘦身必须走媒体外迁（§P0-2.3），不存在大规模"白捡"空间。

**方案**：
1. ~~新增 `scripts/audit-orphans.mjs`~~ ✅ 已落地（`npm run images:orphans`）：引用闭包 + 孪生扩展 + framework 传递闭包；`--manifest` 出留底清单，`--delete` 才动手。**每次导入后必跑**。
2. ~~删除表 1 孤儿与未引用字体老格式~~ ✅ 已于批次①执行（164 文件 / 10.9MB，清单见 `docs/orphans-2026-08.md`）。
3. 战略项（单独评审）：uploads 原图外迁 CDN（Cloudflare R2 / 阿里 OSS）或 git-lfs，git 只留 480 缩略与原图归档；这是解除 1GB 天花板的唯一长效路径，同时 CI artifact 从 ~290MB 降到 <20MB。

### P1 前端性能

#### P1-1 全量 CSS/JS 无差别下发
每页固定 21 CSS + 12 JS ≈ **0.85MB（未压缩）**。文章/列表页不需要 Elementor、Swiper；栏目页不需要 blog widget 样式。`livepages` 已有 per-page `css` 增量清单，缺的是反向的**按模板裁剪**。

**方案**：`assets.json` 按组拆：`core`（bootstrap/sydney/jquery）+ `elementor` + `home` + `blog`；BaseLayout 接收 `assetGroups` prop。预期列表/文章页省 300–500KB 传输。

#### P1-2 BaseLayout 6KB `<style>` 逐页内联 ✅（批次①已执行）
297 页重复 ≈ 1.8MB 冗余字节且无法跨页缓存；首页另有 1.5KB 同类内联。
**方案**：并入 `public/assets/inline.css`（或新建 `site-overrides.css`），删除各页 `<style is:inline>` 全局规则（保留真正 per-page 的）。
> 执行注记：BaseLayout 全局块（5,993B）已原样追加至 `inline.css` 末尾（层叠顺序不变）；首页专属样式保留内联。回归验证：首页/文章页/列表页与旧构建**逐字节一致**（仅少了 style 块）。

#### P1-3 列表缩略图回退引用全尺寸原图
`ResponsiveImage` 的 `<img src={p.thumb}>` 回退指向原图 → prune 必须保留 127 张全尺寸封面（**9MB 进 dist**），且不支持 WebP 的浏览器在列表页会下载全尺寸图。另：`-480.webp` 生成正则不含 `.gif`，gif 封面（如 2.5MB 的 `21620459622.gif`）在列表页直接播原图。
**方案**：`make-thumbnails.mjs` 同步产出 `-480.jpg`（含 gif 静帧），`BlogArchive` 回退 `src` 用 `-480.jpg`；预计 dist 再省 ~7MB。

#### P1-4 正文懒加载图无显式尺寸 → CLS
`image.ts` 的 lazy 注入不带 width/height（文章页 40+ 张 lazy 图）。
**方案**：`images:optimize` 生成 `uploads/_sizes.json` sidecar（sharp metadata 一次采集），`image.ts` 注入 `width/height`；同时给 `hm.baidu.com` 加 `preconnect`。

### P2 可维护性

| 编号 | 问题 | 方案 |
| --- | --- | --- |
| P2-1 | contact/services/team 三页 23 行逐字相同 | 抽 `LivePage.astro` 组件（props: key/title/desc/canonical），或 `src/pages/[page].astro` + getStaticPaths 遍历 livepages keys |
| P2-2 | `fmtDate` 在 `[id].astro` 重复实现；剥标签摘要逻辑 3 处各写各的 | 统一从 `lib/blog.ts` 导入；`stripHtml` 增 `truncate` |
| P2-3 | `const base='https://www.hncbx.org.cn'` 硬编码于 8 个文件 ✅（批次①） | 已建 `src/consts.ts` 单一来源，8 处全部改为导入；`astro.config.mjs` 的 `site` 亦从其导入，全仓仅一处字面量 |
| P2-4 | `prune-dist.mjs` 拼接 ~20MB 全文后逐文件 `includes`（O(n·m)，"任意位置出现即保留"过脆） | 一次正则抽 `/wp-content/uploads/...` 路径构建 `Set`，成员判断 O(1)；报告新增 prune 明细 |
| P2-5 | 根目录 `CNAME` 与 `public/CNAME` 重复（deploy-pages 只认 dist 那份）✅（批次①） | 根 CNAME 已删除，保留 `public/CNAME` 并在 README 注明 |
| P2-6 | 无 lint/format；`package.json` 缺 `engines`（README 要求 Node ≥22.12） | `engines` 已加（批次①）；eslint(preset-astro)+prettier 仍待办 |
| P2-7 | `astro check` 存量 50 hints（SEO/VideoEmbed 模板属性） | 顺手清零，保持 0 errors/warnings 基线 |

### P3 CI 与周边

| 编号 | 项 | 说明 |
| --- | --- | --- |
| P3-1 | Actions 迁移后 push 不自动触发 | 已定位为组织迁移遗留（`a68d051` 无 auto run）；需在仓库 Settings → Actions 网页端确认启用；验证：随便 push 一个 docs 提交看 run |
| P3-2 | 每次 push 全量上传 ~250MB artifact | 随 P0-2 媒体外迁自然解决；短期可在 workflow 加 `timeout-minutes: 20` |
| P3-3 | 缺 RSS/Atom | 新闻站标配；数据层就绪，`src/pages/rss.xml.ts` 用 meta 层生成近 20 篇即可 |
| P3-4 | 首页「近期资讯」正则改写 39KB HTML 块 | 脆弱（依赖 `<h5>近期资讯</h5>` 字面量）；P2-1 组件化时改为数据驱动渲染 |

---

## 3. 实施路线（每批独立可验证、可回滚）

| 批次 | 内容 | 风险 | 预期收益 |
| --- | --- | --- | --- |
| ① 快赢（半天）✅ **已执行 2026-08-27** | P0-2.1/2 删孤儿+未引用资源+死数据键；P1-2 内联 CSS 外置；P2-3/5/6(engines) | 低 | **实测**：public -10.9MB（684→674）、164 文件；数据 JSON -101KB；每页 HTML -6KB 且可缓存；回归逐字节一致 |
| ② 数据层（1 天） | P0-1 posts 拆分 + 死字段清理 + 导入脚本适配 | 中（全链路回归） | 构建解析 -95%，git diff 友好，列表 props 缩小 ~40× |
| ③ 代码收敛（半天） | P2-1/2/4/6(余 lint) | 低 | 三页合一，prune O(n)，基线卫生 |
| ④ 性能分层（1 天） | P1-1 按模板 CSS/JS、P1-3 回退缩略、P1-4 CLS | 中 | 文章/列表页首传 -300–500KB，CLS 达标 |
| ⑤ 战略（评审后） | P0-2.3 媒体 CDN/LFS、P3-1 Actions 触发、P3-3 RSS | 高（外部依赖） | 解除 1GB 天花板，CI 分钟级 |

> **初稿「批次① dist -170MB±」的修正**：该估算基于误判的孤儿集（见 P0-2 更正注记）。uploads 体积几乎全属在用/归档设计内，快赢清理的真实收益是 framework 10MB + 每页字节与请求卫生；**发布体积的数量级下降只能依赖批次⑤媒体外迁**。

**验证口径**：每批后跑 `npm run check && npm run build:prune`，对比 `dist` 体积/文件数、297 页数不减少、`sitemap` 与 canonical 不变；批次①的孤儿删除需先在 `docs/` 留被删清单快照。

## 4. 量化收益汇总

| 指标 | 现状（基线 a68d051） | 批次①后（实测） | 完成②–④后（目标） |
| --- | ---: | ---: | ---: |
| public / dist（发布） | 684MB / ~295MB | **674MB / 290MB** | 674MB / ~285MB |
| 每页 HTML 重复内联 CSS | 6KB × 295 | **0**（入 inline.css） | 0 |
| 每页固定 CSS+JS | ~0.85MB | ~0.85MB | 列表/文章 ~0.4MB |
| 构建输入 JSON | 12.6MB | 12.45MB | ~0.8MB（meta 层） |
| 孤儿/死资源残留 | uploads 19 + fw 145 + 死键 101KB | **0** | 0（`images:orphans` 常态化） |
| 新增一篇文章的 git diff | 重写 12MB 行 | 不变 | ~50KB 新文件 |

发布体积的数量级下降（290MB → <20MB）属**批次⑤（媒体外迁）**范畴，快赢与代码层优化无法替代。
