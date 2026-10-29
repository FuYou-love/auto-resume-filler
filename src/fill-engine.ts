import type { FillResult, FillSettings, Profile } from "./types";

type FillElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;
type ProfileListKey = "education" | "work" | "projects" | "campus";

interface FieldRule {
  id: string;
  aliases: string[];
  contexts?: string[];
  requiresContext?: boolean;
  value: (profile: Profile, index: number) => string;
}

const personalRules: FieldRule[] = [
  { id: "fullName", aliases: ["姓名", "真实姓名", "中文名", "应聘者姓名", "full name", "applicant name"], value: (p) => p.personal.fullName },
  { id: "phone", aliases: ["手机号码", "手机", "联系电话", "移动电话", "手机号", "phone", "mobile", "telephone"], value: (p) => p.personal.phone },
  { id: "email", aliases: ["电子邮箱", "邮箱地址", "联系邮箱", "邮箱", "email", "e-mail"], value: (p) => p.personal.email },
  { id: "gender", aliases: ["性别", "gender", "sex"], value: (p) => p.personal.gender },
  { id: "birthDate", aliases: ["出生日期", "出生年月", "生日", "birth date", "birthday", "date of birth"], value: (p) => p.personal.birthDate },
  { id: "location", aliases: ["现居城市", "当前城市", "所在地", "现居地", "居住城市", "current city", "location"], value: (p) => p.personal.location },
  { id: "hometown", aliases: ["籍贯", "生源地", "户籍所在地", "户口所在地", "hometown", "native place"], value: (p) => p.personal.hometown },
  { id: "address", aliases: ["通讯地址", "联系地址", "详细地址", "居住地址", "address"], value: (p) => p.personal.address },
  { id: "postalCode", aliases: ["邮政编码", "邮编", "zip code", "postal code"], value: (p) => p.personal.postalCode },
  { id: "idNumber", aliases: ["证件号码", "身份证号", "身份证号码", "证件号", "id number", "identity number"], value: (p) => p.personal.idNumber },
  { id: "wechat", aliases: ["微信号", "微信", "wechat", "weixin"], value: (p) => p.personal.wechat },
  { id: "website", aliases: ["个人主页", "作品集", "博客地址", "github", "portfolio", "personal website", "homepage"], value: (p) => p.personal.website },
  { id: "targetRole", aliases: ["期望职位", "应聘岗位", "意向岗位", "求职岗位", "申请职位", "position applied", "desired position"], value: (p) => p.target.role },
  { id: "targetCity", aliases: ["期望城市", "意向城市", "工作地点", "期望工作地", "desired city", "preferred location"], value: (p) => p.target.city },
  { id: "salary", aliases: ["期望薪资", "期望月薪", "薪资要求", "expected salary"], value: (p) => p.target.salary },
  { id: "employmentType", aliases: ["工作性质", "职位类型", "求职类型", "employment type"], value: (p) => p.target.employmentType },
  { id: "skills", aliases: ["专业技能", "个人技能", "技能特长", "技能", "professional skills", "skills"], value: (p) => p.additional.skills },
  { id: "languages", aliases: ["语言能力", "外语水平", "语言技能", "language skills", "languages"], value: (p) => p.additional.languages },
  { id: "certificates", aliases: ["证书", "资格证书", "技能证书", "certificates", "certifications"], value: (p) => p.additional.certificates },
  { id: "awards", aliases: ["奖项荣誉", "获奖情况", "荣誉奖项", "所获荣誉", "awards", "honors"], value: (p) => p.additional.awards },
  { id: "selfIntroduction", aliases: ["自我评价", "自我介绍", "个人评价", "个人总结", "self introduction", "self evaluation", "summary"], value: (p) => p.additional.selfIntroduction }
];

function listValue(list: ProfileListKey, key: string) {
  return (profile: Profile, index: number): string => {
    const item = (profile[list] as unknown as Array<Record<string, string>>)[index];
    return item?.[key] ?? "";
  };
}

