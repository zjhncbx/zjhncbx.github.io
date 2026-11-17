/**
 * 组织实体配置（P0.5 SEO 实体身份增强）。
 *
 * 说明：
 * - sameAs 仅收录**能够验证实体身份的真实 URL**（官方网站、百度百科）。
 * - 微信公众号 / 抖音 / 视频号目前无稳定可访问的公开 URL，因此**不放入 sameAs**，
 *   仅作为 officialAccounts（官方账号名称）保留，作为组织资料。
 * - 仅使用源码已有 / 用户明确提供 / 可靠验证的信息，禁止猜测地址、电话、成立日期等。
 */
export const organization = {
  name: '海宁市潮百相公益发展协会',
  alternateName: '潮百相公益',
  url: 'https://www.hncbx.org.cn',
  logo: 'https://www.hncbx.org.cn/wp-content/uploads/2020/10/加字圆形logo.jpg',

  // 能够验证实体身份的 URL
  sameAs: [
    'https://www.hncbx.org.cn',
    'https://baike.baidu.com/item/海宁市潮百相公益发展协会',
  ],

  officialAccounts: {
    // 已停用：「紫微城记」「青宁志联」公众号已注销（2026-11 确认），故不再列出。
    wechat: ['潮百相公益', '潮人语', '安澜交通'],
    douyin: ['潮百相公益', '潮人语'],
    channels: ['潮百相公益', '潮人语'],
  },
};

export type Organization = typeof organization;
