export type Faction = "위" | "촉" | "오" | "기타";
export type BattlefieldTheme =
  | "평지"
  | "산지"
  | "바다"
  | "습지"
  | "정글"
  | "사막";
export type Role =
  | "군주"
  | "용장"
  | "수호"
  | "책사"
  | "궁수"
  | "기병"
  | "암살"
  | "지원";
export type Cost = 1 | 2 | 3 | 4 | 5;

export type HeroPassive = {
  name: string;
  description: string;
  kind: "전투" | "지형" | "경제";
  value: number;
  trigger?:
    | "streak-win"
    | "sea-win"
    | "interest"
    | "loss-shield"
    | "terrain";
};

export type Hero = {
  id: string;
  name: string;
  hanja: string;
  faction: Faction;
  cost: Cost;
  role: Role;
  bonds: string[];
  skill: string;
  /** 기본 공격 사거리(칸). 근접 1 · 원거리 3 · 장거리 특성 5 */
  range: number;
  affinity: BattlefieldTheme[];
  passive: HeroPassive;
  portraitIndex: number;
  attack: number;
  defense: number;
  health: number;
};

export type BattlefieldRule = {
  id: BattlefieldTheme;
  slug: string;
  hanja: string;
  subtitle: string;
  description: string;
  favoredRoles: Role[];
  favoredFaction?: Faction;
  penalizedRoles: Role[];
  roleBonus: number;
  factionBonus: number;
  affinityBonus: number;
  penalty: number;
  asset: string;
  accent: string;
  ruleText: string[];
};

export const BATTLEFIELD_THEMES: BattlefieldRule[] = [
  {
    id: "평지",
    slug: "plain",
    hanja: "原",
    subtitle: "넓은 시야와 기동전",
    description: "장애물이 적어 기병의 돌파와 군주의 지휘가 강해집니다.",
    favoredRoles: ["기병", "군주"],
    penalizedRoles: [],
    roleBonus: 0.14,
    factionBonus: 0,
    affinityBonus: 0.1,
    penalty: 0,
    asset: "/battlefields/plain-diorama.webp",
    accent: "#a8894e",
    ruleText: ["기병·군주 전투력 +14%", "평지 친화 장수 +10%"],
  },
  {
    id: "산지",
    slug: "mountain",
    hanja: "山",
    subtitle: "고지와 좁은 협곡",
    description: "궁수와 수호가 고지를 장악하고 기병의 돌진은 둔화됩니다.",
    favoredRoles: ["궁수", "수호"],
    penalizedRoles: ["기병"],
    roleBonus: 0.16,
    factionBonus: 0,
    affinityBonus: 0.1,
    penalty: 0.1,
    asset: "/battlefields/mountain-diorama.webp",
    accent: "#87949a",
    ruleText: ["궁수·수호 전투력 +16%", "기병 전투력 -10%", "고지·협로만 통행"],
  },
  {
    id: "바다",
    slug: "sea",
    hanja: "海",
    subtitle: "파도와 함선의 전장",
    description: "수전에 익숙한 오나라와 책사·지원 장수가 힘을 얻습니다.",
    favoredRoles: ["책사", "지원"],
    favoredFaction: "오",
    penalizedRoles: ["기병"],
    roleBonus: 0.08,
    factionBonus: 0.14,
    affinityBonus: 0.1,
    penalty: 0.08,
    asset: "/battlefields/sea-diorama.webp",
    accent: "#5c8991",
    ruleText: ["오 장수 +14%, 책사·지원 +8%", "기병 전투력 -8%"],
  },
  {
    id: "습지",
    slug: "swamp",
    hanja: "澤",
    subtitle: "안개와 진흙 수로",
    description: "책사와 암살 장수가 시야를 이용하고 기병은 기동력을 잃습니다.",
    favoredRoles: ["책사", "암살"],
    penalizedRoles: ["기병"],
    roleBonus: 0.12,
    factionBonus: 0,
    affinityBonus: 0.1,
    penalty: 0.12,
    asset: "/battlefields/swamp-diorama.webp",
    accent: "#667f66",
    ruleText: ["책사·암살 전투력 +12%", "기병 전투력 -12%"],
  },
  {
    id: "정글",
    slug: "jungle",
    hanja: "林",
    subtitle: "매복과 독초의 숲",
    description: "암살자와 궁수가 숲에 숨어 첫 공격의 우위를 점합니다.",
    favoredRoles: ["암살", "궁수"],
    penalizedRoles: ["수호"],
    roleBonus: 0.16,
    factionBonus: 0,
    affinityBonus: 0.1,
    penalty: 0.06,
    asset: "/battlefields/jungle-diorama.webp",
    accent: "#5f825b",
    ruleText: ["암살·궁수 전투력 +16%", "수호 전투력 -6%"],
  },
  {
    id: "사막",
    slug: "desert",
    hanja: "沙",
    subtitle: "열기와 모래바람",
    description: "강인한 용장과 기병이 유리하지만 지원 효과는 약해집니다.",
    favoredRoles: ["용장", "기병"],
    penalizedRoles: ["지원"],
    roleBonus: 0.15,
    factionBonus: 0,
    affinityBonus: 0.1,
    penalty: 0.08,
    asset: "/battlefields/desert-diorama.webp",
    accent: "#bd884c",
    ruleText: ["용장·기병 전투력 +15%", "지원 전투력 -8%"],
  },
];

export const BATTLEFIELD_BY_ID = Object.fromEntries(
  BATTLEFIELD_THEMES.map((theme) => [theme.id, theme]),
) as Record<BattlefieldTheme, BattlefieldRule>;

/**
 * 성급 능력치 배율 — 공격력·체력 공용 단일 기준.
 * 3장 합성으로 한 성급이 오르며, 성급당 약 1.9배씩 성장한다.
 * (1성 → 2성 1.9배, 2성 → 3성 약 1.79배)
 */
