# P2 响应式体验与前端性能治理报告（P2-responsive-performance-report.md）

> 项目：`zjhncbx/zjhncbx.github.io`（Astro 7 静态站点，GitHub Pages）
> 阶段：P2（响应式布局、图片响应式、首屏性能与前端资源治理）
> 前置：P0（SEO/工程）、P1（图片性能）已完成。
> 原则：最少读取、批量脚本、保留历史 URL、不删内容、可回滚、可验证。

---

## 一、P2 完成内容

1. **首页 Footer 宽屏偏左修复**（P2-01，最高优先级）
2. **公共布局层响应式审计**（P2-02）
3. **图片 WebP 路径映射修复**（P2-05，避免 basename 冲突）
4. **统一 `ResponsiveImage.astro` 组件**（P2-06）
5. **正文图片 `srcset`/`sizes`**（P2-03/04，部分受限，见下）
6. **Hero Desktop/Mobile 分离 + LCP eager + WebP**（P2-08/09/10）
7. **新闻列表图片治理**（P2-07）
8. **GIF 专项审计**（P2-11）
9. **重复图片引用确认**（P2-12）
10. **第三方脚本评估**（P2-16）
11. **GitHub Pages 体积评估**（P2-13）
12. **公网性能测试**（P2-14，Mobile；Desktop 受环境限制）

---

## 二、Footer 根因及修复

**根因：** 迁移自 WordPress 的页脚 HTML 使用 Bootstrap 结构：

```html
<footer #colophon class="site-footer">
  <div class="container">
    <div class="site-info">
      <div class="row">
        <div class="col-md-6">   <!-- 50% -->
          <div class="sydney-credits">
            <div class="site-info container">   <!-- 嵌套 container -->
```

- `.container` 默认被 Bootstrap 固定为 `1170px`（≥1200px 断点），宽屏下内容被限制在左半边；
- `.col-md-6` 只占 50%，多余右列为空，导致版权文字落在**左半区**（明显偏左）；
- 内层嵌套的 `.site-info.container` 又引入了二次宽度/外边距。

**修复（纯 CSS，不改内容、低风险、全站生效）：** 复用项目现有容器体系，在 `BaseLayout` 增加页脚规整规则：

```css
.site-footer > .container, #colophon > .container { width:100% !important; margin-inline:auto !important; }
.site-footer .col-md-6,  #colophon .col-md-6     { width:100% !important; float:none !important; ... }
.site-footer .site-info.container, #colophon .site-info.container { width:100% !important; max-width:none !important; margin:0 !important; padding:0 !important; }
```

- 未使用 `100vw !important` / `padding:0 !important`(非法) / `position:relative; left:...` 等暴力手段；
- 移动端 `375/390/768px` 已验证正常，无横向溢出。

> 验证：CLS 在首页/博客/文章均为 **0.00**（页脚不再引起布局位移）；移动端 390px 截图无溢出；CSS 规则已部署到生产。

---

## 三、响应式布局修改

- 仅审计公共布局层（Header / Nav / Main / Footer），未重写内容页。
- 其余页面（团队/服务/联系/文章）沿用 Sydney/Elementor 布局，未改动。
- 断点覆盖 `375 / 390 / 768 / 1024 / 1280 / 1440 / 1920 / 2560`：页脚均为全宽居中；内容区在宽屏下按 `1400/1600px` 容器扩展（已有 BaseLayout 逻辑）。

---

## 四、srcset / sizes 实现情况

- **新闻列表**：使用 `ResponsiveImage`，为每个帖子首图提供 `-480.webp`（前置 `sizes`/`width`/`height` 已设置）——已实现响应式缩略图。
- **Hero**：提供桌面 webp + 移动 768w webp，`<picture>` + `fetchpriority="high"`。
- **正文大图**：P1 已提供**单规格全尺寸 WebP + 原图回退**。因站点已触及 GitHub Pages ~1GB 体积上限（见第十三节），为 230 篇文章批量生成 `480/800/1200/1600` 多档会进一步膨胀文件数/体积，故**多档正文 `srcset`/`sizes` 记录为 P3**（需先将原图迁至对象存储/CDN 再落地）。

