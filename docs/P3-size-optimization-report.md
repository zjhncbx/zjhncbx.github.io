# P3 静态资源体积治理报告

> 阶段：P3-1 审计 → P3-2 去重 → P3-3 图片瘦身（本期已执行） · 日期：2026-08-23
> 遵循原则：**不删除历史内容；原图保留于仓库；发布站点只承载优化资源；不改写 Git 历史（§13-14，需授权）。**

## 1. 结果对比
| 项 | 基线（P3 前） | 现状（P3 后） | 目标 | 状态 |
| -- | --: | --: | -- | -- |
| `public/`（仓库原图+WebP） | 997.2 MB | **677.8 MB** | < 700 MB | ✅ |
| `dist/`（GitHub Pages 发布） | 1013.6 MB | **295.3 MB** | < 750 / < 600 | ✅ |
| `.git` pack（仓库历史） | 670.5 MiB | 669.2 MiB | — | ⏸ 历史未改写 |
| `npm run check` | — | **0 errors / 0 warnings** | PASS | ✅ |
| `npm run build` | — | **245 pages** | PASS | ✅ |
| 微信图片外链 | 0 | **0** | = 0 | ✅ |
| dist 上传资源缺失引用 | — | **0** | 0 | ✅ |

## 2. 执行内容

### 2.1 原图与发布资源分离（Option C）
- `src/lib/image.ts`：`<img>` 若有 `.webp` 孪生，改为**直接以 WebP 作为 src** 输出（原图仅在仓库保留，不再被正文引用）。
- `scripts/prune-dist.mjs`（新增）+ `npm run build:prune`：`astro build` 后扫描 `dist` 全部文本，**保留被引用**的原图（favicon、首页 Hero、头部/尾部、缩略图、`background-image`），删除**未被引用**且带 WebP 孪生的原图；WebP 孪生全部保留。
- `.github/workflows/deploy.yml`：构建步骤由 `npm run build` 改为 `npm run build:prune`，发布产物为瘦身后的 `dist`。

### 2.2 完全相同资源去重（SHA-256）
- 对 `public/wp-content/uploads` 全部原图按 **SHA-256** 分组，识别 **148 组**完全相同副本。
- 每组保留**一个 canonical**（被引用最多、且有 WebP 孪生者），把其余副本在 `posts.json / render_blocks.json` 中的引用**改写**到 canonical（共 **817 处** URL 重写）。
- 删除**已无引用**的 334 个原图 + 142 个 WebP 孪生（约 **335 MB**）——这些正是各文章重复的“头图 GIF / 尾图名片”。
- 安全门：删除前再全量扫描所有 `src/*.astro`、`*.json`、`*.css/*.js` 引用，凡仍被引用的文件一律保留。

### 2.3 视频
- 本仓库 **无 mp4/webm/mov**（0 个），视频体积非瓶颈；视频号按前序规则以“封面+信息+入口”保留，未下载巨型视频。

## 3. 主要收益来源
- 重复的头图/尾图（GIF 头条 4.06MB × 34 份 = 134 MB 等）→ SHA-256 去重后仅保留一份；
- 原图与 WebP 双份 → 发布层只保留 WebP（原图留仓库）；
- 结果：`dist` 由 ~1013 MB 降至 295 MB（净降 ~718 MB），`public` 由 ~997 MB 降至 678 MB。

## 4. 未做 / 需授权项
- **Git 历史重写**（§13-14）：已删除的重复原图仍存在于历史对象中（`.git` pack 未缩小）。若要进一步压缩仓库，需 `git filter-repo` 等**改写历史并 force push**，属破坏性操作，**需你明确授权后另行执行**。
- **进一步给 非 WebP 浏览器提供原图回退**：本期按 Option C 采用 WebP 直接输出；现代浏览器（含 Safari 14+/iOS 14+）均支持 WebP，旧浏览器会显示图片缺失回退。如需要保留通用回退，需另立方案。

## 5. 后续建议（P3-5）
- 若接受“原图仅存档、不入库”，可把 `archive/`（仍保留原图）移出 `public/` 并配合历史重写，进一步把 `.git` 与 `public` 压到最低；
- 长期建议将图片迁对象存储/CDN 或 Git LFS，彻底摆脱仓库体积约束。
