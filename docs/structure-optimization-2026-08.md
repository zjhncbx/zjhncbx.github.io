# 项目结构全面审计与优化方案（2026-08）

> 生成日期：2026-08-27 · 仓库：`zjhncbx/zjhncbx.github.io` · 基线 commit：`a68d051`（新闻列表分页 + 年份侧栏上线后）
> 性质：只读审计 + 方案设计；**批次①②③④ 已实施完毕**（①见 `docs/orphans-2026-08.md`，②③④见文中 ✅ 注记），批次⑤待选型。

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

#### P0-1 `posts.json` 单文件巨石（12MB / 平均 48KB/篇） ✅（批次②已执行 2026-08-27）
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

> **执行注记（批次②）**：`scripts/split-posts.mjs`（一次性）已拆出 `posts.meta.json` **241KB** + `src/data/posts/<id>.html` 240 个正文文件；正文经 `lib/blog.ts` 的 `import.meta.glob('?raw')` 懒加载。摘要/描述按旧渲染的**两套精确公式**固化为 `excerpt`(collapse+140，列表) 与 `desc`(未折叠+160，文章 meta)，自检 0 失配；删 5 个死字段。全部消费端（blog/[id]/[...slug]/index/sitemap）与三个工具脚本（import/make-thumbnails/optimize-images）同步适配；livepages 再清死键 -187KB（三栏目页的 header/footer/content_prefix）。**回归**：9 个代表页（覆盖全部模板）+ sitemap 与基线**逐字节一致**，295 页不减；常驻构建输入 12.6MB → 0.5MB。踩坑复用：getStaticPaths 不可见 frontmatter 组件级常量，页面文案外置 `src/data/staticPages.ts`。

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

#### P1-1 全量 CSS/JS 无差别下发 ✅（批次④已执行 2026-08-27，CSS 部分）
每页固定 21 CSS + 12 JS ≈ **0.85MB（未压缩）**。文章/列表页不需要 Elementor、Swiper；栏目页不需要 blog widget 样式。`livepages` 已有 per-page `css` 增量清单，缺的是反向的**按模板裁剪**。

**方案**：`assets.json` 按组拆：`core`（bootstrap/sydney/jquery）+ `elementor` + `home` + `blog`；BaseLayout 接收 `assetGroups` prop。预期列表/文章页省 300–500KB 传输。
> **执行注记**：采用最小改动版——`assets.json` 新增 `blogCss`（6 文件 ≈77KB，即 WP 原站在博客模板实际下发的清单，取自批次①前的 `livepages.blog.css` 快照）；BaseLayout 加 `cssScope?: 'global'|'blog'`，`BlogArchive`/`[id]` 传 `blog`。**裁剪安全性双重实证**：240 篇正文 + 博客壳片段 0 处 `elementor-*`/`wp-block`/`fa-*`/`eicon-`/`swiper` 类；主题全局 `img{max-width:100%;height:auto}` 已确认存在。21→7 个 stylesheet 链接（含 inline.css），非博客页零变化。**未做**：JS 按模板分组——脚本内嵌在抓取片段（home_footer 10 个 / 栏目 body 各 8 个）里，拆组需重写片段本体，风险/收益不划算，留待片段 HTML 化时处理。

#### P1-2 BaseLayout 6KB `<style>` 逐页内联 ✅（批次①已执行）
297 页重复 ≈ 1.8MB 冗余字节且无法跨页缓存；首页另有 1.5KB 同类内联。
**方案**：并入 `public/assets/inline.css`（或新建 `site-overrides.css`），删除各页 `<style is:inline>` 全局规则（保留真正 per-page 的）。
> 执行注记：BaseLayout 全局块（5,993B）已原样追加至 `inline.css` 末尾（层叠顺序不变）；首页专属样式保留内联。回归验证：首页/文章页/列表页与旧构建**逐字节一致**（仅少了 style 块）。