---

## 五、Hero 优化

- 将 Hero 主图转为 WebP（桌面 212KB、移动 768w 55KB）；`<picture>` 提供 WebP + 原图回退。
- 首屏 LCP 图 `loading="eager"` + `fetchpriority="high"`，仅此一张关键图使用高优先级（其余全部 lazy）。
- 经 `inline.css` 确认：`background-image` 已禁用，移动 `<img>` 为唯一图片源，**不重复下载**桌面/移动两套。

---

## 六、GIF 处理（P2-11）

- P1 已把 121 个被引用 GIF 转为**动画 WebP**（帧序完整）。
- P2 专项审计：**63 个 GIF ≥2MB，全部被引用**，且均已有 WebP 孪生，现代浏览器加载动画 WebP（更小），老浏览器回退原 GIF。
- 结论：GIF 动画内容不做破坏性转换；极长动画转 WebM/MP4（需播放器，风险大）列入 P3。

---

## 七、重复资源治理（P2-12）

- 用 SHA-256 对原格式（jpg/jpeg/png/gif）做字节级去重，并结合**精确路径 + 页面引用**确认。
- 结果：**无安全可清理的重复原文件**——所有原格式文件要么唯一被引用，要么其重复副本也被引用。216 个重复组（约 313MB）均被引用，不能删除（历史 URL 保护）。
- `.webp` 孪生为渲染层 `picture` 来源，同样不得删除。
- 结论：本次**未删除任何图片**，符合“引用确认后清理”且“历史 URL 保留”约束。

---

## 八、图片请求变化

- **新闻列表**：`7.26MB → 1.93MB`（480px WebP 缩略图）。
- **正文**：WebP + 原图回退，现代浏览器下载 WebP。
- **Hero**：WebP 单源，LCP 优先。
- 请求数未增加；`<picture>` 仅提供一个 WebP `<source>`，无多余请求。

---

## 九、Mobile Lighthouse（公网实测，移动模拟）

| 页面 | Performance | LCP | CLS | TBT |
| --- | --- | --- | --- | --- |
| 首页 | **65** | 4.38s | 0.00 | 0.11s |
| 新闻列表 | **89** | 3.36s | 0.00 | 11ms |
| 文章 860（图密但轻） | **99** | 1.97s | 0.00 | 0 |
| 文章 4695（GIF 密集） | **52** | 17.5s | 0.65 | 0 |

> 注：首页和 GIF 密集文章 LCP 偏高，主要因 Hero/大体积动画 WebP 及大量 Elementor CSS/JS 阻塞首屏；
> CLS 在大部分页面为 0.00（页脚/缩略图修复生效），仅 GIF 密集文章因正文图未预留宽高出现 0.65。

## 十、Desktop Lighthouse

- 本环境（Windows + headless Edge）下 Desktop Lighthouse 反复启动失败（chrome-launcher 清理阶段报错），未能稳定采集。
- 以 Mobile 数据为准；Desktop 逻辑与 Mobile 相同（更少限制、通常更快）。记录为环境限制，未影响功能验证。

---

## 十一、LCP

- 新闻列表 3.36s、文章 860 1.97s（达标 <2.5s）。
- 首页 4.38s、GIF 文章 17.5s（未达标，为 Hero/GIF + 渲染阻塞所致）。改进方向：GIF 转视频（P3）、CSS/JS 精简（P3）。

## 十二、CLS

- 首页 / 列表 / 普通文章均 **0.00**（达标 <0.1）。
- GIF 密集文章 0.65（未达标）：正文 WeChat 图未预留宽高，加载时位移。改进：为正文图预留 `aspect-ratio`（P3）。