const experienceRules: FieldRule[] = [
  { id: "education.school", aliases: ["毕业院校", "学校名称", "就读学校", "院校名称", "学校", "院校", "university", "school", "college"], contexts: ["教育", "学历", "education"], value: listValue("education", "school") },
  { id: "education.major", aliases: ["专业名称", "所学专业", "主修专业", "专业", "major", "field of study"], contexts: ["教育", "学历", "education"], value: listValue("education", "major") },
  { id: "education.degree", aliases: ["最高学历", "学历层次", "学历", "学位", "degree", "education level"], contexts: ["教育", "education"], value: listValue("education", "degree") },
  { id: "education.startDate", aliases: ["入学时间", "入学日期", "教育开始时间", "start date"], contexts: ["教育", "院校", "education"], value: listValue("education", "startDate") },
  { id: "education.endDate", aliases: ["毕业时间", "预计毕业时间", "毕业日期", "教育结束时间", "end date"], contexts: ["教育", "院校", "education"], value: listValue("education", "endDate") },
  { id: "education.gpa", aliases: ["平均绩点", "绩点", "gpa", "grade point"], contexts: ["教育", "成绩", "education"], value: listValue("education", "gpa") },
  { id: "education.rank", aliases: ["专业排名", "年级排名", "成绩排名", "rank", "ranking"], contexts: ["教育", "成绩", "education"], value: listValue("education", "rank") },
  { id: "education.description", aliases: ["主修课程", "教育经历描述", "在校情况", "教育描述", "education description"], contexts: ["教育", "education"], value: listValue("education", "description") },

  { id: "work.company", aliases: ["公司名称", "实习单位", "工作单位", "雇主", "公司", "company", "employer"], contexts: ["实习", "工作", "职业", "work", "internship"], value: listValue("work", "company") },
  { id: "work.department", aliases: ["所在部门", "实习部门", "部门名称", "部门", "department"], contexts: ["实习", "工作", "work"], value: listValue("work", "department") },
  { id: "work.role", aliases: ["职位名称", "实习职位", "工作职位", "岗位名称", "担任职位", "job title", "role"], contexts: ["实习", "工作", "work"], value: listValue("work", "role") },
  { id: "work.startDate", aliases: ["入职时间", "实习开始时间", "工作开始时间", "employment start", "start date"], contexts: ["实习", "工作", "work"], value: listValue("work", "startDate") },
  { id: "work.endDate", aliases: ["离职时间", "实习结束时间", "工作结束时间", "employment end", "end date"], contexts: ["实习", "工作", "work"], value: listValue("work", "endDate") },
  { id: "work.description", aliases: ["工作内容", "实习内容", "工作描述", "岗位职责", "工作职责", "work description", "responsibilities"], contexts: ["实习", "工作", "work"], value: listValue("work", "description") },

  { id: "projects.name", aliases: ["项目名称", "项目名", "project name"], contexts: ["项目", "project"], value: listValue("projects", "name") },
  { id: "projects.role", aliases: ["项目角色", "项目职责", "担任角色", "role"], contexts: ["项目", "project"], requiresContext: true, value: listValue("projects", "role") },
  { id: "projects.startDate", aliases: ["项目开始时间", "开始日期", "start date"], contexts: ["项目", "project"], requiresContext: true, value: listValue("projects", "startDate") },
  { id: "projects.endDate", aliases: ["项目结束时间", "结束日期", "end date"], contexts: ["项目", "project"], requiresContext: true, value: listValue("projects", "endDate") },
  { id: "projects.link", aliases: ["项目链接", "项目地址", "project link", "project url"], contexts: ["项目", "project"], value: listValue("projects", "link") },
  { id: "projects.description", aliases: ["项目描述", "项目介绍", "项目内容", "project description"], contexts: ["项目", "project"], value: listValue("projects", "description") },

  { id: "campus.organization", aliases: ["组织名称", "社团名称", "学生组织", "社团", "organization"], contexts: ["校园", "社团", "学生", "campus"], value: listValue("campus", "organization") },
  { id: "campus.role", aliases: ["担任职务", "社团职务", "组织职务", "职位", "role"], contexts: ["校园", "社团", "学生", "campus"], requiresContext: true, value: listValue("campus", "role") },
  { id: "campus.startDate", aliases: ["校园经历开始时间", "开始日期", "start date"], contexts: ["校园", "社团", "学生", "campus"], requiresContext: true, value: listValue("campus", "startDate") },
  { id: "campus.endDate", aliases: ["校园经历结束时间", "结束日期", "end date"], contexts: ["校园", "社团", "学生", "campus"], requiresContext: true, value: listValue("campus", "endDate") },
  { id: "campus.description", aliases: ["校园经历描述", "社团经历描述", "活动描述", "经历描述", "description"], contexts: ["校园", "社团", "学生", "campus"], requiresContext: true, value: listValue("campus", "description") }
];