export const STAR_MULTIPLIER = {
  1: 1,
  2: 1.9,
  3: 3.4,
} as const;

/**
 * 방어력은 성장 곡선을 완만하게 두어 고성급이 무적이 되지 않게 한다.
 */
export const STAR_DEFENSE_MULTIPLIER = {
  1: 1,
  2: 1.45,
  3: 2,
} as const;

export const PASSIVE_STAR_SCALE = {
  1: 1,
  2: 1.5,
  3: 2.2,
} as const;

export const COST_BUDGETS: Record<
  Cost,
  { copies: number; passiveBudget: number; design: string }
> = {
  1: { copies: 29, passiveBudget: 6, design: "단순한 단일 조건 패시브" },
  2: { copies: 22, passiveBudget: 8, design: "지형 또는 병과 조건 패시브" },
  3: { copies: 18, passiveBudget: 11, design: "조합의 핵심 연결 패시브" },
  4: { copies: 12, passiveBudget: 14, design: "강한 전투·경제 조건 패시브" },
  5: { copies: 10, passiveBudget: 18, design: "규칙을 바꾸는 고유 패시브" },
};

type HeroRow = [
  id: string,
  name: string,
  hanja: string,
  faction: Faction,
  cost: Cost,
  role: Role,
  bonds: string[],
  skill: string,
];

