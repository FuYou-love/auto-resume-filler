import { createEmptyProfile } from "../src/constants";
import { mergeResumeIntoProfile, parseResumeText } from "../src/resume/parser";

const sample = `王小明
男 | 2002.05 | 13812345678 | wangxm@example.com | 杭州市

求职意向：前端开发工程师
期望城市：上海 / 杭州
期望薪资：15k-20k

教育经历
浙江大学 计算机科学与技术 本科 2020.09 - 2024.06
主修课程：数据结构、操作系统、计算机网络
专业排名：前 10%，GPA 3.8/4.0

实习经历
腾讯科技有限公司 前端开发实习生 2023.06 - 2023.12
负责微信小程序开发，使用 React 重构活动页，首屏加载下降 40%

字节跳动 前端实习生 2022.07 - 2022.10
参与内部管理后台开发

项目经历
在线协作白板系统 核心开发者 2023.03 - 2023.06
https://github.com/demo/whiteboard
基于 Canvas 实现多人协作绘图

校园经历
计算机学院学生会 宣传部部长 2021.09 - 2022.09
组织学院迎新晚会，负责宣传物料设计

专业技能
JavaScript、TypeScript、React、Vue、Node.js

语言能力
英语 CET-6，可进行日常工作沟通

证书
全国计算机等级考试四级

荣誉奖项
校级一等奖学金、ACM 校赛二等奖

自我评价
具备扎实的前端基础，喜欢钻研工程化与性能优化`;

const parsed = parseResumeText(sample, "王小明-前端简历.pdf");

console.log(JSON.stringify({
  personal: parsed.personal,
  target: parsed.target,
  education: parsed.education,
  work: parsed.work.map((item) => ({ company: item.company, role: item.role, startDate: item.startDate, endDate: item.endDate, description: item.description.slice(0, 20) })),
  projects: parsed.projects.map((item) => ({ name: item.name, role: item.role, link: item.link })),
  campus: parsed.campus.map((item) => ({ organization: item.organization, role: item.role })),
  additional: parsed.additional,
  warnings: parsed.warnings
}, null, 2));

const sample2 = `李泽言
男 | 本科 | 2001.03 | 13755556666 | zeyan@example.com | 上海市

求职意向：后端开发工程师

01 教育经历 EDUCATION
复旦大学 软件学院 软件工程 硕士 2019.09 - 2022.06

02 实习经历 EXPERIENCE
美团 后端开发实习生 2021.03 - 2021.09
参与配送调度服务开发`;

const parsed2 = parseResumeText(sample2, "李泽言-后端-简历.pdf");

const problems: string[] = [];
if (parsed.personal.fullName !== "王小明") problems.push("姓名解析错误");
if (parsed.personal.fullName !== "王小明") problems.push("姓名解析错误");
if (parsed.personal.phone !== "13812345678") problems.push("手机号解析错误");
if (parsed.personal.email !== "wangxm@example.com") problems.push("邮箱解析错误");
if (parsed.target.role !== "前端开发工程师") problems.push("求职意向解析错误");
if (parsed.education.length !== 1 || parsed.education[0].school !== "浙江大学") problems.push("教育经历解析错误");
if (parsed.work.length !== 2) problems.push(`实习经历条数错误：${parsed.work.length}`);
if (parsed.projects.length !== 1) problems.push(`项目经历条数错误：${parsed.projects.length}`);
if (parsed.campus.length !== 1) problems.push(`校园经历条数错误：${parsed.campus.length}`);
if (!parsed.additional.skills.includes("React")) problems.push("技能解析错误");

if (parsed2.personal.fullName !== "李泽言") problems.push(`样例2姓名解析错误：${parsed2.personal.fullName}`);
if (parsed2.target.role !== "后端开发工程师") problems.push(`样例2求职意向解析错误：${parsed2.target.role}`);
if (parsed2.education.length !== 1 || parsed2.education[0].school !== "复旦大学" || parsed2.education[0].major !== "软件工程") {
  problems.push(`样例2教育经历解析错误：${JSON.stringify(parsed2.education[0])}`);
}
if (parsed2.work.length !== 1 || parsed2.work[0].company !== "美团") problems.push(`样例2实习经历解析错误：${JSON.stringify(parsed2.work[0])}`);

const parsed3 = parseResumeText("", "王金淼-测试.pdf");
if (parsed3.personal.fullName !== "王金淼") problems.push(`文件名兜底姓名解析错误：${parsed3.personal.fullName}`);

const base = createEmptyProfile("测试档案");
base.personal.fullName = "旧名字";
const merged = mergeResumeIntoProfile(base, parsed, "merge");
if (merged.personal.fullName !== "旧名字") problems.push("补全模式不应覆盖已填写内容");
if (!merged.personal.phone) problems.push("补全模式应补充空字段");
const overwritten = mergeResumeIntoProfile(base, parsed, "overwrite");
if (overwritten.personal.fullName !== "王小明") problems.push("覆盖模式应替换已填写内容");
const reset = mergeResumeIntoProfile({ ...base, work: [{ id: "old", company: "旧公司", department: "", role: "", startDate: "", endDate: "", description: "" }] }, parsed, "reset");
if (reset.personal.fullName !== "王小明") problems.push("清空模式应写入简历内容");
if (reset.work.length !== 2 || reset.work.some((item) => item.company === "旧公司")) problems.push("清空模式应丢弃原有经历");

if (problems.length) {
  console.error("FAILED: " + problems.join("；"));
  process.exit(1);
}
console.log("PASS: 简历文本解析冒烟测试通过");