const rules = [...personalRules, ...experienceRules];
const blockingTerms = ["紧急联系人", "联系人姓名", "推荐人", "用户名", "账号", "监护人", "家庭成员"];

function normalize(value: string): string {
  return value.toLowerCase().replace(/[\s\-_—–:：()（）*\/\\.,，。]/g, "");
}

function labelText(element: Element): string {
  const values: string[] = [];
  const htmlElement = element as HTMLElement;
  const id = htmlElement.id;
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label?.textContent) values.push(label.textContent);
  }
  const parentLabel = element.closest("label");
  if (parentLabel?.textContent) values.push(parentLabel.textContent);
  for (const attr of ["aria-label", "placeholder", "name", "id", "data-field", "autocomplete", "title"]) {
    const value = element.getAttribute(attr);
    if (value) values.push(value);
  }
  const container = element.closest(".form-item, .form-group, .field, .ant-form-item, .el-form-item, [class*='formItem'], [class*='form-item']");
  const label = container?.querySelector("label, .label, [class*='label']");
  if (label?.textContent) values.push(label.textContent);
  const previous = element.previousElementSibling;
  if (previous?.textContent && previous.textContent.length < 80) values.push(previous.textContent);
  return values.join(" ").slice(0, 500);
}

function contextText(element: Element): string {
  let parent = element.parentElement;
  for (let depth = 0; parent && depth < 5; depth += 1, parent = parent.parentElement) {
    const heading = parent.querySelector(":scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > legend, :scope > [class*='title']");
    if (heading?.textContent && heading.textContent.length < 80) return heading.textContent;
  }
  return "";
}

function scoreRule(rule: FieldRule, source: string, context: string, element: FillElement): number {
  const normalizedSource = normalize(source);
  const normalizedContext = normalize(context);
  if (!normalizedSource) return 0;
  if (blockingTerms.some((term) => normalizedSource.includes(normalize(term)))) return 0;

  let score = 0;
  for (const alias of rule.aliases) {
    const target = normalize(alias);
    if (normalizedSource === target) score = Math.max(score, 0.98);
    else if (normalizedSource.startsWith(target) || normalizedSource.endsWith(target)) score = Math.max(score, 0.9);
    else if (normalizedSource.includes(target)) score = Math.max(score, target.length <= 2 ? 0.7 : 0.82);
  }

  const contextMatched = rule.contexts?.some((item) => normalizedContext.includes(normalize(item))) ?? false;
  if (rule.requiresContext && !contextMatched) return 0;
  if (contextMatched && score > 0) score = Math.min(1, score + 0.08);

  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    if (rule.id === "email" && type === "email") score = Math.max(score, 0.97);
    if (rule.id === "phone" && type === "tel") score = Math.max(score, 0.95);
    if (rule.id === "website" && type === "url") score = Math.max(score, 0.91);
  }
  return score;
}

function fieldElements(): FillElement[] {
  return Array.from(document.querySelectorAll<FillElement>("input, textarea, select, [contenteditable='true']"))
    .filter((element) => {
      if (element instanceof HTMLInputElement) {
        if (["hidden", "submit", "button", "reset", "image", "password"].includes(element.type)) return false;
      }
      const htmlElement = element as HTMLElement;
      return !htmlElement.hasAttribute("disabled") && !htmlElement.hasAttribute("readonly") && htmlElement.offsetParent !== null;
    });
}

