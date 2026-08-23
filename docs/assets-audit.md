# 静态资源体积审计（P3-1）

> 生成日期：2026-08-23 · 仓库：`zjhncbx/zjhncbx.github.io` · 阶段：**P3-1 只审计，未删除任何文件**

## 1. 基线
| 目录 | 大小 | 文件数 |
| ---- | --: | --: |
| `public/` | 1045.6 MB | 4994 |
| `dist/` | ~1013.6 MB | 5240 |
| `.git/` pack | 670.5 MiB | — |

- **`dist/` 未纳入 Git 追踪**（`git ls-files dist` = 0，历史也从未提交 dist）→ 满足规则 §12，无需处理。
- **视频文件（mp4/webm/mov）= 0** → 规则 §7-§9 无实际内容可优化；无“视频号巨型视频”问题。
- Git 大文件均在当前工作树（含 11.6MB 的 `src/data/posts.json` 与若干 4-9MB GIF），历史无大块 dist 残留；未发现需重写历史的重复大文件（规则 §13-§14 待授权）。

## 2. 按类型统计
| 类型 | 文件数 | 总大小 |
| ---- | --: | --: |
| gif | 194 | 307.8 MB |
| webp | 1504 | 264.1 MB |
| png | 750 | 246.3 MB |
| jpg | 2167 | 211.9 MB |
| css | 195 | 4.9 MB |
| svg | 53 | 4.6 MB |
| font | 52 | 3.0 MB |
| other | 66 | 2.4 MB |
| js | 13 | 0.5 MB |
| **合计** | **4994** | **1045.6 MB** |