const rows: HeroRow[] = [
  ["cao-cao", "조조", "曹操", "위", 5, "군주", ["간웅", "왕좌지재"], "천하포무"],
  ["liu-bei", "유비", "劉備", "촉", 4, "군주", ["도원결의", "한실부흥"], "인의의 깃발"],
  ["sun-quan", "손권", "孫權", "오", 4, "군주", ["손씨일가", "강동사걸"], "벽안의 군령"],
  ["lu-bu", "여포", "呂布", "기타", 5, "용장", ["비장연가", "난세무쌍"], "천하무쌍"],
  ["guan-yu", "관우", "關羽", "촉", 4, "용장", ["도원결의", "오호대장군", "관씨일문"], "청룡언월"],
  ["zhang-fei", "장비", "張飛", "촉", 3, "수호", ["도원결의", "오호대장군"], "장판교의 포효"],
  ["zhuge-liang", "제갈량", "諸葛亮", "촉", 5, "책사", ["와룡봉추", "한실부흥"], "동남풍"],
  ["zhou-yu", "주유", "周瑜", "오", 4, "책사", ["강동쌍벽", "강동사걸"], "적벽화공"],
  ["sima-yi", "사마의", "司馬懿", "위", 5, "책사", ["간웅", "책략가"], "심연의 반계"],
  ["zhao-yun", "조운", "趙雲", "촉", 4, "기병", ["오호대장군", "한실부흥"], "칠진칠출"],
  ["ma-chao", "마초", "馬超", "촉", 4, "기병", ["오호대장군", "서량기병"], "철기돌파"],
  ["huang-zhong", "황충", "黃忠", "촉", 3, "궁수", ["오호대장군", "노익장"], "백보천양"],
  ["zhang-liao", "장료", "張遼", "위", 4, "기병", ["오자양장", "합비의 위명"], "요동강습"],
  ["guo-jia", "곽가", "郭嘉", "위", 3, "책사", ["왕좌지재", "책략가"], "귀모"],
  ["sun-ce", "손책", "孫策", "오", 4, "용장", ["강동쌍벽", "손씨일가"], "소패왕"],
  ["da-qiao", "대교", "大喬", "오", 3, "지원", ["이교", "강동의 꽃"], "유수의 가호"],
  ["diao-chan", "초선", "貂蟬", "기타", 4, "암살", ["비장연가", "연환계"], "폐월"],
  ["yuan-shao", "원소", "袁紹", "기타", 5, "군주", ["사세삼공", "하북쌍웅"], "명문의 대군"],
  ["dong-zhuo", "동탁", "董卓", "기타", 4, "수호", ["서량군벌", "폭군"], "주지육림"],
  ["gan-ning", "감녕", "甘寧", "오", 3, "암살", ["강동맹장", "금범적"], "금범기습"],

  ["xiahou-dun", "하후돈", "夏侯惇", "위", 3, "수호", ["하후일문", "조위중신"], "강인한 외눈"],
  ["xiahou-yuan", "하후연", "夏侯淵", "위", 2, "궁수", ["하후일문", "조위중신"], "신속강습"],
  ["cao-ren", "조인", "曹仁", "위", 2, "수호", ["조씨일문", "조위중신"], "철벽진"],
  ["cao-pi", "조비", "曹丕", "위", 3, "군주", ["조씨일문", "문무겸비"], "위왕의 칙령"],
  ["zhang-he", "장합", "張郃", "위", 2, "용장", ["오자양장", "하북출신"], "변환진"],
  ["xu-huang", "서황", "徐晃", "위", 2, "용장", ["오자양장", "조위중신"], "장구직입"],
  ["yue-jin", "악진", "樂進", "위", 1, "용장", ["오자양장", "선봉장"], "선등"],
  ["yu-jin", "우금", "于禁", "위", 1, "수호", ["오자양장", "조위중신"], "군법엄정"],
  ["dian-wei", "전위", "典韋", "위", 3, "수호", ["호위쌍벽", "악래"], "목숨 건 호위"],
  ["xu-chu", "허저", "許褚", "위", 3, "수호", ["호위쌍벽", "호치"], "나후의 괴력"],
  ["xun-yu", "순욱", "荀彧", "위", 4, "지원", ["왕좌지재", "책략가"], "왕좌의 재능"],
  ["xun-you", "순유", "荀攸", "위", 2, "책사", ["왕좌지재", "책략가"], "십이기책"],
  ["jia-xu", "가후", "賈詡", "위", 4, "책사", ["책략가", "서량출신"], "독사의 계략"],
  ["cheng-yu", "정욱", "程昱", "위", 2, "책사", ["왕좌지재", "조위중신"], "십면매복"],
  ["cao-zhen", "조진", "曹真", "위", 1, "기병", ["조씨일문", "조위중신"], "대장군의 진격"],
  ["cao-hong", "조홍", "曹洪", "위", 1, "기병", ["조씨일문", "호위"], "헌마구주"],
  ["pang-de", "방덕", "龐德", "위", 3, "용장", ["서량기병", "결사대"], "관을 짊어진 결의"],
  ["zhen-ji", "견희", "甄姬", "위", 3, "지원", ["업성의 미인", "조씨일문"], "낙신무"],
  ["wang-yi", "왕이", "王異", "위", 2, "암살", ["서량숙적", "복수자"], "철혈의 복수"],
  ["cao-zhang", "조창", "曹彰", "위", 2, "용장", ["조씨일문", "황수아"], "황색 수염의 맹공"],
  ["man-chong", "만총", "滿寵", "위", 1, "지원", ["조위중신", "합비수비"], "엄정한 통치"],

  ["pang-tong", "방통", "龐統", "촉", 4, "책사", ["와룡봉추", "연환계"], "봉추연환"],
  ["fa-zheng", "법정", "法正", "촉", 3, "책사", ["입촉공신", "책략가"], "기정상생"],
  ["wei-yan", "위연", "魏延", "촉", 3, "용장", ["한중공방", "기습대장"], "자오곡 기습"],
  ["jiang-wei", "강유", "姜維", "촉", 5, "기병", ["북벌계승", "문무겸비"], "기린아의 북벌"],
  ["ma-liang", "마량", "馬良", "촉", 2, "지원", ["형주명사", "백미"], "백미의 조언"],
  ["guan-ping", "관평", "關平", "촉", 2, "용장", ["관씨일문", "형주수비"], "충의의 칼날"],
  ["guan-xing", "관흥", "關興", "촉", 2, "기병", ["관씨일문", "이세대"], "청룡의 계승"],
  ["zhang-bao-shu", "장포", "張苞", "촉", 2, "용장", ["장씨일문", "이세대"], "사모의 계승"],
  ["huang-yueying", "황월영", "黃月英", "촉", 3, "지원", ["목우유마", "부부책사"], "목우유마"],
  ["xu-shu", "서서", "徐庶", "촉", 3, "책사", ["수경문하", "한실부흥"], "팔문금쇄 파훼"],
  ["liu-shan", "유선", "劉禪", "촉", 1, "군주", ["한실부흥", "촉한황실"], "낙불사촉"],
  ["mi-zhu", "미축", "麋竺", "촉", 1, "지원", ["입촉공신", "상인"], "군량조달"],
  ["jian-yong", "간옹", "簡雍", "촉", 1, "지원", ["유비군원로", "달변가"], "화친의 언변"],
  ["wang-ping", "왕평", "王平", "촉", 2, "수호", ["한중공방", "무당비군"], "가정 수습"],
  ["ma-dai", "마대", "馬岱", "촉", 2, "기병", ["서량기병", "마씨일문"], "추격의 칼날"],
  ["zhuge-zhan", "제갈첨", "諸葛瞻", "촉", 1, "책사", ["북벌계승", "부자책사"], "충절의 진"],
  ["liao-hua", "요화", "廖化", "촉", 1, "용장", ["유비군원로", "노익장"], "선봉은 요화"],
  ["zhou-cang", "주창", "周倉", "촉", 1, "수호", ["관씨일문", "충의"], "청룡도 호위"],

  ["sun-jian", "손견", "孫堅", "오", 4, "용장", ["손씨일가", "강동맹장"], "강동의 호랑이"],
  ["lu-su", "노숙", "魯肅", "오", 3, "지원", ["강동사걸", "동맹설계"], "천하이분지계"],
  ["lu-meng", "여몽", "呂蒙", "오", 4, "암살", ["강동사걸", "백의도강"], "괄목상대"],
  ["lu-xun", "육손", "陸遜", "오", 5, "책사", ["강동사걸", "이릉화공"], "화소연영"],
  ["taishi-ci", "태사자", "太史慈", "오", 3, "궁수", ["강동맹장", "신의"], "쌍극연사"],
  ["huang-gai", "황개", "黃蓋", "오", 2, "수호", ["강동원로", "고육계"], "고육지책"],
  ["cheng-pu", "정보", "程普", "오", 2, "수호", ["강동원로", "강동맹장"], "철척"],
  ["han-dang", "한당", "韓當", "오", 1, "궁수", ["강동원로", "강동맹장"], "노장의 연사"],
  ["zhou-tai", "주태", "周泰", "오", 3, "수호", ["강동맹장", "불굴"], "온몸의 상흔"],
  ["ling-tong", "능통", "凌統", "오", 2, "용장", ["강동맹장", "원수"], "국사의 기개"],
  ["sun-shangxiang", "손상향", "孫尚香", "오", 3, "궁수", ["손씨일가", "정략결혼"], "궁요희"],
  ["xiao-qiao", "소교", "小喬", "오", 2, "지원", ["이교", "강동의 꽃"], "유풍의 춤"],
  ["zhang-zhao", "장소", "張昭", "오", 2, "책사", ["강동중신", "내정가"], "강동의 기둥"],
  ["zhu-zhi", "주치", "朱治", "오", 1, "수호", ["강동원로", "강동중신"], "오군 수비"],
  ["xu-sheng", "서성", "徐盛", "오", 2, "수호", ["강동맹장", "의성계"], "가짜 성벽"],
  ["ding-feng", "정봉", "丁奉", "오", 1, "암살", ["강동맹장", "설중기습"], "단병접전"],
  ["bu-lianshi", "보연사", "步練師", "오", 2, "지원", ["오궁", "강동의 꽃"], "연사의 위무"],
  ["sun-huan", "손환", "孫桓", "오", 1, "용장", ["손씨일가", "이세대"], "이릉의 방벽"],
  ["pan-zhang", "반장", "潘璋", "오", 1, "암살", ["강동맹장", "추격대"], "야습 추격"],
  ["zhu-ran", "주연", "朱然", "오", 2, "궁수", ["강동맹장", "이릉화공"], "화시진"],

  ["yuan-shu", "원술", "袁術", "기타", 2, "군주", ["사세삼공", "참칭황제"], "옥새의 허영"],
  ["gongsun-zan", "공손찬", "公孫瓚", "기타", 3, "기병", ["백마의종", "북방군벌"], "백마 돌격"],
  ["chen-gong", "진궁", "陳宮", "기타", 3, "책사", ["연환계", "충언"], "배수의 계략"],
  ["gao-shun", "고순", "高順", "기타", 3, "수호", ["함진영", "난세무쌍"], "함진지사"],
  ["zhang-jiao", "장각", "張角", "기타", 5, "책사", ["황건형제", "태평도"], "창천사망"],
  ["zhang-bao-yellow", "장보", "張寶", "기타", 1, "책사", ["황건형제", "태평도"], "지공장군"],
  ["zhang-liang", "장량", "張梁", "기타", 1, "용장", ["황건형제", "태평도"], "인공장군"],
  ["meng-huo", "맹획", "孟獲", "기타", 3, "수호", ["남만왕가", "칠종칠금"], "남만왕의 분노"],
  ["zhu-rong", "축융", "祝融", "기타", 3, "궁수", ["남만왕가", "화신"], "비도화염"],
  ["hua-tuo", "화타", "華佗", "기타", 5, "지원", ["방외지인", "명의"], "청낭서"],
  ["zuo-ci", "좌자", "左慈", "기타", 5, "책사", ["방외지인", "환술"], "둔갑천서"],
  ["cai-wenji", "채문희", "蔡文姬", "기타", 4, "지원", ["난세의 재녀", "호가십팔박"], "호가의 선율"],
  ["dong-bai", "동백", "董白", "기타", 1, "암살", ["서량군벌", "동씨일문"], "폭군의 후계"],
  ["yan-liang", "안량", "顔良", "기타", 3, "용장", ["하북쌍웅", "원소군"], "일기돌파"],
  ["wen-chou", "문추", "文醜", "기타", 3, "기병", ["하북쌍웅", "원소군"], "하북질주"],
  ["tian-feng", "전풍", "田豐", "기타", 2, "책사", ["하북모사", "충언"], "직언의 계책"],
  ["ju-shou", "저수", "沮授", "기타", 2, "지원", ["하북모사", "원소군"], "감군의 지략"],
  ["li-ru", "이유", "李儒", "기타", 2, "책사", ["서량군벌", "독사"], "독주계"],
  ["ma-teng", "마등", "馬騰", "기타", 3, "기병", ["서량기병", "마씨일문"], "서량봉기"],
  ["han-sui", "한수", "韓遂", "기타", 2, "기병", ["서량기병", "서량군벌"], "양주연맹"],
  ["hua-xiong", "화웅", "華雄", "기타", 2, "용장", ["서량군벌", "관문수비"], "사수관의 위세"],
];

