# 资源审计报告（resource-audit.md）

> 本项目（`zjhncbx/zjhncbx.github.io`）为 Astro 7 静态站点，运行于 GitHub Pages。
> 站点由 WordPress + Sydney 主题 + Elementor 迁移而来，保留了 `public/wp-content` 下的历史资源以维持现有页面视觉兼容。
> 本报告基于源码依赖关系（`src/data/*.json`、`src/**/*.astro`、`public/**/*.css`）对资源进行引用分析。
>
> **审计日期：** P0 阶段（随本次构建产出一并生成）。
> **审计方式：** 解析全部可渲染文本中出现的 `/wp-content/uploads/...` 引用，与磁盘上实际存在的文件做差集比对。

## 审计结论（摘要）

| 指标 | 数值 |
| --- | --- |
| 被页面引用的 uploads 资源 | 3094 |
| 磁盘上实际存在的 uploads 资源 | 3098 |
| 被引用但磁盘缺失的资源 | **0** |
| 未被引用的 uploads 资源（孤儿） | 4（合计约 0.4 MB，且均为**误报**） |
| 可安全删除的资源 | **无** |

> **关键结论：** 没有安全可批量删除的资源。绝大多数 `public/wp-content` 资源都被现有页面实际引用；
> 仅有的 4 个“孤儿”在人工复核后均为引用匹配的误报（见下），因此 **P0 阶段不执行任何资源删除**，避免破坏页面视觉。

## 一、CSS 资源清单（加载于页面 `<head>`）

以下 CSS 由 `src/data/assets.json` 中全局（BaseLayout）或各页（team / services / contact / blog）加载。

| 资源 | 状态 | 来源 | 处理建议 |
| --- | --- | --- | --- |
| `plugins/elementor/assets/css/conditionals/e-swiper.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/css/frontend.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/css/widget-heading.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/css/widget-icon-box.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/css/widget-image.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/css/widget-spacer.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/lib/font-awesome/css/solid.min.css` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/lib/swiper/v8/css/swiper.min.css` | 使用中 | Elementor | 保留 |
| `plugins/sydney-toolbox/css/styles.min.css` | 使用中 | Sydney 工具箱 | 保留 |
| `plugins/wxsync/libs/wxsync.css` | 使用中 | WXSync | 保留 |
| `themes/sydney/css/bootstrap/bootstrap.min.css` | 使用中 | Sydney | 保留 |
| `themes/sydney/css/components/elementor.min.css` | 使用中 | Sydney | 保留 |
| `themes/sydney/css/components/hero-slider.min.css` | 使用中 | Sydney | 保留 |
| `themes/sydney/css/styles.min.css` | 使用中 | Sydney | 保留 |
| `themes/sydney/style.css` | 使用中 | Sydney | 保留 |
| `uploads/elementor/css/post-16.css` | 使用中 | Elementor | 保留 |
| `uploads/elementor/css/post-570.css` | 使用中 | Elementor（首页） | 保留 |
| `uploads/elementor/google-fonts/css/roboto.css` | 使用中 | 字体 | 保留 |
| `uploads/elementor/google-fonts/css/robotoslab.css` | 使用中 | 字体 | 保留 |

> 说明：以上 CSS 均对应当前页面实际使用的 Elementor widget / Sydney 组件 / 字体。移除任何一项都可能造成界面错乱，
> 因此在“保持现有视觉”的 P0 目标下全部保留。后续 P1 可评估对 Elementor 定制 widget 样式做合并或仅按需加载。

## 二、JS 资源清单（加载于页面底部）

| 资源 | 状态 | 来源 | 处理建议 |
| --- | --- | --- | --- |
| `themes/sydney/js/elementor.js` | 使用中 | Sydney | 保留 |
| `plugins/sydney-toolbox/js/main.js` | 使用中 | Sydney 工具箱 | 保留 |
| `themes/sydney/js/functions.min.js` | 使用中 | Sydney | 保留 |
| `themes/sydney/js/scripts.js` | 使用中 | Sydney | 保留 |
| `themes/sydney/js/hero-slider.js` | 使用中 | Sydney（Hero） | 保留 |
| `plugins/elementor/assets/js/webpack.runtime.min.js` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/js/frontend-modules.min.js` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/js/frontend.min.js` | 使用中 | Elementor | 保留 |
| `plugins/elementor/assets/lib/swiper/v8/swiper.min.js` | 使用中 | Elementor | 保留 |
| `wp-includes/js/jquery/jquery.min.js` | 使用中 | WP | 保留 |
| `wp-includes/js/jquery/jquery-migrate.min.js` | 使用中 | WP | 保留 |
| `wp-includes/js/jquery/ui/core.min.js` | 使用中 | WP | 保留 |

> 说明：上述脚本在页面底部加载（`</body>` 前），符合“非首屏脚本下沉”原则，不阻塞首屏渲染。均已保留。

## 三、图片资源审计

- 磁盘图片文件（`public/wp-content/uploads` 下）：**3098**
- 被页面引用：**3094**（0 个缺失）
- 孤儿（未被引用）：**4 个** —— 见下表，均为人工复核后确认的**误报**，未删除。

| 资源 | 状态 | 说明 | 处理建议 |
| --- | --- | --- | --- |
| `2020/10/横向白色logo-e1602350804696-150x150.png` | 使用中（误报） | 通过 srcset 多尺寸引用 | 保留 |
| `2020/10/横向白色logo-e1602350804696-550x400.png` | 使用中（误报） | 通过 srcset 多尺寸引用 | 保留 |
| `2020/10/横向白色logo-e1602350804696.png` | 使用中（误报） | 通过 srcset 多尺寸引用 | 保留 |
| `elementor/css/post-570.css` | 使用中（误报） | 首页 Elementor 样式 | 保留 |

> 这 4 个“孤儿”是因为引用来自 `srcset` 属性与 JSON 转义（`&quot;`、尾随反斜杠），首次正则匹配未能归一化而误判；
> 修正归一化后确认它们均被实际引用，故不删除。

## 四、分类阈值统计

对整个 `public/wp-content/uploads` 资源按体积分类：

| 分档 | 数量 | 合计体积 |
| --- | --- | --- |
| ≥ 1MB（大图） | 130 | 约 330 MB |
| 1MB 内（常规） | 其余 | 约 380 MB |

大图中：
- **静态 JPEG/PNG（可安全重压缩）**：53 个，约 74 MB。
- **动态 GIF（WeChat 文章内容图，不可动动画）**：77 个，约 256 MB。

> **P0 处理：** 页面首屏/核心图（Hero、Logo、团队卡、公告图等）均较小（< 400 KB），首屏体积已可接受；
> 大体积动态 GIF 属于 230 篇已发布文章的文章正文内容，改动动画会破坏内容，**P0 不做**，列入 P1（转 WebP 动图或裁剪帧）。

## 五、审计方法与复现

审计脚本使用 Python：读取 `src/data/posts.json`、`render_blocks.json`、`livepages.json`、
`src/**/*.astro`、`public/**/*.css` 中的 `/wp-content/uploads/...` 引用，做 URL 解码、去除 JSON 转义与尾随反斜杠，
与磁盘实际文件求差集，得到“被引用缺失”与“孤儿”集合。

- 被引用但缺失：0 —— 无图片 404 风险。
- 孤儿：仅上述 4 个误报，未删除。
