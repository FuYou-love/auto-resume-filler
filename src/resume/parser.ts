import { createEmptyProfile, createId } from "../constants";
import type {
  AdditionalInfo,
  CampusEntry,
  EducationEntry,
  ImportMode,
  JobTarget,
  ParsedResume,
  PersonalInfo,
  Profile,
  ProjectEntry,
  WorkEntry
} from "../types";
import { fileToText } from "./extract-text";

type SectionKey =
  | "header"
  | "basic"
  | "target"
  | "education"
  | "work"
  | "projects"
  | "campus"
  | "skills"
  | "languages"
  | "certificates"
  | "awards"
  | "selfIntroduction";

interface Section {
  key: SectionKey;
  lines: string[];
}

const sectionNames: Array<{ key: SectionKey; names: string[] }> = [
  { key: "basic", names: ["基本信息", "个人信息", "个人资料", "联系方式", "基本资料"] },
  { key: "target", names: ["求职意向", "意向岗位", "应聘岗位", "求职目标", "意向"] },
  { key: "education", names: ["教育经历", "教育背景", "学历背景", "学术经历", "教育情况", "教育"] },
  { key: "work", names: ["实习与工作经历", "工作与实习经历", "实习经历", "工作经历", "工作经验", "实习经验", "职业经历", "社会实践"] },
  { key: "projects", names: ["项目经历", "项目经验", "项目实践", "项目&实践经历", "项目"] },
  { key: "campus", names: ["校园经历", "在校经历", "学生工作", "社团经历", "学生活动", "校内经历"] },
  { key: "skills", names: ["专业技能", "技能特长", "个人技能", "专业能力", "技能"] },
  { key: "languages", names: ["语言能力", "外语能力", "语言水平", "外语水平", "语言"] },
  { key: "certificates", names: ["资格证书", "技能证书", "证书", "认证"] },
  { key: "awards", names: ["荣誉奖项", "获奖情况", "奖项荣誉", "所获荣誉", "奖励情况", "荣誉"] },
  { key: "selfIntroduction", names: ["自我评价", "个人总结", "自我总结", "个人简介", "个人评价", "简介"] }
];

const yearMonth = "(?:(?:19|20)\\d{2}\\s*[.\\-/年]\\s*\\d{1,2}\\s*月?|19\\d{2}|20\\d{2})";
const rangeRegex = new RegExp(`(${yearMonth})\\s*(?:[-–—~～至]|到)\\s*(${yearMonth}|至今|现在|目前|今)`, "i");
const singleDateRegex = new RegExp(yearMonth, "i");
const presentWords = ["至今", "现在", "目前", "今", "present", "now", "current"];

function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanLine(line: string): string {
  return line.replace(/^[\s\-•·*]+/, "").trim();
}

function headingKey(line: string): SectionKey | null {
  const stripped = cleanLine(line)
    .replace(/[（(【\[].*?[)）\]】]/g, "")
    .replace(/^(\d{1,2}|[一二三四五六七八九十]{1,3})\s*[.、/／\-—~]*/, "")
    .replace(/[：:]/g, "")
    .replace(/\s+/g, "");
  if (!stripped || stripped.length > 18) return null;
  for (const section of sectionNames) {
    if (section.names.some((name) => stripped === name || stripped.startsWith(name))) return section.key;
  }
  return null;
}

function splitSections(text: string): Section[] {
  const sections: Section[] = [{ key: "header", lines: [] }];
  for (const rawLine of text.split("\n")) {
    const line = cleanLine(rawLine);
    if (!line) {
      sections[sections.length - 1].lines.push("");
      continue;
    }
    const key = headingKey(line);
    if (key) {
      const inlineValue = line.split(/[：:]/).slice(1).join("：").trim();
      sections.push({ key, lines: inlineValue ? [inlineValue] : [] });
      continue;
    }
    sections[sections.length - 1].lines.push(line);
  }
  return sections;
}

function sectionText(sections: Section[], key: SectionKey): string {
  return sections.filter((section) => section.key === key).map((section) => section.lines.join("\n")).join("\n");
}

function sectionLines(sections: Section[], key: SectionKey): string[] {
  return sections.filter((section) => section.key === key).flatMap((section) => section.lines);
}