const slugHash = (value: string) =>
  [...value].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);

const ROLE_AFFINITIES: Record<Role, BattlefieldTheme[]> = {
  군주: ["평지", "산지"],
  용장: ["평지", "사막"],
  수호: ["산지", "평지"],
  책사: ["습지", "바다"],
  궁수: ["산지", "정글"],
  기병: ["평지", "사막"],
  암살: ["정글", "습지"],
  지원: ["바다", "정글"],
};

/** 병과 기본 사거리: 근접 1 · 원거리 3 */
export const ROLE_ATTACK_RANGE: Record<Role, number> = {
  군주: 1,
  용장: 1,
  수호: 1,
  기병: 1,
  암살: 1,
  책사: 3,
  지원: 3,
  궁수: 3,
};

/** 멀리 쏠 수 있는 고유 특성을 가진 장수 — 사거리 5 */
export const LONG_RANGE_HERO_IDS = new Set([
  "huang-zhong",
  "taishi-ci",
  "sun-shangxiang",
  "xiahou-yuan",
  "zhu-ran",
]);

export const attackRangeFor = (heroId: string, role: Role) =>
  LONG_RANGE_HERO_IDS.has(heroId) ? 5 : ROLE_ATTACK_RANGE[role];

export const rangeLabelFor = (range: number) =>
  range >= 5 ? "장거리" : range >= 3 ? "원거리" : "근접";

const AFFINITY_OVERRIDES: Partial<
  Record<string, BattlefieldTheme[]>
> = {
  "cao-cao": ["평지", "산지"],
  "liu-bei": ["평지", "정글"],
  "sun-quan": ["바다", "습지"],
  "lu-bu": ["평지", "사막"],
  "guan-yu": ["습지", "바다"],
  "zhang-fei": ["산지", "평지"],
  "zhuge-liang": ["산지", "습지"],
  "zhou-yu": ["바다", "정글"],
  "sima-yi": ["산지", "습지"],
  "zhao-yun": ["평지", "산지"],
  "ma-chao": ["평지", "사막"],
  "huang-zhong": ["산지", "정글"],
  "zhang-liao": ["평지", "사막"],
  "sun-ce": ["바다", "평지"],
  "da-qiao": ["바다", "습지"],
  "diao-chan": ["정글", "습지"],
  "gan-ning": ["바다", "습지"],
  "lu-meng": ["바다", "정글"],
  "lu-xun": ["정글", "산지"],
  "taishi-ci": ["바다", "산지"],
  "huang-gai": ["바다", "평지"],
  "zhou-tai": ["바다", "습지"],
  "sun-shangxiang": ["바다", "정글"],
  "gongsun-zan": ["평지", "사막"],
  "meng-huo": ["정글", "산지"],
  "zhu-rong": ["정글", "사막"],
  "hua-tuo": ["정글", "습지"],
  "zuo-ci": ["산지", "습지"],
  "ma-teng": ["평지", "사막"],
  "han-sui": ["평지", "사막"],
};

