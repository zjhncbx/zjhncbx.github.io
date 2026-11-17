// Copy for the live-captured static pages (batch ③: contact/services/team were
// three near-identical page files). `src/pages/[page].astro` renders a
// `livepages.json` body for each key of this map.
//
// Must live outside the .astro frontmatter: getStaticPaths only sees module
// scope, not component-local consts.
export interface StaticPageCopy {
  title: string;
  description: string;
}

export const STATIC_PAGES: Record<string, StaticPageCopy> = {
  team: {
    title: '团队介绍 | 潮百相公益——兴趣公益与社会创新的领导者',
    description: '海宁市潮百相公益发展协会团队介绍：会员大会、理事会、秘书处，下设综合项目部、潮人语项目部、安澜项目部。',
  },
  services: {
    title: '服务项目 | 潮百相公益——兴趣公益与社会创新的领导者',
    description: '海宁市潮百相公益发展协会服务项目：志愿服务、青年团建、语言文化保护、公共交通与公益宣传等。',
  },
  contact: {
    title: '联系我们 | 潮百相公益——兴趣公益与社会创新的领导者',
    description: '海宁市潮百相公益发展协会联系方式：地址、电话、邮箱与交流群（QQ群：729370843）。',
  },
};