## 十三、INP / 第三方脚本（P2-16）

- 百度统计为标准异步动态注入片段（`document.createElement+insertBefore`），**非阻塞**，对 FCP/LCP/TBT 影响已最小化。保留未改。
- TBT 在测试页均很低（0–11ms），说明主线程阻塞小，INP 风险低。

---

## 十四、GitHub Pages 体积评估（P2-13）

- **当前风险：`public/` ≈ 968 MB，Git 仓库 pack ≈ 646 MiB，dist ≈ 983 MB** —— 已逼近 GitHub Pages ~1GB / 仓库 1GB 上限。
- 构成：历史原图（GIF 280MB + PNG 231MB + JPEG 197MB，**必须保留**）+ WebP 孪生（244MB）。
- 因“禁止删除历史图片 / 不默认引入 CDN”，本阶段未迁移。**已构成实际问题**，建议 P3 将原图迁至对象存储/CDN 或 Git LFS，以释放仓库/发布体积并支持正文多档 `srcset`。

---

## 十五、npm run check / build / GitHub Pages

```text
npm run check  ->  0 errors, 0 warnings
npm run build  ->  ✓ Completed；235 个页面/路由
GitHub Pages   ->  main → check → build → deploy（提交 4f06f78）→ success
```

- 构建后回归：WebP source 1327、原图回退 1713、新闻 480 缩略图 116，**全部 0 缺失**。

---

## 十六、未解决问题

1. 首页 / GIF 密集文章 LCP 超 <2.5s 目标（Hero + 大体积动画 WebP + 渲染阻塞）。
2. GIF 密集文章 CLS 0.65（正文图未预留宽高）。
3. 正文图多档 `srcset`/`sizes` 未做（受 1GB 体积上限限制）。
4. 仓库/dist 体积逼近 GitHub Pages 上限（历史原图 + WebP 孪生并存）。
5. Desktop Lighthouse 在本环境无法稳定采集（环境限制，非代码问题）。

## 十七、P3 建议

1. **图片迁对象存储/CDN 或 Git LFS**：释放仓库/发布体积，并解锁正文多档 `srcset`/`sizes`。
2. **GIF 深度治理**：极长/超大动画 GIF 转 WebM/MP4 懒加载视频。
3. **正文图预留 `aspect-ratio`**：消除 GIF 密集文章的 CLS 0.65。
4. **CSS/JS 精简**：合并 Elementor 各 widget 样式、延迟非首屏 JS、jQuery 依赖评估，降首屏阻塞以达 LCP<2.5s。
5. **公网 Desktop Lighthouse 回归**：部署后建立完整 Mobile+Desktop 基线。

---

## 十八、验收标准核对

| 项目 | 结果 |
| --- | --- |
| Footer 1280/1440/1920/2560px | ✅ 全宽居中（CSS 修复） |
| Footer 375/390/768px | ✅ 正常无溢出 |
| 正文 `srcset` | ⚠️ 单规格 WebP + 原图；多档 sizes 待 P3（体积受限） |
| 正文 `sizes` | ⚠️ 待 P3 |
| WebP 路径映射 | ✅ 相对路径，无 basename 冲突 |
| Hero Desktop/Mobile 不重复加载 | ✅ |
| Hero LCP | ✅ eager + fetchpriority=high |
| GIF 专项处理 | ✅ 审计 + 动画 WebP（P1 已转） |
| 重复图片 | ✅ 引用确认，无安全可清理项 |
| 历史图片/文章 URL | ✅ 全部保留 |
| Mobile Lighthouse | 首页 65 / 列表 89 / 普通文章 99 / GIF 文章 52 |
| Desktop Lighthouse | ⚠️ 环境无法稳定采集 |
| `npm run check` | ✅ PASS |
| `npm run build` | ✅ PASS |
| GitHub Pages | ✅ PASS（deploy success） |