const ICONIC_PASSIVES: Partial<Record<string, HeroPassive>> = {
  "cao-cao": {
    name: "둔전제",
    description: "3연승 이상으로 승리하면 추가 금화 1을 획득합니다.",
    kind: "경제",
    value: 1,
    trigger: "streak-win",
  },
  "liu-bei": {
    name: "인덕",
    description: "체력이 가장 낮은 아군의 방어와 회복 효과가 14% 상승합니다.",
    kind: "전투",
    value: 14,
  },
  "sun-quan": {
    name: "강동 수군",
    description: "바다 전장에서 승리하면 추가 금화 1을 획득합니다.",
    kind: "경제",
    value: 1,
    trigger: "sea-win",
  },
  "lu-bu": {
    name: "비장",
    description: "혼자 남으면 공격력과 흡혈이 24% 상승합니다.",
    kind: "전투",
    value: 24,
  },
  "guan-yu": {
    name: "수엄칠군",
    description: "습지·바다에서 첫 스킬 피해가 18% 증가합니다.",
    kind: "지형",
    value: 18,
    trigger: "terrain",
  },
  "zhang-fei": {
    name: "일갈",
    description: "전투 시작 시 전열 적의 공격력을 12% 낮춥니다.",
    kind: "전투",
    value: 12,
  },
  "zhuge-liang": {
    name: "지형지세",
    description: "선호 지형에서 지형 보너스 효과가 20% 더 강해집니다.",
    kind: "지형",
    value: 20,
    trigger: "terrain",
  },
  "zhou-yu": {
    name: "화공",
    description: "바다·정글에서 책략 피해가 18% 상승합니다.",
    kind: "지형",
    value: 18,
    trigger: "terrain",
  },
  "sima-yi": {
    name: "은인자중",
    description: "연패 중 받는 플레이어 피해가 2 감소합니다.",
    kind: "경제",
    value: 2,
    trigger: "loss-shield",
  },
  "zhao-yun": {
    name: "단기구주",
    description: "체력이 35% 이하인 아군에게 돌진해 보호막을 부여합니다.",
    kind: "전투",
    value: 16,
  },
  "ma-chao": {
    name: "서량철기",
    description: "평지·사막에서 돌진 피해가 18% 증가합니다.",
    kind: "지형",
    value: 18,
    trigger: "terrain",
  },
  "huang-zhong": {
    name: "노익장",
    description: "전투 시간이 10초를 넘으면 치명타 확률이 16% 상승합니다.",
    kind: "전투",
    value: 16,
  },
  "zhang-liao": {
    name: "위진소요진",
    description: "적 후열을 처치하면 공격 속도가 16% 상승합니다.",
    kind: "전투",
    value: 16,
  },
  "guo-jia": {
    name: "유책",
    description: "사망하면 가장 가까운 책사의 기력을 20 회복합니다.",
    kind: "전투",
    value: 12,
  },
  "sun-ce": {
    name: "소패왕",
    description: "첫 돌진으로 적을 쓰러뜨리면 즉시 한 번 더 돌진합니다.",
    kind: "전투",
    value: 16,
  },
  "da-qiao": {
    name: "유수",
    description: "바다·습지에서 아군이 받는 회복량이 14% 증가합니다.",
    kind: "지형",
    value: 14,
    trigger: "terrain",
  },
  "diao-chan": {
    name: "연환무",
    description: "첫 공격 대상의 공격 속도를 18% 빼앗습니다.",
    kind: "전투",
    value: 18,
  },
  "yuan-shao": {
    name: "사세삼공",
    description: "전장에 4코스트 이상 장수가 3명 이상이면 전체 공격력 +15%.",
    kind: "전투",
    value: 15,
  },
  "dong-zhuo": {
    name: "폭정",
    description: "아군 한 명이 쓰러질 때마다 최대 체력이 8% 상승합니다.",
    kind: "전투",
    value: 16,
  },
  "gan-ning": {
    name: "금범야습",
    description: "바다·습지에서 전투 시작 시 적 후열로 즉시 침투합니다.",
    kind: "지형",
    value: 15,
    trigger: "terrain",
  },
  "mi-zhu": {
    name: "군량상단",
    description: "보유 금화가 20 이상이면 라운드 이자 +1을 획득합니다.",
    kind: "경제",
    value: 1,
    trigger: "interest",
  },
  "lu-xun": {
    name: "연영화계",
    description: "정글·산지에서 스킬이 적중할 때 화염이 인접 적에게 번집니다.",
    kind: "지형",
    value: 20,
    trigger: "terrain",
  },
  "zhang-jiao": {
    name: "태평요술",
    description: "스킬을 세 번째 사용할 때 전장 전체에 낙뢰를 일으킵니다.",
    kind: "전투",
    value: 20,
  },
  "meng-huo": {
    name: "남만의 왕",
    description: "정글에서 제어 효과를 무시하고 매초 체력을 회복합니다.",
    kind: "지형",
    value: 16,
    trigger: "terrain",
  },
  "zhu-rong": {
    name: "화신의 후예",
    description: "정글·사막에서 기본 공격이 화상 피해를 남깁니다.",
    kind: "지형",
    value: 16,
    trigger: "terrain",
  },
  "hua-tuo": {
    name: "마비산",
    description: "전투당 한 번, 쓰러지는 아군을 체력 28%로 되살립니다.",
    kind: "전투",
    value: 28,
  },
  "zuo-ci": {
    name: "둔갑",
    description: "첫 치명 피해를 받으면 무작위 빈 칸으로 이동해 회피합니다.",
    kind: "전투",
    value: 20,
  },
};

const affinityFor = (
  id: string,
  role: Role,
  cost: Cost,
  hash: number,
) => {
  if (AFFINITY_OVERRIDES[id]) return AFFINITY_OVERRIDES[id]!;
  const pool = ROLE_AFFINITIES[role];
  if (cost >= 4) return pool;
  return [pool[hash % pool.length]];
};