## 3. Top 100 大文件
1. 9.90 MB  gif  \wp-content\uploads\2021\09\wxsync-2021-09-886bcf9e3852bd58f2957e8af6c018be.gif
2. 9.77 MB  gif  \wp-content\uploads\wechat\2026\03\动态-潮人语原创吴语歌曲翻唱版本荣获-不一样的花火-年度盛典优秀歌曲奖\001.gif
3. 5.86 MB  gif  \wp-content\uploads\2021\06\wxsync-2021-06-e23318fca5f7867117fe888145aefb6a.gif
4. 5.86 MB  gif  \wp-content\uploads\2021\07\wxsync-2021-07-e23318fca5f7867117fe888145aefb6a.gif
5. 5.86 MB  gif  \wp-content\uploads\2021\09\wxsync-2021-09-5a5d07f320035d22608373080081ad74.gif
6. 5.86 MB  gif  \wp-content\uploads\2021\09\wxsync-2021-09-9954c997af7e7e45f336c2d628971221.gif
7. 5.86 MB  gif  \wp-content\uploads\2021\09\wxsync-2021-09-cc767c4a701f3dfdfdfbc507b0a35d14.gif
8. 5.86 MB  gif  \wp-content\uploads\2021\11\wxsync-2021-11-9954c997af7e7e45f336c2d628971221.gif
9. 5.86 MB  gif  \wp-content\uploads\2021\11\wxsync-2021-11-cc767c4a701f3dfdfdfbc507b0a35d14.gif
10. 5.15 MB  png  \wp-content\uploads\2022\06\wxsync-2022-06-ef5215c51513e464aae76877ed8e1a02.png
11. 4.52 MB  gif  \wp-content\uploads\2022\10\wxsync-2022-10-44c169ded293a601209e6e2c95cf5d72.gif
12. 4.21 MB  gif  \wp-content\uploads\2022\10\wxsync-2022-10-6f9366826e142300afd314476b8287ac.gif
13. 4.14 MB  gif  \wp-content\uploads\2020\12\frc-22fd705cf15b582aa38c9bab9c3eec1e.gif
14. 4.06 MB  gif  \wp-content\uploads\2022\05\wxsync-2022-05-5b0ad0a1844b5bc8349bfae062989968.gif
15. 4.06 MB  gif  \wp-content\uploads\2022\06\wxsync-2022-06-32e2af11e102ca6ef2d1599f1a41b065.gif
16. 4.06 MB  gif  \wp-content\uploads\2022\06\wxsync-2022-06-5b0ad0a1844b5bc8349bfae062989968.gif
17. 4.06 MB  gif  \wp-content\uploads\2022\07\wxsync-2022-07-32e2af11e102ca6ef2d1599f1a41b065.gif
18. 4.06 MB  gif  \wp-content\uploads\2022\07\wxsync-2022-07-5b0ad0a1844b5bc8349bfae062989968.gif
19. 4.06 MB  gif  \wp-content\uploads\2022\08\wxsync-2022-08-5b0ad0a1844b5bc8349bfae062989968.gif
20. 4.06 MB  gif  \wp-content\uploads\2022\08\wxsync-2022-08-6af0237ff41e45173677afa302e7dabd.gif
21. 4.06 MB  gif  \wp-content\uploads\2022\08\wxsync-2022-08-78d65171d5f446a14610f0764935cb1b.gif
22. 4.06 MB  gif  \wp-content\uploads\2022\10\wxsync-2022-10-c18435e9f6dca62ecf1bfa218994e85b.gif
23. 4.06 MB  gif  \wp-content\uploads\2022\10\wxsync-2022-10-e1facfad34146273ec0e7d07d6d2ea81.gif
24. 4.06 MB  gif  \wp-content\uploads\2023\02\wxsync-2023-02-c18435e9f6dca62ecf1bfa218994e85b.gif
25. 4.06 MB  gif  \wp-content\uploads\2023\02\wxsync-2023-02-e1facfad34146273ec0e7d07d6d2ea81.gif
26. 4.06 MB  gif  \wp-content\uploads\2023\02\wxsync-2023-02-ef021bedd09ca8d3b0d2ca3c74fd8a27.gif
27. 4.06 MB  gif  \wp-content\uploads\2023\07\wxsync-2023-07-ae85ce34233788352ba95ccd0c153ee6.gif
28. 4.06 MB  gif  \wp-content\uploads\2023\07\wxsync-2023-07-c18435e9f6dca62ecf1bfa218994e85b.gif
29. 4.06 MB  gif  \wp-content\uploads\2023\07\wxsync-2023-07-e1facfad34146273ec0e7d07d6d2ea81.gif
30. 4.06 MB  gif  \wp-content\uploads\2023\08\wxsync-2023-08-e1facfad34146273ec0e7d07d6d2ea81.gif
31. 4.06 MB  gif  \wp-content\uploads\2023\08\wxsync-2023-08-f477d72ffef272d31d1bbcc06efbc06f.gif
32. 4.06 MB  gif  \wp-content\uploads\2024\01\wxsync-2024-01-e1facfad34146273ec0e7d07d6d2ea81.gif
33. 4.06 MB  gif  \wp-content\uploads\2024\03\wxsync-2024-03-e1facfad34146273ec0e7d07d6d2ea81.gif
34. 4.06 MB  gif  \wp-content\uploads\2024\08\wxsync-2024-08-c18435e9f6dca62ecf1bfa218994e85b.gif
35. 4.06 MB  gif  \wp-content\uploads\2024\08\wxsync-2024-08-e1facfad34146273ec0e7d07d6d2ea81.gif
36. 4.06 MB  gif  \wp-content\uploads\2025\03\wxsync-2025-03-c18435e9f6dca62ecf1bfa218994e85b-1.gif
37. 4.06 MB  gif  \wp-content\uploads\2025\03\wxsync-2025-03-c18435e9f6dca62ecf1bfa218994e85b.gif
38. 4.06 MB  gif  \wp-content\uploads\2025\03\wxsync-2025-03-e1facfad34146273ec0e7d07d6d2ea81.gif
39. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a142701ed213.gif
40. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a142728e6942.gif
41. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a1428b203306.gif
42. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a1428b907c47.gif
43. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a1428f3d2445.gif
44. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a1429635354a.gif
45. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a142994c5560.gif
46. 4.06 MB  gif  \wp-content\uploads\2026\05\wx_img_6a1429b48337d.gif
47. 4.06 MB  gif  \wp-content\uploads\wechat\2026\05\潮声会-英语影视研习沙龙圆满落幕\001.gif
48. 3.53 MB  gif  \wp-content\uploads\2025\03\wxsync-2025-03-f73149dbcad493c93ca2705aca3b3f74-1.gif
49. 3.53 MB  gif  \wp-content\uploads\2025\03\wxsync-2025-03-f73149dbcad493c93ca2705aca3b3f74-2.gif
50. 3.53 MB  gif  \wp-content\uploads\2025\03\wxsync-2025-03-f73149dbcad493c93ca2705aca3b3f74.gif
51. 2.89 MB  gif  \wp-content\uploads\2024\08\wxsync-2024-08-349162c82b12402bd53948bb97f6fd2c.gif
52. 2.80 MB  webp  \wp-content\uploads\2020\12\frc-22fd705cf15b582aa38c9bab9c3eec1e.webp
53. 2.63 MB  gif  \wp-content\uploads\2021\05\wxsync-2021-05-f693976ce991deb1c47a995420afc100.gif
54. 2.53 MB  png  \wp-content\uploads\2020\12\frc-20e1a9ff44f46cf14928696e4c0a885a.png
55. 2.53 MB  gif  \wp-content\uploads\2020\12\frc-4e9ea3eb652512beb05c7af2b07085cb.gif
56. 2.53 MB  gif  \wp-content\uploads\2021\05\21620459622.gif
57. 2.53 MB  gif  \wp-content\uploads\2021\05\frc-4e9ea3eb652512beb05c7af2b07085cb.gif
58. 2.53 MB  png  \wp-content\uploads\2022\10\wxsync-2022-10-e06a6aba7917fd9ce221baa0036ea7f1.png
59. 2.52 MB  webp  \wp-content\uploads\2022\05\wxsync-2022-05-5b0ad0a1844b5bc8349bfae062989968.webp
60. 2.52 MB  webp  \wp-content\uploads\2022\06\wxsync-2022-06-32e2af11e102ca6ef2d1599f1a41b065.webp
61. 2.52 MB  webp  \wp-content\uploads\2022\06\wxsync-2022-06-5b0ad0a1844b5bc8349bfae062989968.webp
62. 2.52 MB  webp  \wp-content\uploads\2022\07\wxsync-2022-07-32e2af11e102ca6ef2d1599f1a41b065.webp
63. 2.52 MB  webp  \wp-content\uploads\2022\07\wxsync-2022-07-5b0ad0a1844b5bc8349bfae062989968.webp
64. 2.52 MB  webp  \wp-content\uploads\2022\08\wxsync-2022-08-5b0ad0a1844b5bc8349bfae062989968.webp
65. 2.52 MB  webp  \wp-content\uploads\2022\08\wxsync-2022-08-6af0237ff41e45173677afa302e7dabd.webp
66. 2.52 MB  webp  \wp-content\uploads\2022\08\wxsync-2022-08-78d65171d5f446a14610f0764935cb1b.webp
67. 2.52 MB  webp  \wp-content\uploads\2022\10\wxsync-2022-10-c18435e9f6dca62ecf1bfa218994e85b.webp
68. 2.52 MB  webp  \wp-content\uploads\2022\10\wxsync-2022-10-e1facfad34146273ec0e7d07d6d2ea81.webp
69. 2.52 MB  webp  \wp-content\uploads\2023\02\wxsync-2023-02-c18435e9f6dca62ecf1bfa218994e85b.webp
70. 2.52 MB  webp  \wp-content\uploads\2023\02\wxsync-2023-02-e1facfad34146273ec0e7d07d6d2ea81.webp
71. 2.52 MB  webp  \wp-content\uploads\2023\02\wxsync-2023-02-ef021bedd09ca8d3b0d2ca3c74fd8a27.webp
72. 2.52 MB  webp  \wp-content\uploads\2023\07\wxsync-2023-07-ae85ce34233788352ba95ccd0c153ee6.webp
73. 2.52 MB  webp  \wp-content\uploads\2023\07\wxsync-2023-07-c18435e9f6dca62ecf1bfa218994e85b.webp
74. 2.52 MB  webp  \wp-content\uploads\2023\07\wxsync-2023-07-e1facfad34146273ec0e7d07d6d2ea81.webp
75. 2.52 MB  webp  \wp-content\uploads\2023\08\wxsync-2023-08-e1facfad34146273ec0e7d07d6d2ea81.webp
76. 2.52 MB  webp  \wp-content\uploads\2023\08\wxsync-2023-08-f477d72ffef272d31d1bbcc06efbc06f.webp
77. 2.52 MB  webp  \wp-content\uploads\2024\01\wxsync-2024-01-e1facfad34146273ec0e7d07d6d2ea81.webp
78. 2.52 MB  webp  \wp-content\uploads\2024\03\wxsync-2024-03-e1facfad34146273ec0e7d07d6d2ea81.webp
79. 2.52 MB  webp  \wp-content\uploads\2024\08\wxsync-2024-08-c18435e9f6dca62ecf1bfa218994e85b.webp
80. 2.52 MB  webp  \wp-content\uploads\2024\08\wxsync-2024-08-e1facfad34146273ec0e7d07d6d2ea81.webp
81. 2.52 MB  webp  \wp-content\uploads\2025\03\wxsync-2025-03-c18435e9f6dca62ecf1bfa218994e85b-1.webp
82. 2.52 MB  webp  \wp-content\uploads\2025\03\wxsync-2025-03-c18435e9f6dca62ecf1bfa218994e85b.webp
83. 2.52 MB  webp  \wp-content\uploads\2025\03\wxsync-2025-03-e1facfad34146273ec0e7d07d6d2ea81.webp
84. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a142701ed213.webp
85. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a142728e6942.webp
86. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a1428b203306.webp
87. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a1428b907c47.webp
88. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a1428f3d2445.webp
89. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a1429635354a.webp
90. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a142994c5560.webp
91. 2.52 MB  webp  \wp-content\uploads\2026\05\wx_img_6a1429b48337d.webp
92. 2.52 MB  webp  \wp-content\uploads\wechat\2026\05\潮声会-英语影视研习沙龙圆满落幕\001.webp
93. 2.43 MB  webp  \wp-content\uploads\2021\09\wxsync-2021-09-886bcf9e3852bd58f2957e8af6c018be.webp
94. 2.38 MB  gif  \wp-content\uploads\2020\12\frc-d119d7fe098b2a02373164e03e6d93d6.gif
95. 2.38 MB  gif  \wp-content\uploads\2022\03\wxsync-2022-03-c7a7031007e89e691b17545353c6cc8c.gif
96. 2.36 MB  gif  \wp-content\uploads\2020\12\frc-4ac52e928bfe2f187c8a466824e70c9a.gif
97. 2.26 MB  gif  \wp-content\uploads\2020\12\frc-d6d0505e13fdb8910bfd6966fb01d388.gif
98. 2.23 MB  gif  \wp-content\uploads\2022\05\wxsync-2022-05-110174a8daab19aca97a26929722a807.gif
99. 2.23 MB  gif  \wp-content\uploads\2022\06\wxsync-2022-06-110174a8daab19aca97a26929722a807.gif
100. 2.13 MB  gif  \wp-content\uploads\2023\07\wxsync-2023-07-85cb2a378f8490f8fcb60b9cd92a6834.gif

