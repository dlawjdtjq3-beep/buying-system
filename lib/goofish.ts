/**
 * 闲鱼(goofish) → 새 구매 등록 자동 채우기
 *
 * 흐름: 직원이 闲鱼 상품 페이지에서 즐겨찾기 버튼을 누름
 *   → 버튼이 그 페이지의 제목·가격·대표사진을 읽어서
 *   → 구매관리 사이트를 «#add=…» 를 붙여 새 탭으로 엶
 *   → 사이트가 그걸 읽어 등록 폼을 채움 (저장은 직원이 확인 후 «등록하기»)
 *
 * 버튼(북마클릿)은 «날것»만 보내고, 브랜드·카테고리 판단은 여기서 합니다.
 * → 규칙을 고쳐도 직원이 버튼을 다시 설치할 필요 없음.
 */

export interface GoofishRaw {
  u: string;   // 상품 URL
  t: string;   // 제목(설명 첫 줄)
  p: string;   // 가격 글자 (예: "¥2000包邮", "¥1.36万")
  i: string;   // 대표 사진 URL
}

export interface GoofishPrefill {
  productUrl: string;
  productName: string;
  amount: number;
  category: '가방' | '악세사리' | '의류' | '신발' | '시계' | '기타';
  imageUrl: string;
  title: string;
}

/** 즐겨찾기 버튼 코드 — target 은 이 버튼을 설치한 구매관리 사이트 주소 */
export function bookmarkletCode(target: string): string {
  const src = `(function(){
if(!/goofish\\.com|xianyu/.test(location.host)){alert('闲鱼 상품 페이지에서 눌러주세요');return;}
var info=document.querySelector('[class*="item-main-info--"]')||document;
var pe=info.querySelector('[class^="price--"],[class*=" price--"]');
var p=pe?(pe.parentElement||pe).innerText:'';
var im=document.querySelector('[class*="item-main-window-list-item--"] img')||document.querySelector('[class*="item-main-window"] img');
var id=(location.search.match(/[?&]id=(\\d+)/)||[])[1];
var d={u:id?'https://www.goofish.com/item?id='+id:location.href,t:document.title.replace(/_闲鱼\\s*$/,''),p:p,i:im?im.src:''};
var s=btoa(unescape(encodeURIComponent(JSON.stringify(d))));
window.open('${target}#add='+encodeURIComponent(s),'_blank');
})();`;
  return 'javascript:' + src.replace(/\n/g, '');
}

/** 주소창의 #add=… 를 읽어 지웁니다 */
export function takeGoofishFromHash(): GoofishRaw | null {
  try {
    const m = window.location.hash.match(/^#add=(.+)$/);
    if (!m) return null;
    const json = decodeURIComponent(escape(atob(decodeURIComponent(m[1]))));
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return JSON.parse(json) as GoofishRaw;
  } catch {
    return null;
  }
}

const BRANDS: [string, RegExp][] = [
  ['Chanel', /chanel|香奈儿|小香/i],
  ['Louis Vuitton', /louis\s*vuitton|\blv\b|路易威登|驴牌/i],
  ['Hermes', /herm[eè]s|爱马仕/i],
  ['Gucci', /gucci|古驰/i],
  ['Prada', /prada|普拉达/i],
  ['Miu Miu', /miu\s*miu|缪缪/i],
  ['Dior', /dior|迪奥/i],
  ['Celine', /c[eé]line|赛琳|思琳/i],
  ['Saint Laurent', /saint\s*laurent|\bysl\b|圣罗兰/i],
  ['Bottega Veneta', /bottega|\bbv\b|葆蝶家/i],
  ['Fendi', /fendi|芬迪/i],
  ['Balenciaga', /balenciaga|巴黎世家/i],
  ['Loewe', /loewe|罗意威/i],
  ['Goyard', /goyard|戈雅/i],
  ['Rolex', /rolex|劳力士/i],
  ['Cartier', /cartier|卡地亚/i],
  ['Van Cleef & Arpels', /van\s*cleef|梵克雅宝|\bvca\b/i],
  ['Bvlgari', /bvlgari|bulgari|宝格丽/i],
  ['Tiffany', /tiffany|蒂芙尼/i],
  ['Omega', /omega|欧米茄/i],
  ['Burberry', /burberry|博柏利|巴宝莉/i],
  ['Moncler', /moncler|蒙口|盟可睐/i],
  ['Valentino', /valentino|华伦天奴/i],
  ['Givenchy', /givenchy|纪梵希/i],
  ['Thom Browne', /thom\s*browne|汤姆布朗/i],
  ['Ferragamo', /ferragamo|菲拉格慕/i],
  ['Chrome Hearts', /chrome\s*hearts|克罗心/i],
  ['Maison Margiela', /margiela|马吉拉/i],
];

const CATEGORY_RULES: [GoofishPrefill['category'], RegExp][] = [
  ['시계', /手表|腕表|表盘|机械表|watch/i],
  ['신발', /鞋|靴|sneaker|loafer/i],
  ['가방', /包|手袋|钱包|卡包|bag|tote/i],
  ['의류', /衣|服|裤|裙|外套|羽绒|卫衣|衬衫|毛衣|夹克|大衣|西装|T恤|针织/i],
  ['악세사리', /项链|手链|手镯|戒指|耳环|耳钉|胸针|围巾|丝巾|腰带|皮带|眼镜|发夹|发箍/i],
];

/** 가격 글자 → 위안 숫자 ("¥1.36万" → 13600) */
export function parseYuan(text: string): number {
  const t = (text || '').replace(/\s+/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)(万)?/);
  if (!m) return 0;
  const n = parseFloat(m[1]) * (m[2] ? 10000 : 1);
  return Math.round(n * 100) / 100;
}

/** 썸네일 주소에서 크기 꼬리를 떼어 원본 사진 주소로 */
export function originalImage(src: string): string {
  return (src || '').replace(/(\.(?:jpe?g|png|webp))_\d+x\d+.*$/i, '$1');
}

export function toPrefill(raw: GoofishRaw): GoofishPrefill {
  const title = (raw.t || '').trim();
  const brand = BRANDS.find(([, re]) => re.test(title))?.[0];
  // «包邮(무료배송)·包装(포장)» 의 包 가 가방으로 잡히지 않게 먼저 지움
  const forCategory = title.replace(/包邮|包装|全包|包退|包真/g, '');
  const category = CATEGORY_RULES.find(([, re]) => re.test(forCategory))?.[0] ?? '기타';
  return {
    productUrl: raw.u,
    productName: brand ?? title.slice(0, 40),
    amount: parseYuan(raw.p),
    category,
    imageUrl: originalImage(raw.i),
    title,
  };
}