const passiveFor = (
  id: string,
  name: string,
  role: Role,
  cost: Cost,
  hash: number,
): HeroPassive => {
  if (ICONIC_PASSIVES[id]) return ICONIC_PASSIVES[id]!;
  const value = COST_BUDGETS[cost].passiveBudget;
  const variant = hash % 2;
  const templates: Record<Role, [HeroPassive, HeroPassive]> = {
    군주: [
      {
        name: `${name}의 군령`,
        description: `전투 시작 시 인접 아군의 모든 능력치가 ${value}% 상승합니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 위엄`,
        description: `같은 세력 아군이 2명 이상이면 최대 체력이 ${value}% 상승합니다.`,
        kind: "전투",
        value,
      },
    ],
    용장: [
      {
        name: `${name}의 분전`,
        description: `체력이 절반 이하가 되면 공격력이 ${value}% 상승합니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 추격`,
        description: `적 처치 관여 시 다음 공격 피해가 ${value}% 증가합니다.`,
        kind: "전투",
        value,
      },
    ],
    수호: [
      {
        name: `${name}의 철벽`,
        description: `전투 시작 후 5초 동안 받는 피해가 ${value}% 감소합니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 호위`,
        description: `후열 아군이 받는 첫 피해의 ${value}%를 대신 받습니다.`,
        kind: "전투",
        value,
      },
    ],
    책사: [
      {
        name: `${name}의 묘책`,
        description: `첫 스킬의 책략 피해와 보호 효과가 ${value}% 상승합니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 간파`,
        description: `선호 지형에서 적의 지형 보너스를 ${value}% 약화합니다.`,
        kind: "지형",
        value,
        trigger: "terrain",
      },
    ],
    궁수: [
      {
        name: `${name}의 조준`,
        description: `같은 대상을 연속 공격하면 피해가 최대 ${value}% 증가합니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 고지`,
        description: `선호 지형에서 치명타 확률이 ${value}% 상승합니다.`,
        kind: "지형",
        value,
        trigger: "terrain",
      },
    ],
    기병: [
      {
        name: `${name}의 돌진`,
        description: `전투 시작 돌진 거리에 비례해 최대 ${value}% 추가 피해를 줍니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 질주`,
        description: `선호 지형에서 공격 속도가 ${value}% 상승합니다.`,
        kind: "지형",
        value,
        trigger: "terrain",
      },
    ],
    암살: [
      {
        name: `${name}의 매복`,
        description: `첫 공격이 반드시 치명타가 되며 피해가 ${value}% 증가합니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 은신`,
        description: `선호 지형에서 전투 시작 후 2초 동안 공격 대상이 되지 않습니다.`,
        kind: "지형",
        value,
        trigger: "terrain",
      },
    ],
    지원: [
      {
        name: `${name}의 보급`,
        description: `전투 시작 시 체력이 가장 낮은 아군을 ${value}% 회복합니다.`,
        kind: "전투",
        value,
      },
      {
        name: `${name}의 격려`,
        description: `선호 지형에서 아군의 회복·보호 효과가 ${value}% 상승합니다.`,
        kind: "지형",
        value,
        trigger: "terrain",
      },
    ],
  };
  return templates[role][variant];
};

const portraitSlots: Record<Faction, number> = {
  위: 0,
  촉: 0,
  오: 0,
  기타: 0,
};

export const HEROES: Hero[] = rows.map((row) => {
  const [id, name, hanja, faction, cost, role, bonds, skill] = row;
  const hash = slugHash(id);
  const variance = hash % 9;
  const portraitIndex = portraitSlots[faction];
  portraitSlots[faction] += 1;

  return {
    id,
    name,
    hanja,
    faction,
    cost,
    role,
    bonds,
    skill,
    range: attackRangeFor(id, role),
    affinity: affinityFor(id, role, cost, hash),
    passive: passiveFor(id, name, role, cost, hash),
    portraitIndex,
    attack: 38 + cost * 13 + variance * 2,
    defense: 18 + cost * 8 + (8 - variance),
    health: 480 + cost * 145 + variance * 18,
  };
});

export const terrainModifierFor = (
  hero: Hero,
  themeId: BattlefieldTheme,
  star: 1 | 2 | 3 = 1,
) => {
  const theme = BATTLEFIELD_BY_ID[themeId];
  let modifier = 0;

  if (theme.favoredRoles.includes(hero.role)) modifier += theme.roleBonus;
  if (theme.favoredFaction === hero.faction) modifier += theme.factionBonus;
  if (theme.penalizedRoles.includes(hero.role)) modifier -= theme.penalty;
  if (hero.affinity.includes(themeId)) modifier += theme.affinityBonus;
  if (
    hero.passive.kind === "지형" &&
    hero.affinity.includes(themeId)
  ) {
    modifier +=
      (hero.passive.value / 100) * PASSIVE_STAR_SCALE[star];
  }

  return modifier;
};

export const HERO_BY_ID = Object.fromEntries(
  HEROES.map((hero) => [hero.id, hero]),
) as Record<string, Hero>;

export const FACTION_COLOR: Record<Faction, string> = {
  위: "#4c7087",
  촉: "#587b5b",
  오: "#a34437",
  기타: "#b08a45",
};

/**
 * 시너지 1티어당 가담 장수 전원에게 부여되는 능력치 보정.
 * 모든 값은 기본 능력치에 대한 가산 비율이며, mana만 절대치(기력)다.
 * shield는 최대 체력 대비 보호막 비율이다.
 * 이 표가 UI 표기와 전투 엔진 계산의 단일 진실 공급원이다.
 */
export type SynergyGrant = {
  attack?: number;
  defense?: number;
  health?: number;
  shield?: number;
  mana?: number;
};

export const FACTION_EFFECTS: Record<
  Faction,
  { tiers: number[]; effects: string[]; steps: SynergyGrant[] }