## 4. 重复资源（SHA-256，跨目录）
共 **216 组**，若每组保留一份并统一引用，可释放 **335.0 MB**。
（注意：这些重复副本目前**均被不同文章引用**，去重需改写引用路径，会改变现有 URL——见 §结论。）

## 5. 原图 + WebP 双份
探测到 **125 组** 同目录同名的 `gif ↔ webp` 对（GIF 原图合计 NaN MB，WebP 合计 NaN MB）。
这是“原图 + WebP 双份存储”体积膨胀的主要来源。

## 6. 无引用资源（孤儿）
**167 个 / 3.5 MB**（排除“被引用的原图”及其 WebP 孪生后）。
以 `-480.webp` 列表缩略图、elementor google 字体、个别 logo/bg 为主，收益有限（~3.5MB）。

## 结论（P3-1）
- 主要体积来源：**GIF（307.8 MB）+ WebP（264.1 MB）+ PNG（246.3 MB）+ JPG（211.9 MB）**。
- 视频不是问题；孤儿资源少；dist 未入库。
- **要显著降低体积，必须在“原图归档/与站点资源分离”上做取舍**（规则 §5-§6），这会触及“不改变现有 URL / 保留原图”的约束，且去重/分离多需改写引用。**本阶段建议先获授权再进入 P3-2/3-3 清理。**