function matchOne(patterns: RegExp[], text: string): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function normalizeDate(value: string): string {
  if (!value) return "";
  if (presentWords.some((word) => value.toLowerCase().includes(word.toLowerCase()))) return "至今";
  const match = value.match(/(19|20)\d{2}/);
  const year = match ? match[0] : "";
  const month = value.match(/[.\-/年]\s*(\d{1,2})/);
  if (!year) return "";
  if (!month) return year;
  return `${year}-${month[1].padStart(2, "0")}`;
}

function findRange(text: string): { startDate: string; endDate: string; raw: string } {
  const match = text.match(rangeRegex);
  if (match) {
    return { startDate: normalizeDate(match[1]), endDate: normalizeDate(match[2]), raw: match[0] };
  }
  const singles = Array.from(text.match(new RegExp(yearMonth, "gi")) ?? []);
  return { startDate: normalizeDate(singles[0] ?? ""), endDate: normalizeDate(singles[1] ?? ""), raw: singles.join(" ") };
}

function stripDates(text: string): string {
  return text
    .replace(new RegExp(`${yearMonth}\\s*(?:[-–—~～至]|到)\\s*(?:${yearMonth}|至今|现在|目前|今)`, "gi"), " ")
    .replace(new RegExp(yearMonth, "gi"), " ")
    .replace(/[至今现在目前]{1,4}(?=\s|$)/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function descriptionFrom(block: string[], pieces: string[]): string {
  const rest = block.length > 1 ? block.slice(1) : [stripUsed(block[0] ?? "", pieces)];
  return joinDescription(rest.join("\n"));
}

function firstToken(block: string[], excluded: string[]): string {
  const tokens = (block[0] ?? "").split(/[\s|｜]+/).map((token) => token.trim()).filter(Boolean);
  for (const token of tokens) {
    if (excluded.some((word) => token.includes(word))) continue;
    if (/\d/.test(token)) continue;
    if (token.length >= 2 && token.length <= 20) return token;
  }
  return "";
}

function splitBlocks(lines: string[], isStart: (line: string) => boolean): string[][] {
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
      continue;
    }
    if (current.length && isStart(line)) {
      blocks.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length) blocks.push(current);
  return blocks;
}

function stripUsed(source: string, pieces: string[]): string {
  let result = source;
  for (const piece of pieces) {
    if (piece) result = result.replace(piece, "");
  }
  return result;
}

function joinDescription(text: string): string {
  return text
    .split("\n")
    .map((line) => cleanLine(line))
    .filter((line) => line.length > 1)
    .map((line) => line.replace(/^[•·\-*]\s*/, ""))
    .join("\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function parseHeaderTokens(lines: string[], personal: PersonalInfo): void {
  const headerText = lines.slice(0, 8).join("\n");
  const separators = /[|｜/·•、,，;；]+/;
  let nameCandidate = "";

  for (const line of lines.slice(0, 8)) {
    if (!line) continue;
    const tokens = line.split(separators).map((token) => token.trim()).filter(Boolean);
    if (tokens.length < 2) continue;
    for (const token of tokens) {
      if (!personal.email && /^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(token)) personal.email = token;
      else if (!personal.phone && /^(?:\+?86[-\s]?)?1[3-9]\d{9}$/.test(token.replace(/[\s-]/g, ""))) {
        personal.phone = token.replace(/\D/g, "").slice(-11);
      } else if (!personal.gender && /^(男|女|其他)$/.test(token)) personal.gender = token as PersonalInfo["gender"];
      else if (!personal.birthDate && /^(?:19|20)\d{2}[.\-/年]\d{1,2}(?:[.\-/月]\d{1,2})?$/.test(token)) {
        personal.birthDate = normalizeDate(token);
      } else if (!personal.location && /(?:市|省|区|州)$/.test(token) && token.length <= 8) {
        personal.location = token;
      } else if (!nameCandidate && /^[一-龥]{2,4}$/.test(token) && !/(大学|学院|简历|个人|求职|本科|硕士|博士|研究生|学士|MBA|大专|专科)/.test(token)) {
        nameCandidate = token;
      }
    }
  }

  if (!personal.fullName && nameCandidate) personal.fullName = nameCandidate;
  if (!personal.email) {
    const email = headerText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (email) personal.email = email[0];
  }
}

function parsePersonal(sections: Section[]): PersonalInfo {
  const text = sections.map((section) => section.lines.join("\n")).join("\n");
  const personal: PersonalInfo = {
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
  };

  personal.fullName = matchOne([/姓\s*名[：: ]+([^\s，,;；|｜]{2,10})/], text);
  if (!personal.fullName) {
    const headerLines = sections.filter((section) => section.key === "header").flatMap((section) => section.lines);
    for (const line of headerLines.slice(0, 6)) {
      const candidate = line.trim();
      if (!candidate || candidate.length > 12) continue;
      if (/[@\d]/.test(candidate)) continue;
      if (/(大学|学院|公司|简历|个人|求职|应聘|电话|邮箱|地址|专业|经历|技能|意向|应届|在校|本科|硕士|博士|研究生|学士|MBA|大专|专科|男|女)/.test(candidate)) continue;
      if (/^[一-龥]{2,4}$/.test(candidate) || /^[A-Za-z][A-Za-z\s.]{1,25}$/.test(candidate)) {
        personal.fullName = candidate;
        break;
      }
    }
  }
  personal.phone = (() => {
    const match = text.match(/(?:\+?86[-\s]?)?1[3-9]\d{9}/) ?? text.match(/1\d{2}[\s-]?\d{4}[\s-]?\d{4}/);
    return match ? match[0].replace(/\D/g, "").slice(-11) : "";
  })();
  personal.email = matchOne([/([\w.+-]+@[\w-]+\.[\w.-]+)/], text);
  personal.gender = (matchOne([/性\s*别[：: ]*(男|女|其他)/], text) || "") as PersonalInfo["gender"];
  personal.birthDate = normalizeDate(
    matchOne([/(?:出生(?:年月|日期)|生日|出生)[：: ]*((?:19|20)\d{2}[.\-/年]?\d{0,2}[.\-/月]?\d{0,2})/], text)
  );
  personal.location = matchOne([
    /(?:^|[|\s，,;；｜])(?:现居(?:城市|地)?|所在城市|居住地|所在地|居住城市)[：: ]*([^\s，,;；|｜]{2,10})/m,
    /(?:^|[|\s，,;；｜])城市[：: ]*([^\s，,;；|｜]{2,10})/m
  ], text);
  personal.hometown = matchOne([/(?:籍贯|生源地|户籍(?:所在地)?)[：: ]*([^\s，,;；|｜]{2,10})/], text);
  personal.address = matchOne([/(?:通讯地址|联系地址|家庭住址|住址)[：: ]*([^\n]{4,40})/], text);
  personal.postalCode = matchOne([/(?:邮政编码|邮编)[：: ]*(\d{6})/], text);
  personal.idNumber = matchOne([/(?:身份证号(?:码)?|证件号(?:码)?)[：: ]*(\d{17}[\dXx])/], text);
  personal.wechat = matchOne([/(?:微信号?|WeChat|微信)[：: ]*([A-Za-z0-9_-]{5,20})/i], text);
  const headerText = sections.filter((section) => section.key === "header").map((section) => section.lines.join("\n")).join("\n");
  personal.website = matchOne([
    /(?:个人主页|主页|博客|作品集|Github|GitHub|Gitee)[：: ]*\s*(https?:\/\/[^\s，,；;]+)/i,
    /(https?:\/\/(?:github\.com|gitee\.com|[\w.-]+\.[a-z]{2,})\/[^\s，,；;]*)/i
  ], headerText || text);

  parseHeaderTokens(sections.filter((section) => section.key === "header").flatMap((section) => section.lines), personal);
  return personal;
}

function parseTarget(sections: Section[]): JobTarget {
  const text = sectionText(sections, "target") || sectionText(sections, "header");
  const targetLines = sectionLines(sections, "target");
  const inheritedRole = targetLines.find((line) =>
    line.length <= 25 && !/(?:期望|意向|目标|薪资|城市|工作性质|求职类型)/.test(line)
  ) ?? "";

  return {
    role: matchOne([
      /(?:求职意向|意向岗位|目标岗位|应聘岗位|期望职位|意向职位)[：: ]*([^\n，,；;|｜]{2,25})/
    ], text) || cleanLine(inheritedRole),
    city: matchOne([/(?:意向城市|期望城市|期望工作地|目标城市|工作城市)[：: ]*([^\s，,;；|｜]{2,12})/], text),
    salary: matchOne([/(?:期望薪资|期望月薪|薪资要求|期望薪酬)[：: ]*([^\n，,；;]{2,15})/], text),
    employmentType: matchOne([/(?:工作性质|求职类型|职位类型|期望工作性质)[：: ]*([^\s，,;；|｜]{2,8})/], text)
  };
}

function parseEducation(sections: Section[]): EducationEntry[] {
  const lines = sectionLines(sections, "education");
  if (!lines.length) return [];
  const blocks = splitBlocks(lines, (line) => /(大学|学院|学校|University|College)/i.test(line) || rangeRegex.test(line));

  return blocks.map((block) => {
    const text = block.join("\n");
    const dates = findRange(text);
    const school = matchOne([/([^\s，,;；|｜]{2,15}(?:大学|学院|学校|University|College))/i], text);
    const degree = matchOne([/(博士研究生|硕士研究生|博士|硕士|研究生|本科|学士|大专|MBA)/], text);
    const labeledMajor = matchOne([
      /(?:所学专业|主修专业|专业名称)[：: ]*([^\s，,;；|｜]{2,20})/,
      /([^\s，,;；|｜]{2,15}(?:专业|方向))/
    ], text);
    const inlineMajor = (() => {
      const remainder = stripDates((block[0] ?? "").replace(school, " "));
      const beforeDegree = degree ? remainder.split(degree)[0] : remainder;
      const cleaned = beforeDegree
        .replace(/[0-9.\-/年月至今现在目前～~—–]/g, " ")
        .replace(/[()（）、,，;；|｜]/g, " ")
        .trim();
      if (cleaned.length < 2 || cleaned.length > 20) return "";
      const segments = cleaned.split(/\s+/).filter((part) => part.length >= 2);
      if (!segments.length) return "";
      const preferred = [...segments].reverse().find((part) => !/(大学|学院|学校)/.test(part));
      return preferred ?? segments[segments.length - 1];
    })();
    const major = labeledMajor && !/排名/.test(labeledMajor) ? labeledMajor : inlineMajor;
    const gpa = matchOne([/(?:GPA|绩点|平均绩点|平均分)[：: ]*([\d.]+(?:\s*\/\s*[\d.]+)?)/i], text);
    const rank = matchOne([/(?:专业排名|年级排名|排名)[：: ]*([^\n，,；;]{1,12})/, /(前\s*\d+%|\d+\s*\/\s*\d+)/], text).trim();
    const description = descriptionFrom(block, [school, major, degree, gpa, rank, dates.raw]);

    return {
      id: createId("education"),
      school,
      major,
      degree,
      startDate: dates.startDate,
      endDate: dates.endDate,
      gpa,
      rank,
      description
    };
  });
}

function parseWork(sections: Section[]): WorkEntry[] {
  const lines = sectionLines(sections, "work");
  if (!lines.length) return [];
  const blocks = splitBlocks(lines, (line) =>
    /(有限公司|公司|集团|科技|银行|研究院|工作室|中心|Inc|Ltd)/i.test(line) || rangeRegex.test(line));

  return blocks.map((block) => {
    const text = block.join("\n");
    const dates = findRange(text);
    const company = matchOne([/([^\s，,;；|｜]{2,20}(?:有限公司|公司|集团|银行|研究院|工作室|中心))/], text)
      || firstToken(block, ["实习生", "工程师", "经理", "专员", "助理", "主管", "分析师", "设计师", "产品经理", "运营", "顾问"]);
    const department = matchOne([/(?:部门|所属部门|所在部门)[：: ]*([^\s，,;；|｜]{2,15})/], text);
    const role = matchOne([
      /(?:职位|岗位|担任职务)[：: ]*([^\s，,;；|｜]{2,15})/,
      /([^\s，,;；|｜]{2,15}(?:实习生|工程师|经理|专员|助理|主管|分析师|设计师|产品经理|运营|顾问))/
    ], text);
    const description = descriptionFrom(block, [company, department, role, dates.raw]);

    return {
      id: createId("work"),
      company,
      department,
      role,
      startDate: dates.startDate,
      endDate: dates.endDate,
      description
    };
  });
}

function parseProjects(sections: Section[]): ProjectEntry[] {
  const lines = sectionLines(sections, "projects");
  if (!lines.length) return [];
  const blocks = splitBlocks(lines, (line) =>
    rangeRegex.test(line) || /(?:项目名?称?)[：:]/.test(line) || /(系统|平台|小程序|网站|APP|App|工具|引擎)$/.test(line));

  return blocks.map((block) => {
    const text = block.join("\n");
    const dates = findRange(text);
    const role = matchOne([
      /(?:担任角色|项目角色|角色)[：: ]*([^\s，,;；|｜]{2,15})/,
      /([^\s，,;；|｜]{2,10}(?:开发者|负责人|成员|组长|发起人))/
    ], text);
    const link = matchOne([/(https?:\/\/[^\s，,；;]+)/], text);
    const labeledName = matchOne([/(?:项目名?称?)[：: ]*([^\n，,；;]{2,30})/], text);
    const name = (() => {
      if (labeledName) return labeledName;
      const cleaned = stripDates(block[0] ?? "")
        .replace(link, " ")
        .replace(role, " ")
        .replace(/[()（）、,，;；|｜]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return cleaned.slice(0, 30);
    })();
    const description = descriptionFrom(block, [name, role, link, dates.raw]);

    return {
      id: createId("projects"),
      name,
      role,
      startDate: dates.startDate,
      endDate: dates.endDate,
      link,
      description
    };
  });
}

function parseCampus(sections: Section[]): CampusEntry[] {
  const lines = sectionLines(sections, "campus");
  if (!lines.length) return [];
  const blocks = splitBlocks(lines, (line) =>
    /(学生会|社团|协会|团委|志愿者|俱乐部|班级|班委)/.test(line) || rangeRegex.test(line));

  return blocks.map((block) => {
    const text = block.join("\n");
    const dates = findRange(text);
    const organization = matchOne([/([^\s，,;；|｜]{2,20}(?:学生会|社团|协会|团委|志愿者|俱乐部|中心))/], text);
    const role = matchOne([
      /(?:担任职务|职务|职位)[：: ]*([^\s，,;；|｜]{2,12})/,
      /([^\s，,;；|｜]{2,8}(?:副部长|部长|副主席|主席|干事|负责人|秘书|委员|班长|团支书))/,
      /(副部长|部长|副主席|主席|干事|负责人|秘书|委员|班长|团支书)/
    ], text);
    const description = descriptionFrom(block, [organization, role, dates.raw]);

    return {
      id: createId("campus"),
      organization,
      role,
      startDate: dates.startDate,
      endDate: dates.endDate,
      description
    };
  });
}

function parseAdditional(sections: Section[]): AdditionalInfo {
  const pick = (key: SectionKey, fallbackPattern?: RegExp): string => {
    const fromSection = joinDescription(sectionText(sections, key));
    if (fromSection) return fromSection;
    if (!fallbackPattern) return "";
    const text = sections.map((section) => section.lines.join("\n")).join("\n");
    const match = text.match(fallbackPattern);
    return match?.[1]?.trim() ?? "";
  };

  return {
    skills: pick("skills", /(?:专业技能|技能特长|技能)[：: ]*([^\n]{4,200})/),
    languages: pick("languages", /(?:语言能力|外语水平)[：: ]*([^\n]{2,120})/),
    certificates: pick("certificates", /(?:证书|资格证书)[：: ]*([^\n]{2,200})/),
    awards: pick("awards", /(?:荣誉奖项|获奖情况)[：: ]*([^\n]{2,200})/),
    selfIntroduction: pick("selfIntroduction", /(?:自我评价|个人总结)[：: ]*([^\n]{4,400})/)
  };
}

function nameFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const parts = base.split(/[\s\-_—–·|｜]+/).filter(Boolean);
  for (const part of parts) {
    if (/^[一-龥]{2,4}$/.test(part) && !/(大学|学院|简历|个人|求职|本科|硕士|博士|研究生|学士|测试|最终|新版)/.test(part)) {
      return part;
    }
  }
  return "";
}

export function parseResumeText(text: string, fileName = ""): ParsedResume {
  const sections = splitSections(normalizeText(text));
  const personal = parsePersonal(sections);
  if (!personal.fullName) personal.fullName = nameFromFileName(fileName);
  const education = parseEducation(sections);
  const work = parseWork(sections);
  const projects = parseProjects(sections);
  const campus = parseCampus(sections);
  const additional = parseAdditional(sections);

  const warnings: string[] = [];
  if (!personal.fullName) warnings.push("未识别到姓名，请在导入后手动确认");
  if (!personal.phone) warnings.push("未识别到手机号");
  if (!personal.email) warnings.push("未识别到邮箱");
  if (!education.length) warnings.push("未识别到教育经历，请检查简历是否有“教育经历”标题");
  if (!work.length && !projects.length) warnings.push("未识别到实习或项目经历");

  return {
    resumeName: fileName,
    personal,
    target: parseTarget(sections),
    education,
    work,
    projects,
    campus,
    additional,
    warnings
  };
}

export async function parseResumeFile(file: File): Promise<ParsedResume> {
  const text = await fileToText(file);
  if (!text.trim()) throw new Error("未能从文件中提取到文字，扫描版图片 PDF 需要手动填写");
  return parseResumeText(text, file.name);
}

export interface ImportStats {
  added: number;
  updated: number;
  skipped: number;
}

export function importStats(profile: Profile, parsed: ParsedResume, mode: ImportMode): ImportStats {
  const stats: ImportStats = { added: 0, updated: 0, skipped: 0 };
  const overwrite = mode !== "merge";

  const count = (current: string, incoming: string): void => {
    if (!incoming) return;
    if (mode === "reset") {
      stats.updated += 1;
      return;
    }
    if (!current) stats.added += 1;
    else if (overwrite) stats.updated += 1;
    else stats.skipped += 1;
  };

  for (const key of Object.keys(profile.personal) as Array<keyof PersonalInfo>) count(profile.personal[key], parsed.personal[key]);
  for (const key of Object.keys(profile.target) as Array<keyof JobTarget>) count(profile.target[key], parsed.target[key]);
  for (const key of Object.keys(profile.additional) as Array<keyof AdditionalInfo>) count(profile.additional[key], parsed.additional[key]);

  const countList = (current: unknown[], incoming: unknown[]): void => {
    if (!incoming.length) return;
    if (mode === "reset") {
      stats.updated += incoming.length;
      return;
    }
    if (!current.length) stats.added += incoming.length;
    else if (overwrite) stats.updated += incoming.length;
    else stats.skipped += incoming.length;
  };

  countList(profile.education, parsed.education);
  countList(profile.work, parsed.work);
  countList(profile.projects, parsed.projects);
  countList(profile.campus, parsed.campus);

  return stats;
}

export function mergeResumeIntoProfile(profile: Profile, parsed: ParsedResume, mode: ImportMode): Profile {
  const effectiveMode: "merge" | "overwrite" = mode === "merge" ? "merge" : "overwrite";
  const base: Profile = mode === "reset"
    ? { ...createEmptyProfile(profile.name), id: profile.id, name: profile.name }
    : profile;

  const assign = (current: string, incoming: string): string => {
    if (!incoming) return current;
    return effectiveMode === "overwrite" || !current ? incoming : current;
  };

  const personal = { ...base.personal };
  for (const key of Object.keys(personal) as Array<keyof PersonalInfo>) {
    personal[key] = assign(personal[key], parsed.personal[key]) as never;
  }

  const target = { ...base.target };
  for (const key of Object.keys(target) as Array<keyof JobTarget>) {
    target[key] = assign(target[key], parsed.target[key]);
  }

  const additional = { ...base.additional };
  for (const key of Object.keys(additional) as Array<keyof AdditionalInfo>) {
    additional[key] = assign(additional[key], parsed.additional[key]);
  }

  const appendList = <T extends { id: string }>(current: T[], incoming: T[]): T[] => {
    if (!incoming.length) return current;
    if (effectiveMode === "overwrite") return incoming;
    const keys = new Set(current.map((item) => JSON.stringify(Object.values(item).slice(1, 3))));
    const unique = incoming.filter((item) => !keys.has(JSON.stringify(Object.values(item).slice(1, 3))));
    return [...current, ...unique];
  };

  return {
    ...base,
    personal,
    target,
    additional,
    education: appendList(base.education, parsed.education),
    work: appendList(base.work, parsed.work),
    projects: appendList(base.projects, parsed.projects),
    campus: appendList(base.campus, parsed.campus),
    resumeName: mode === "merge" ? (base.resumeName || parsed.resumeName) : (parsed.resumeName || base.resumeName),
    updatedAt: Date.now()
  };
}