> = {
  위: {
    tiers: [2, 4, 6],
    effects: ["전투 시작 시 보호막 10%", "보호막 22%", "보호막 35%·반격"],
    steps: [
      { shield: 0.1, health: 0.03 },
      { shield: 0.22, health: 0.06 },
      { shield: 0.35, health: 0.1, defense: 0.06 },
    ],
  },
  촉: {
    tiers: [2, 4, 6],
    effects: ["공격 속도 +8%", "공격 속도 +18%", "공격 속도 +30%·기력 회수"],
    steps: [
      { attack: 0.08 },
      { attack: 0.18, mana: 8 },
      { attack: 0.3, mana: 16 },
    ],
  },
  오: {
    tiers: [2, 4, 6],
    effects: ["책략 피해 +8%", "책략 피해 +20%", "책략 피해 +35%·기력 획득"],
    steps: [
      { attack: 0.06, mana: 12 },
      { attack: 0.14, mana: 20 },
      { attack: 0.24, mana: 30 },
    ],
  },
  기타: {
    tiers: [2, 4, 6],
    effects: ["모든 능력치 +5%", "모든 능력치 +12%", "모든 능력치 +20%·처형"],
    steps: [
      { attack: 0.05, defense: 0.05, health: 0.05 },
      { attack: 0.12, defense: 0.12, health: 0.12 },
      { attack: 0.2, defense: 0.2, health: 0.2 },
    ],
  },
};

export const ROLE_EFFECTS: Record<
  Role,
  { tiers: number[]; effect: string; steps: SynergyGrant[] }
> = {
  군주: {
    tiers: [2, 4],
    effect: "아군 전체 능력치 상승",
    steps: [
      { attack: 0.06, defense: 0.06, health: 0.06 },
      { attack: 0.12, defense: 0.12, health: 0.12 },
    ],
  },
  용장: {
    tiers: [2, 4, 6],
    effect: "공격력과 흡혈 상승",
    steps: [{ attack: 0.1 }, { attack: 0.2 }, { attack: 0.32, health: 0.08 }],
  },
  수호: {
    tiers: [2, 4, 6],
    effect: "방어력과 피해 감소 상승",
    steps: [
      { defense: 0.12, health: 0.06 },
      { defense: 0.24, health: 0.12 },
      { defense: 0.38, health: 0.2 },
    ],
  },
  책사: {
    tiers: [2, 4, 6],
    effect: "책략 피해와 기력 회복 상승",
    steps: [
      { attack: 0.08, mana: 10 },
      { attack: 0.16, mana: 18 },
      { attack: 0.26, mana: 28 },
    ],
  },
  지원: {
    tiers: [2, 4],
    effect: "힐러·버퍼·오라 서포트 효과 상승",
    steps: [{ health: 0.08, shield: 0.06 }, { health: 0.16, shield: 0.12 }],
  },
  궁수: {
    tiers: [2, 4],
    effect: "원거리 딜러 공격·치명 상승",
    steps: [{ attack: 0.12 }, { attack: 0.24 }],
  },
  기병: {
    tiers: [2, 4],
    effect: "전투 시작 돌진 및 공격 속도 상승",
    steps: [{ attack: 0.1, health: 0.04 }, { attack: 0.18, health: 0.08 }],
  },
  암살: {
    tiers: [2, 4],
    effect: "후열 침투와 치명타 피해 상승",
    steps: [{ attack: 0.12 }, { attack: 0.24 }],
  },
};

export const BOND_RULES: Record<
  string,
  { tiers: number[]; effect: string; steps: SynergyGrant[] }
