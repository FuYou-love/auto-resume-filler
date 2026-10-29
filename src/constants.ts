import type { AppState, Profile } from "./types";

export const APP_NAME = "OfferPilot";
export const STORAGE_KEY = "offerPilotState";

export function createId(prefix = "item"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const CITY_OPTIONS: string[] = [
  "北京市", "上海市", "广州市", "深圳市", "杭州市", "南京市", "成都市", "武汉市", "西安市", "苏州市",
  "重庆市", "天津市", "长沙市", "郑州市", "合肥市", "青岛市", "济南市", "宁波市", "厦门市", "福州市",
  "无锡市", "东莞市", "沈阳市", "大连市", "哈尔滨市", "长春市", "昆明市", "贵阳市", "南昌市", "南宁市",
  "太原市", "石家庄市", "兰州市", "海口市", "珠海市", "佛山市", "惠州市", "常州市", "南通市", "温州市",
  "泉州市", "徐州市", "烟台市", "洛阳市", "唐山市", "保定市", "廊坊市", "中山市", "绍兴市", "嘉兴市",
  "金华市", "台州市", "扬州市", "盐城市", "潍坊市", "淄博市", "芜湖市", "株洲市", "衡阳市", "桂林市",
  "三亚市", "呼和浩特市", "乌鲁木齐市", "拉萨市", "银川市", "西宁市", "香港", "澳门", "台北",
  "广东省", "浙江省", "江苏省", "山东省", "河南省", "河北省", "湖南省", "湖北省", "安徽省", "福建省",
  "四川省", "陕西省", "辽宁省", "吉林省", "黑龙江省", "山西省", "江西省", "云南省", "贵州省", "广西",
  "甘肃省", "海南省", "青海省", "宁夏", "内蒙古", "新疆", "西藏", "海外 / 其他"
];

export function createEmptyProfile(name = "默认档案"): Profile {
  return {
    id: createId("profile"),
    name,
    updatedAt: Date.now(),
    personal: {
      fullName: "",
      phone: "",
      email: "",
      gender: "",
      birthDate: "",
      location: "",
      hometown: "",
      address: "",
      postalCode: "",
      idNumber: "",
      wechat: "",
      website: ""
    },
    target: { role: "", city: "", salary: "", employmentType: "" },
    education: [],
    work: [],
    projects: [],
    campus: [],
    additional: {
      skills: "",
      languages: "",
      certificates: "",
      awards: "",
      selfIntroduction: ""
    },
    resumeName: ""
  };
}

export function createDefaultState(): AppState {
  const profile = createEmptyProfile();
  return {
    profiles: [profile],
    activeProfileId: profile.id,
    settings: {
      fillEmptyOnly: true,
      highlightFilled: true,
      minConfidence: 0.62
    }
  };
}

export function profileCompletion(profile: Profile): number {
  const values = [
    profile.personal.fullName,
    profile.personal.phone,
    profile.personal.email,
    profile.personal.location,
    profile.target.role,
    profile.target.city,
    profile.additional.skills,
    profile.additional.selfIntroduction
  ];
  const base = values.filter(Boolean).length;
  const experiences = [profile.education, profile.work, profile.projects, profile.campus].filter(
    (items) => items.length > 0
  ).length;
  return Math.round(((base + experiences) / 12) * 100);
}