#### P1-3 列表缩略图回退引用全尺寸原图 ✅（批次④已执行 2026-08-27）
`ResponsiveImage` 的 `<img src={p.thumb}>` 回退指向原图 → prune 必须保留 127 张全尺寸封面（**9MB 进 dist**），且不支持 WebP 的浏览器在列表页会下载全尺寸图。另：`-480.webp` 生成正则不含 `.gif`，gif 封面（如 2.5MB 的 `21620459622.gif`）在列表页直接播原图。
**方案**：`make-thumbnails.mjs` 同步产出 `-480.jpg`（含 gif 静帧），`BlogArchive` 回退 `src` 用 `-480.jpg`；预计 dist 再省 ~7MB。
> **执行注记**：125 张封面的 `-480.jpg` 已生成（`images:thumbs` 双孪生）；`BlogArchive` 经 `thumbVariants()`（`lib/image.ts`）输出 `-480.webp`+`-480.jpg` 并按 sidecar 注入**真实纵横比**（原硬编码 480×300 导致占位框失真）；文章页题图改 Option C 直发全尺寸 `.webp`。审计孪生扩展与 prune 均已认识 `-480.jpg`。**偏差**：「dist 再省 7MB」未兑现——`og:image` 有意保留原图绝对 URL（微信/QQ 爬虫对 webp 预览兼容性不稳，且社交卡片需要分辨率）；原图仍被 prune 保留。换来的是列表页每张封面 300KB–1.4MB → ≈32KB、gif 封面（实为正文图，封面数据里 0 张）问题不存在。dist 净 +2.6MB（125 个 -480.jpg）。

#### P1-4 正文懒加载图无显式尺寸 → CLS ✅（批次④已执行 2026-08-27）
`image.ts` 的 lazy 注入不带 width/height（文章页 40+ 张 lazy 图）。
**方案**：`images:optimize` 生成 `uploads/_sizes.json` sidecar（sharp metadata 一次采集），`image.ts` 注入 `width/height`；同时给 `hm.baidu.com` 加 `preconnect`。
> **执行注记**：sidecar 落位 `src/data/image-sizes.json`（新 `images:sizes` 命令；2889 stems/190KB，键为去扩展名相对路径，天然兼容 `.webp` 孪生与 `-480` 变体）。`imagePipeline` 新序：webp 替换 → **尺寸注入**（仅缺 width/height 的 uploads `<img>`，115 张自带尺寸不覆盖）→ lazy。实测文章页 2822 全部 41/41 张 `<img>` 带尺寸；首页 elementor 头像/团队 logo 一并受益。preconnect 已加（全站唯一非预期 diff 行，contact/team 逐行核过仅 +1 行）。主题已有 `img{max-width:100%;height:auto}` 全局保护，属性仅供纵横比盒，无变形风险。

### P2 可维护性