> = {
  도원결의: {
    tiers: [3],
    effect: "한 명이 쓰러지면 형제의 공격력·기력 상승",
    steps: [{ attack: 0.14, mana: 12 }],
  },
  오호대장군: {
    tiers: [2, 5],
    effect: "오호 장수의 공격력과 피해 감소 상승",
    steps: [{ attack: 0.08, defense: 0.06 }, { attack: 0.2, defense: 0.14 }],
  },
  와룡봉추: {
    tiers: [2],
    effect: "첫 책략이 두 번 발동",
    steps: [{ attack: 0.12, mana: 18 }],
  },
  손씨일가: {
    tiers: [2, 4],
    effect: "상점 새로고침 시 오 장수 출현 확률 상승",
    steps: [{ health: 0.06, mana: 6 }, { health: 0.12, mana: 12 }],
  },
  강동쌍벽: {
    tiers: [2],
    effect: "손책이 돌진하면 주유가 화공 지원",
    steps: [{ attack: 0.12 }],
  },
  이교: {
    tiers: [2],
    effect: "매 전투 처음 받는 치명 피해를 무효화",
    steps: [{ shield: 0.12, health: 0.05 }],
  },
  강동사걸: {
    tiers: [2, 4],
    effect: "책략 사용 시 아군 오 장수의 기력 회복",
    steps: [{ attack: 0.06, mana: 10 }, { attack: 0.14, mana: 20 }],
  },
  오자양장: {
    tiers: [2, 5],
    effect: "위 장수 처치 관여 시 공격 속도 중첩",
    steps: [{ attack: 0.08 }, { attack: 0.2 }],
  },
  하후일문: {
    tiers: [2],
    effect: "전열과 후열이 서로 피해를 분담",
    steps: [{ defense: 0.1, health: 0.05 }],
  },
  호위쌍벽: {
    tiers: [2],
    effect: "가장 강한 군주를 대신해 피해를 받음",
    steps: [{ defense: 0.14, health: 0.08 }],
  },
  왕좌지재: {
    tiers: [2, 4],
    effect: "전투 시작 시 무작위 적의 능력치 약화",
    steps: [{ attack: 0.06, mana: 8 }, { attack: 0.14, mana: 16 }],
  },
  비장연가: {
    tiers: [2],
    effect: "초선이 생존한 동안 여포가 광폭화",
    steps: [{ attack: 0.16 }],
  },
  황건형제: {
    tiers: [3],
    effect: "쓰러진 황건 병사가 번개를 남김",
    steps: [{ attack: 0.1, health: 0.08 }],
  },
  남만왕가: {
    tiers: [2],
    effect: "제어 면역과 지속 회복 획득",
    steps: [{ health: 0.12, shield: 0.06 }],
  },
  하북쌍웅: {
    tiers: [2],
    effect: "첫 공격이 반드시 치명타",
    steps: [{ attack: 0.14 }],
  },
  서량기병: {
    tiers: [2, 4],
    effect: "돌진 거리에 비례해 추가 피해",
    steps: [{ attack: 0.09 }, { attack: 0.18, health: 0.05 }],
  },
  관씨일문: {
    tiers: [2, 4],
    effect: "관우의 공격을 관씨 장수가 따라 공격",
    steps: [{ attack: 0.08 }, { attack: 0.18 }],
  },
  연환계: {
    tiers: [2],
    effect: "적이 받는 제어 효과가 인접 적에게 전이",
    steps: [{ attack: 0.08, mana: 10 }],
  },
  책략가: {
    tiers: [2, 4],
    effect: "전투 시작 시 무작위 계략 획득",
    steps: [{ attack: 0.06, mana: 10 }, { attack: 0.12, mana: 20 }],
  },
  조위중신: {
    tiers: [3, 5],
    effect: "위 중신들이 결속해 방어와 기력을 강화",
    steps: [{ defense: 0.1, health: 0.06 }, { defense: 0.2, health: 0.12 }],
  },
  조씨일문: {
    tiers: [2, 4],
    effect: "조씨 일족이 서로의 능력치를 보강",
    steps: [{ attack: 0.06, defense: 0.06 }, { attack: 0.14, defense: 0.12 }],
  },
  강동맹장: {
    tiers: [3, 5],
    effect: "강동 맹장들이 전열을 이뤄 공격을 중첩",
    steps: [{ attack: 0.1, health: 0.05 }, { attack: 0.2, health: 0.12 }],
  },
  강동원로: {
    tiers: [2],
    effect: "노장들이 진영을 다잡아 방어를 강화",
    steps: [{ defense: 0.12, health: 0.06 }],
  },
  한실부흥: {
    tiers: [2, 4],
    effect: "한실 부흥의 대의로 전군의 사기 상승",
    steps: [
      { attack: 0.06, defense: 0.04, health: 0.04 },
      { attack: 0.12, defense: 0.1, health: 0.1 },
    ],
  },
  서량군벌: {
    tiers: [2, 4],
    effect: "서량 군벌이 거친 기세로 공격을 강화",
    steps: [{ attack: 0.08 }, { attack: 0.18, health: 0.06 }],
  },
  태평도: {
    tiers: [2, 4],
    effect: "태평도의 술법으로 책략과 기력을 강화",
    steps: [{ attack: 0.08, mana: 10 }, { attack: 0.16, mana: 20 }],
  },
};

const highestSynergyTierIndex = (count: number, tiers: number[]) => {
  let index = -1;
  tiers.forEach((tier, tierIndex) => {
    if (count >= tier) index = tierIndex;
  });
  return index;
};

/**
 * 진영·역할·인연 시너지를 합산해 한 장수가 받는 능력치 보정을 반환한다.
 */
export const synergyStatsFor = (
  roster: { heroId: string }[],
  hero: Hero,
): Required<SynergyGrant> => {
  const accumulated = {
    attack: 0,
    defense: 0,
    health: 0,
    shield: 0,
    mana: 0,
  };
  const add = (grant?: SynergyGrant) => {
    if (!grant) return;
    accumulated.attack += grant.attack ?? 0;
    accumulated.defense += grant.defense ?? 0;
    accumulated.health += grant.health ?? 0;
    accumulated.shield += grant.shield ?? 0;
    accumulated.mana += grant.mana ?? 0;
  };

  const factionCount = roster.filter(
    (piece) => HERO_BY_ID[piece.heroId].faction === hero.faction,
  ).length;
  const factionRule = FACTION_EFFECTS[hero.faction];
  const factionTier = highestSynergyTierIndex(factionCount, factionRule.tiers);
  if (factionTier >= 0) add(factionRule.steps[factionTier]);

  const roleCount = roster.filter(
    (piece) => HERO_BY_ID[piece.heroId].role === hero.role,
  ).length;
  const roleRule = ROLE_EFFECTS[hero.role];
  const roleTier = highestSynergyTierIndex(roleCount, roleRule.tiers);
  if (roleTier >= 0) add(roleRule.steps[roleTier]);

  hero.bonds.forEach((bond) => {
    const bondRule = BOND_RULES[bond];
    if (!bondRule) return;
    const bondCount = roster.filter((piece) =>
      HERO_BY_ID[piece.heroId].bonds.includes(bond),
    ).length;
    const bondTier = highestSynergyTierIndex(bondCount, bondRule.tiers);
    if (bondTier >= 0) add(bondRule.steps[bondTier]);
  });

  return accumulated;
};

export const SHOP_ODDS: Record<number, number[]> = {
  1: [100, 0, 0, 0, 0],
  2: [100, 0, 0, 0, 0],
  3: [75, 25, 0, 0, 0],
  4: [55, 30, 15, 0, 0],
  5: [45, 33, 20, 2, 0],
  6: [30, 40, 25, 5, 0],
  7: [19, 30, 35, 15, 1],
  8: [18, 25, 32, 22, 3],
  9: [10, 20, 25, 35, 10],
};

export const STARTING_BOARD = [
  "cao-cao",
  "xiahou-dun",
  "guan-yu",
  "liu-bei",
  "sun-ce",
  "zhou-yu",
];

export const STARTING_BENCH = [
  "zhang-liao",
  "da-qiao",
  "zhao-yun",
  "diao-chan",
];
