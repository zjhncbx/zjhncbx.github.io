# 微信公众号历史文章完整迁移（2026-08）

> 任务：将指定微信公众号历史文章**完整、准确**迁移到官网，保留实际发布日期、正文、图片、视频、视频号入口。
> 仓库：`zjhncbx/zjhncbx.github.io`（GitHub Pages）· 技术栈：Astro 7 · 迁移执行日期：2026-08-23

## 1. 结论

**10 / 10 篇全部迁移成功**，实际发布日期 100% 使用微信端 `createTime`，正文完整，微信图片 100% 本地化
（`mmbiz.qpic.cn / mmbiz.qlogo.cn` 外链 = 0），普通视频与视频号均按规则识别并降级保留入口。

> ⚠️ 说明：任务书正文给出 **10 个链接**（01–10），验收表与清单表写作「11」，经与用户确认**按 10 篇验收**。
> 任务书注明第 07、08 篇（同一 `mid=2247548890` 的 `idx=2` 与 `idx=1`）为两篇独立文章，已分别迁移为
> `/blog/10007/` 与 `/blog/10008/`。

## 2. 迁移清单

| #  | 标题 | 实际日期 | 图片 | 视频 | 视频号 | 官网地址 | 状态 |
| -- | ---- | -------- | --: | --: | ---: | ------- | ---- |
| 01 | 动态 \| 潮人语原创吴语歌曲翻唱版本荣获 “不一样的花火” 年度盛典优秀歌曲奖 | 2026-03-31 | 19 | 0 | 0 | `/blog/10001/` | ✅ |
| 02 | 纪实 \| 让海宁吴语，再报一站：写在杭海城际开通五周年 | 2026-06-28 | 13 | 2 | 0 | `/blog/10002/` | ✅ |
| 03 | 主题分享 \| 资源采集组①潮人语的资源采集实践 | 2026-07-06 | 22 | 0 | 0 | `/blog/10003/` | ✅ |
| 04 | 主题分享 \| 工具研发组①潮人语的工具研发实践 | 2026-07-24 | 24 | 0 | 0 | `/blog/10004/` | ✅ |
| 05 | 主题分享 \| 工具研发组②辞典工具调研 | 2026-08-22 | 27 | 0 | 0 | `/blog/10005/` | ✅ |
| 06 | 潮声会 ｜ 英语影视研习沙龙圆满落幕 | 2026-05-25 | 16 | 0 | 0 | `/blog/10006/` | ✅ |
| 07 | 原创歌曲MV \| 十二月令 (吴语·永嘉&海宁方言) | 2026-07-18 | 12 | 0 | 0 | `/blog/10007/` | ✅ |
| 08 | 共富青春 \| 潮百相暑期科普课堂获海宁传媒报道 | 2026-07-18 | 9 | 0 | 0 | `/blog/10008/` | ✅ |
| 09 | 社会 \| 来听听杭州吴语版《米业小学放学歌》——孤儿的方言教育更应重视 | 2026-07-26 | 16 | 0 | 0 | `/blog/10009/` | ✅ |
| 10 | 活动 \| 鼻塞流涕别硬扛！潮百相联合南医大学子，带来权威科普干货 | 2026-08-12 | 13 | 0 | 0 | `/blog/10010/` | ✅ |

> 图片数 = 正文渲染的 `<img>` 总数（含视频/音频卡片封面）；视频数 = 腾讯视频 iframe + 微信 mpvideo 卡片。
> 原始链接均以 `sourceUrl` 字段保存在 `src/data/posts.json`（`sourcePlatform: 'wechat'`），用于去重与溯源。

| #  | 微信公众号 | sourceUrl（完整原始链接已存于 posts.json） |
| -- | ---------- | ------------------------------------------ |
| 01 | 潮人语 | `https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507366&idx=1&sn=306fa9f3531a021b297d5320daf02c14` |
| 02 | 潮人语 | `https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507494&idx=1&sn=79e5bc4ab9d3f2d92be0413046f70ad9` |
| 03 | 潮人语 | `https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507530&idx=1&sn=6b773a2c551905e86a3536e44c118e22` |
| 04 | 潮人语 | `https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507598&idx=1&sn=85942d42c8d336b0a4db6babc77a1b39` |
| 05 | 潮人语 | `https://mp.weixin.qq.com/s?__biz=MzI0OTU3NDU1Ng==&mid=2247507633&idx=1&sn=27308d95e7d9f1b4e1cac858e2d1b9ef` |
| 06 | 潮百相公益 | `https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548652&idx=1&sn=c27d9e6fcf0b30a16ea3fa51cdbbde2d` |
| 07 | 潮百相公益 | `https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548890&idx=2&sn=fd85d306aa391e90f19241a4ccdce767` |
| 08 | 潮百相公益 | `https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548890&idx=1&sn=815099acabdb6778f6521dc6d1d59d7d` |
| 09 | 潮百相公益 | `https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548927&idx=2&sn=6835d26561871b777887d56602c0345e` |
| 10 | 潮百相公益 | `https://mp.weixin.qq.com/s?__biz=Mzk4ODEzMTE0Mg==&mid=2247548982&idx=1&sn=6ad250a149bb8bcf2e0e078677170006` |