| 编号 | 问题 | 方案 |
| --- | --- | --- |
| P2-1 | contact/services/team 三页 23 行逐字相同 ✅（批次③） | 已收敛为 `src/pages/[page].astro` + `src/data/staticPages.ts`（文案/路由键），三文件删除，输出逐字节一致 |
| P2-2 | `fmtDate` 在 `[id].astro` 重复实现；剥标签摘要逻辑 3 处各写各的 ✅（批次②③） | `fmtDate`/`isoDate` 统一 `lib/blog.ts`；摘要公式在数据层固化为 `excerpt`/`desc`，渲染端不再各自剥标签 |
| P2-3 | `const base='https://www.hncbx.org.cn'` 硬编码于 8 个文件 ✅（批次①） | 已建 `src/consts.ts` 单一来源，8 处全部改为导入；`astro.config.mjs` 的 `site` 亦从其导入，全仓仅一处字面量 |
| P2-4 | `prune-dist.mjs` 拼接 ~20MB 全文后逐文件 `includes`（O(n·m)，"任意位置出现即保留"过脆） ✅（批次③） | 已改为一次正则抽 uploads 引用 → 排序数组 + 二分前缀判定；与旧 substring 逻辑在现网 dist 上**同删 1130 / 同留 99 / 同释放 418.3MB**，行为等价 |
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
| ② 数据层（1 天） ✅ **已执行 2026-08-27** | P0-1 posts 拆分 + 死字段清理 + 导入脚本适配 | 中（全链路回归） | **实测**：常驻构建 JSON 12.6→0.5MB；meta 241KB + 正文 240 文件；livepages 再 -187KB；9 代表页逐字节回归一致 |
| ③ 代码收敛（半天） ✅ **已执行 2026-08-27（与②同批）** | P2-1/2/4 完成；P2-6 余 eslint（可选，未引入） | 低 | 三页合一（净 -2 文件）、日期/摘要归一、prune 前缀二分判定（1130删/99留 与旧逻辑完全一致） |
| ④ 性能分层（1 天） ✅ **已执行 2026-08-27** | P1-1(CSS 部分)/P1-3/P1-4 完成；P1-1 的 JS 分组与 P3-2 图片 srcset 待后续 | 中 | **实测**：博客面 stylesheet 21→7（-323KB 未压缩/页）；列表封面 300KB–1.4MB→≈32KB；正文 100% `<img>` 带尺寸（CLS）；preconnect 就位；295 页不减、非博客页仅差 preconnect 一行 |
| ⑤ 战略（评审后） | P0-2.3 媒体 CDN/LFS、~~P3-1 Actions 触发~~（已恢复正常，b0ac2ed 起 push 自动部署）、P3-3 RSS | 高（外部依赖） | 解除 1GB 天花板，CI 分钟级 |

> **初稿「批次① dist -170MB±」的修正**：该估算基于误判的孤儿集（见 P0-2 更正注记）。uploads 体积几乎全属在用/归档设计内，快赢清理的真实收益是 framework 10MB + 每页字节与请求卫生；**发布体积的数量级下降只能依赖批次⑤媒体外迁**。

**验证口径**：每批后跑 `npm run check && npm run build:prune`，对比 `dist` 体积/文件数、297 页数不减少、`sitemap` 与 canonical 不变；批次①的孤儿删除需先在 `docs/` 留被删清单快照。

## 4. 量化收益汇总

| 指标 | 现状（基线 a68d051） | 批次①后 | 批次②③后 | 批次④后（实测） |
| --- | ---: | ---: | ---: | ---: |
| public / dist（发布） | 684MB / ~295MB | **674MB / 290MB** | 674MB / 290MB | 674MB(+2.6MB 新孪生) / **297.3MB**（og 留原图，见 P1-3 注记） |
| 每页 HTML 重复内联 CSS | 6KB × 295 | **0**（入 inline.css） | 0 | 0 |
| 每页固定 CSS | ~0.40MB（21 文件） | ~0.40MB | ~0.40MB | **博客面 77KB（6 文件）**；栏目/首页不变 |
| 列表页封面传输 | 300KB–1.4MB/张 | 同左 | 同左 | **≈32KB/张（-480 孪生）** |
| 正文 `<img>` 尺寸标注 | 3% (115/3715) | 同左 | 同左 | **100%（sidecar 注入）** |
| 常驻构建输入 JSON | 12.6MB | 12.45MB | **~0.5MB** | ~0.7MB（+sizes 190KB） |
| 孤儿/死资源残留 | uploads 19 + fw 145 + 死键 101KB | **0** | 0 | 0（`images:orphans` 复核 0，孪生扩展已含 -480.jpg） |
| 新增一篇文章的 git diff | 重写 12MB 行 | 不变 | **~50KB 新文件（posts/<id>.html）+ meta 追加** | 同左（另需 images:thumbs/sizes 增量） |

发布体积的数量级下降（290MB → <20MB）属**批次⑤（媒体外迁）**范畴，快赢与代码层优化无法替代。