function bestMatch(element: FillElement): { rule: FieldRule; score: number } | null {
  const source = labelText(element);
  const context = contextText(element);
  let best: { rule: FieldRule; score: number } | null = null;
  for (const rule of rules) {
    const score = scoreRule(rule, source, context, element);
    if (!best || score > best.score) best = { rule, score };
  }
  return best?.score ? best : null;
}

function currentValue(element: FillElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return element.value.trim();
  return element.textContent?.trim() ?? "";
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(element, value);
}

function selectValue(element: HTMLSelectElement, value: string): boolean {
  const target = normalize(value);
  const option = Array.from(element.options).find((item) => {
    const text = normalize(`${item.text} ${item.value}`);
    return text.length > 0 && (text === target || text.includes(target) || target.includes(text));
  });
  if (!option) return false;
  element.value = option.value;
  return true;
}

function applyValue(element: FillElement, value: string): boolean {
  if (!value) return false;
  if (element instanceof HTMLInputElement) {
    if (element.type === "radio") {
      const optionText = normalize(`${element.value} ${element.closest("label")?.textContent ?? ""}`);
      if (!optionText.includes(normalize(value))) return false;
      element.click();
      return true;
    }
    if (element.type === "checkbox" || element.type === "file") return false;
    const isYearMonth = /^\d{4}-\d{2}$/.test(value);
    const isFullDate = /^\d{4}-\d{2}-\d{2}$/.test(value);
    if ((element.type === "month" || element.type === "date") && !isYearMonth && !isFullDate) return false;
    let finalValue = value;
    if (element.type === "month") finalValue = value.slice(0, 7);
    if (element.type === "date" && isYearMonth) finalValue = `${value}-01`;
    setNativeValue(element, finalValue);
  } else if (element instanceof HTMLTextAreaElement) {
    setNativeValue(element, value);
  } else if (element instanceof HTMLSelectElement) {
    if (!selectValue(element, value)) return false;
  } else {
    element.textContent = value;
  }
  element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
  return true;
}

function highlight(element: FillElement): void {
  const htmlElement = element as HTMLElement;
  const original = htmlElement.style.boxShadow;
  const originalTransition = htmlElement.style.transition;
  htmlElement.style.transition = "box-shadow .2s ease";
  htmlElement.style.boxShadow = "0 0 0 3px rgba(31, 107, 72, .28)";
  window.setTimeout(() => {
    htmlElement.style.boxShadow = original;
    htmlElement.style.transition = originalTransition;
  }, 2200);
}

export function scanPage(minConfidence = 0.62): { detected: number; needsResume: boolean } {
  const elements = fieldElements();
  const detected = elements.filter((element) => (bestMatch(element)?.score ?? 0) >= minConfidence).length;
  const needsResume = elements.some((element) => element instanceof HTMLInputElement && element.type === "file");
  return { detected, needsResume };
}

export function fillPage(profile: Profile, settings: FillSettings): FillResult {
  const elements = fieldElements();
  const occurrences = new Map<string, number>();
  let filled = 0;
  let skipped = 0;
  let detected = 0;
  let needsResume = false;

  for (const element of elements) {
    if (element instanceof HTMLInputElement && element.type === "file") {
      needsResume = true;
      element.style.outline = "2px dashed #d28a27";
      element.style.outlineOffset = "3px";
      continue;
    }
    const match = bestMatch(element);
    if (!match || match.score < settings.minConfidence) continue;
    detected += 1;
    const currentIndex = occurrences.get(match.rule.id) ?? 0;
    occurrences.set(match.rule.id, currentIndex + 1);
    const value = match.rule.value(profile, currentIndex);
    if (!value || (settings.fillEmptyOnly && currentValue(element))) {
      skipped += 1;
      continue;
    }
    if (applyValue(element, value)) {
      filled += 1;
      if (settings.highlightFilled) highlight(element);
    } else {
      skipped += 1;
    }
  }

  return { filled, skipped, needsResume, detected };
}