## 3. 各媒体处理结果

### 图片（100% 本地化 + WebP）
- 全部正文图片（含 `data-src` 与 `src` 两态、`background-image`、视频/音频封面）从 `mmbiz.qpic.cn / mmbiz.qlogo.cn / wx.y.gtimg.cn`
  下载到 `public/wp-content/uploads/wechat/YYYY/MM/<slug>/NNN.{jpg,png,gif}`。
- 按现有 P1 机制为每张剪贴图生成 `.webp` 孪生；GIF 保留原 GIF 并生成动画 WebP；缩略图另生成 `-480.webp`。
- 相同资源跨文章按 URL 去重（同一 URL 只落一份）。**0 张缺失、0 张外部引用**。

### 普通视频 / 腾讯视频
| 文章 | 媒体 | 处理 |
| -- | ---- | ---- |
| 02 | 腾讯视频 iframe（`v.qq.com/txp/iframe/player.html?vid=c0753q2q6u4`） | 保留为**合法响应式 16:9 iframe 嵌入** |
| 02 | 微信 mpvideo（`mp.weixin.qq.com/mp/readtemplate?action=mpvideo&vid=wxv_1502072301972946945`） | **受保护视频流，未破解下载**；改为「封面 + 信息 + 原始入口」卡片，封面本地化，入口指向原文 |

### 视频号
- **本批 10 篇均无视频号（`videoChannelCount = 0`）**。已确认微信端无 `finder / wxv_/mp-common-finder` 视频号内容，
  不做虚构，前后数量一致（0 → 0）。

### 音频（QQ 音乐 clmusic）
- 文章 01（2 个）、09（1 个）：`<mp-common-clmusic>`（QQ 音乐）转为**音频卡片**（封面本地化 + 歌名 + 歌手 + 入口链接）。

### 微信组件清理
- 移除/改写：微信分享组件、统计 JS、微信平台导航、自动推荐/相关阅读外链元数据（`imgurl`）、
  小程序入口（`mp-miniprogram`/`mp-common-profile` 及 `data-miniprogram-*`）、`data-style` 暗色重复样式。
- 保留：标题、正文段落、列表、引用、图片（含说明）、视频/音频卡片入口、原文链接（`sourceUrl`）。

## 4. 日期策略
- 官网发布日期一律使用微信公众号**实际发布日期**（`createTime`），全部 10 篇已确认，无 `DATE_UNVERIFIED`。
- 首页「近期资讯」按实际发布日期降序自动取最新 10 篇；sitemap 的 `lastmod` 取文章 `modified/date`。
- 未修改任何既有文章日期。

## 5. 核验结果
| 核验项 | 结果 |
| ---- | ---- |
| 迁移文章 | **10/10** |
| `npm run check` | ✅ 0 errors / 0 warnings |
| `npm run build` | ✅ 245 pages（含 10 篇新文章，235→245） |
| sitemap 含 10 篇新文章 | ✅ |
| 首页「近期资讯」按实际日期排序 | ✅（10005 → 10001 降序） |
| `mmbiz.qpic.cn / mmbiz.qlogo.cn` 外链（src + public） | ✅ 0（10 篇微信正文 0 条） |
| 正文 `<img>` 引用本地文件 | ✅ 0 缺失 |
| og:image | ✅ 每篇生成（优先用缩略图） |
| 视频数量前后一致 | ✅（02 为 2，其余 0；腾讯视频嵌入 + 受保护 mpvideo 降级卡片） |
| 视频号数量前后一致 | ✅ 0 → 0 |

## 6. 视频/视频号处理原则（本批无破解、无绕过鉴权）
公众号文章 06 之前均为普通图/音文；文章 02 含 1 个腾讯视频与 1 个受保护微信 mpvideo。按任务规则：
- 腾讯视频 → 合法 iframe 嵌入；
- 微信 mpvideo → **下载被禁止/失败**，采用「封面 + 视频号信息 + 原始入口」降级方案（未伪造播放器）；
- 本轮无视频号，未删除、未虚构任何视频号内容。

## 7. 复用组件 / 脚本
- `scripts/import-wechat-articles.mjs`：`--all / --article N / --resume / --dry-run`，支持断点，已下载资源不重复下载。
- `src/components/VideoEmbed.astro`：统一媒体组件（`wechat_channels / wechat_video / html5 / tencent / external`）。
- 卡片样式：`src/layouts/BaseLayout.astro`（`.wechat-video-card / .wechat-audio-card / .wechat-video-frame`，响应式、无横滚）。
