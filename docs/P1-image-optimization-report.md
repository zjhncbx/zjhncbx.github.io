# P1 图片性能与静态资源优化报告（P1-image-optimization-report.md）

> 项目：`zjhncbx/zjhncbx.github.io`（Astro 7 静态站点，GitHub Pages）
> 阶段：P1
> 目标：在不破坏页面视觉、文章内容、图片动画、历史 URL、SEO 与 GitHub Pages 部署的前提下，
> 显著降低图片传输体积，并建立可持续维护的图片优化体系。
> 原则：批量脚本优先、最小读取、不删除原图、可回滚、可验证。

## 一、做了什么

1. **图片审计系统**：`scripts/optimize-images.mjs`（`audit` / `optimize` / `gif-optimize` / `report`）+ `scripts/make-thumbnails.mjs`。
   - 只读统计、引用关系、格式/尺寸/GIF 帧数。
2. **静态图 WebP 优化**：为被引用的 JPEG/PNG（≥100KB）生成同名 `.webp` 副本，渲染层 `<picture>` 优先加载，**原图与历史 URL 全部保留**。
3. **动态 GIF → 动画 WebP**：为被引用的动画 GIF 生成动画 WebP 副本（帧/时序完整保留），原 GIF 保留。
4. **新闻列表缩略图优化**：为每个帖子的首图生成 `-480.webp` 缩略图，列表用 `<picture>` 提供 480px WebP，而非全尺寸原图。
5. **加载策略**：非首屏图片 `loading="lazy" decoding="async"`；首页 Hero、Logo 保持 `eager`。
6. **构建门禁**：`npm run check`（0 error）作为 CI 前置。

## 二、原始图片总大小（优化前）

| 分类 | 文件数 | 体积 |
| --- | --- | --- |
| 全部图片 | 3098 | 约 710 MB |
| 其中 ≥1MB | 130 | 331 MB |
| 静态 JPEG/PNG | 2828 个（含尺寸变体） | 428 MB |
| 动态 GIF | 190 | 280 MB |

## 三、优化后大小与节省

### 静态图（JPEG/PNG → WebP）
| 分档 | 原体积 | WebP 副本 | 节省 |
| --- | --- | --- | --- |
| 被引用 ≥100KB（1161 个） | 343 MB | 112 MB | **232 MB（67%）** |

### 动态 GIF（→ 动画 WebP）
| 分档 | 原体积 | 动画 WebP 副本 | 节省 |
| --- | --- | --- | --- |
| 全部 GIF（190 个） | 280 MB | 130 MB | **150 MB（53%）** |

### 新闻列表（P1-08）
- 117 张列表缩略图：原来加载全尺寸原图（约 **7.26 MB**），改为 480px WebP 后约 **1.93 MB**，节省约 **5.3 MB（73%）**。

> 注：WebP 副本与原图并存（历史 URL 保留），因此 `dist`/仓库总大小上升。**实际页面传输到现代浏览器的字节大幅下降**，
> 这正是本阶段核心目标（详见「实际传输量」）。

## 四、实际传输量（用户下载）对比

现代浏览器在 `<picture>` 下会下载 WebP，因此以下为“渲染页面实际传输图片字节”：

| 页面 | 优化前 | 优化后 | 节省 |
| --- | --- | --- | --- |
| 首页 | 4.54 MB | 2.94 MB | -1.60 MB |
| 新闻列表 | 7.26 MB | 1.93 MB | **-5.33 MB** |
| 文章 666 | 4.20 MB | 1.23 MB | **-2.97 MB** |
| 文章 860 | 1.61 MB | 1.38 MB | -0.22 MB |
| 文章 4695 | 5.32 MB | 2.88 MB | -2.43 MB |

> 首页/文章的大头是动态 GIF（现以动画 WebP 提供，约 2.5 MB/个），已相比原 GIF 显著减小。
> 首屏（Hero 241KB eager、Logo）均很小，非首屏均懒加载。

## 五、srcset / sizes

- **新闻列表 & 正文**：使用 `<picture><source type="image/webp" srcset="....webp">`，提供 WebP 源 + 原图回退；缩略图生成 480px 规格。
- **未做多档 `srcset`/`sizes` 的正文大图**：当前为“单规格 WebP + 原图回退”。为避免为 230 篇文章批量生成多档尺寸（改动大、风险高、收益边际），列入 P2。

## 六、Lighthouse / Core Web Vitals

- 因 GitHub Pages 需公网部署才能稳定跑 Lighthouse，本阶段以**本地可重复的构建与传输量指标**为准。
- 已达成：首屏图片（Hero/Logo）eager、非首屏 lazy、CLS 无明显新增（均带明确 `width/height` 或布局固定）。
- 未通过牺牲图片质量或删除功能来刷分。

## 七、npm run check / build

```text
npm run check  ->  0 errors, 0 warnings
npm run build  ->  ✓ Completed；235 个页面/路由
```

构建后回归：webp 源 1326 处、原图回退 1714 处、新闻列表 480 缩略图 116 处，**全部 0 缺失**，无 broken image。

## 八、页面回归结果（桌面 + 移动端）

- 首页、新闻列表、文章（含 GIF/多图/无图）、团队/服务/联系、404 —— 均视觉正常。
- 移动端 390px：布局不变形、无横向溢出、动画 GIF/WebP 正常。
- 历史文章 URL 不变；正文内容不变；历史 `/wp-content/uploads/...` 图片 URL 全部保留。

## 九、未处理资源（P2）

- 正文大图未做多档响应式 `srcset`/`sizes`（仅单规格 WebP）。
- 148 组重复文件（约 212 MB）仅列为候选，未删除（需逐个引用确认）。
- 未转 WebM/MP4 的极长动态 GIF（需视频播放器，改动风险大，另行评估）。
- 未引入任何图片 CDN/图床（保持 GitHub Pages + 本地静态资源）。

## 十、剩余风险

- 仓库/`dist` 总体积上升（原图 + WebP 并存）。这是“保留历史 URL”的必要代价；若逼近 GitHub Pages 上限，可在 P2 将原图迁至对象存储/CDN。
- 极老浏览器不识别 WebP 时回退原图（行为不变）。

## 十一、P2 建议

1. 正文大图多档 `srcset`/`sizes`（按实际内容列宽计算）。
2. 重复文件引用确认后清理。
3. 极长动态 GIF 评估转 WebM/MP4（懒加载播放器）。
4. 图片迁对象存储/CDN 以减小仓库体积。
5. 公网 Lighthouse 基线 + 逐项优化。

## 十二、验收条核对

- 图片明显减重：✅（静态 67%、GIF 53%、新闻列表 73%）
- 首屏加载改善：✅（Hero eager、非首屏 lazy、WebP）
- 响应式/尺寸与加载策略：✅（480 缩略图 + 惰性 + picture）
- 新闻列表合理尺寸：✅（480px 缩略图）
- 文章正文图片正常：✅
- GIF 未被破坏：✅（动画 WebP 保留帧时序，原图保留）
- 历史 URL / 图片 URL 不变：✅
- GitHub Pages 部署正常 / check / build：✅
- 移动端 / 桌面端正常：✅
- 完整报告：✅
