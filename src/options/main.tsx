import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  Copy,
  FileCheck2,
  FileText,
  GraduationCap,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  UsersRound,
  WandSparkles
} from "lucide-react";
import { CITY_OPTIONS, createEmptyProfile, createId, profileCompletion } from "../constants";
import { getActiveProfile, getState, saveState } from "../storage";
import type { AppState, Profile } from "../types";
import { ResumeImport } from "./resume-import";
import "../base.css";
import "./options.css";

type ExperienceCategory = "education" | "work" | "projects" | "campus";
type FieldKind = "text" | "date" | "textarea";

interface ExperienceConfig {
  key: ExperienceCategory;
  title: string;
  description: string;
  empty: Record<string, string>;
  fields: Array<{ key: string; label: string; placeholder?: string; kind?: FieldKind; wide?: boolean }>;
}

const experienceConfigs: ExperienceConfig[] = [
  {
    key: "education",
    title: "教育经历",
    description: "建议按时间倒序填写，自动匹配院校、专业和学历字段。",
    empty: { school: "", major: "", degree: "", startDate: "", endDate: "", gpa: "", rank: "", description: "" },
    fields: [
      { key: "school", label: "学校", placeholder: "如：浙江大学" },
      { key: "major", label: "专业", placeholder: "如：计算机科学与技术" },
      { key: "degree", label: "学历", placeholder: "如：本科" },
      { key: "gpa", label: "GPA / 绩点", placeholder: "如：3.8 / 4.0" },
      { key: "startDate", label: "入学时间", kind: "date" },
      { key: "endDate", label: "毕业时间", kind: "date" },
      { key: "rank", label: "专业排名", placeholder: "如：前 10%" },
      { key: "description", label: "主修课程与亮点", kind: "textarea", wide: true, placeholder: "课程、奖学金、成绩亮点等" }
    ]
  },
  {
    key: "work",
    title: "实习 / 工作经历",
    description: "记录公司、岗位和职责，描述中可使用 STAR 法则。",
    empty: { company: "", department: "", role: "", startDate: "", endDate: "", description: "" },
    fields: [
      { key: "company", label: "公司", placeholder: "公司名称" },
      { key: "department", label: "部门", placeholder: "所在部门" },
      { key: "role", label: "职位", placeholder: "如：产品实习生" },
      { key: "startDate", label: "开始时间", kind: "date" },
      { key: "endDate", label: "结束时间", kind: "date" },
      { key: "description", label: "工作内容与成果", kind: "textarea", wide: true, placeholder: "负责什么、如何完成、取得什么结果" }
    ]
  },
  {
    key: "projects",
    title: "项目经历",
    description: "填写项目背景、个人角色、关键动作和量化结果。",
    empty: { name: "", role: "", startDate: "", endDate: "", link: "", description: "" },
    fields: [
      { key: "name", label: "项目名称", placeholder: "项目名称" },
      { key: "role", label: "担任角色", placeholder: "如：核心开发者" },
      { key: "startDate", label: "开始时间", kind: "date" },
      { key: "endDate", label: "结束时间", kind: "date" },
      { key: "link", label: "项目链接", placeholder: "https://...", wide: true },
      { key: "description", label: "项目描述", kind: "textarea", wide: true, placeholder: "项目目标、你的贡献和最终结果" }
    ]
  },
  {
    key: "campus",
    title: "校园经历",
    description: "学生组织、社团、志愿活动等经历。",
    empty: { organization: "", role: "", startDate: "", endDate: "", description: "" },
    fields: [
      { key: "organization", label: "组织名称", placeholder: "学院学生会 / 社团" },
      { key: "role", label: "担任职务", placeholder: "如：部长" },
      { key: "startDate", label: "开始时间", kind: "date" },
      { key: "endDate", label: "结束时间", kind: "date" },
      { key: "description", label: "经历描述", kind: "textarea", wide: true, placeholder: "职责、活动与成果" }
    ]
  }
];

function TextField({ label, value, onChange, placeholder, type = "text", textarea = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className={`field ${value ? "has-value" : ""}`}>
      <span className="field-label">{label}</span>
      {textarea ? (
        <textarea className="textarea" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="input" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function MonthField({ label, value, onChange, from = 1975, to = new Date().getFullYear() + 6, allowPresent = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  from?: number;
  to?: number;
  allowPresent?: boolean;
}) {
  const isPresent = value === "至今";
  const [year, month] = !isPresent && /^\d{4}-\d{2}/.test(value) ? value.split("-") : ["", ""];
  const years = Array.from({ length: to - from + 1 }, (_, index) => to - index);

  return (
    <div className={`field ${value ? "has-value" : ""}`}>
      <span className="field-label">{label}</span>
      <div className="date-row">
        <select
          className="select"
          value={year}
          disabled={isPresent}
          onChange={(event) => onChange(event.target.value ? `${event.target.value}-${month || "01"}` : "")}
        >
          <option value="">选择年份</option>
          {years.map((item) => <option key={item} value={String(item)}>{item} 年</option>)}
        </select>
        <select
          className="select"
          value={month}
          disabled={isPresent || !year}
          onChange={(event) => onChange(year ? `${year}-${event.target.value}` : "")}
        >
          <option value="">月份</option>
          {Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => (
            <option key={item} value={item}>{Number(item)} 月</option>
          ))}
        </select>
        {allowPresent && (
          <label className="present-toggle">
            <input
              type="checkbox"
              checked={isPresent}
              onChange={(event) => onChange(event.target.checked ? "至今" : (year ? `${year}-${month || "01"}` : ""))}
            />
            至今
          </label>
        )}
      </div>
    </div>
  );
}

function LocationField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState(() => Boolean(value) && !CITY_OPTIONS.includes(value));
  const options = value && !CITY_OPTIONS.includes(value) ? [value, ...CITY_OPTIONS] : CITY_OPTIONS;

  return (
    <div className={`field ${value ? "has-value" : ""}`}>
      <span className="field-label">{label}</span>
      {custom ? (
        <div className="city-row">
          <input className="input" value={value} placeholder="手动输入城市 / 地区" onChange={(event) => onChange(event.target.value)} />
          <button type="button" className="link-btn" onClick={() => { setCustom(false); onChange(""); }}>从列表选择</button>
        </div>
      ) : (
        <select
          className="select"
          value={value}
          onChange={(event) => {
            if (event.target.value === "__custom__") {
              setCustom(true);
              onChange("");
              return;
            }
            onChange(event.target.value);
          }}
        >
          <option value="">暂不填写</option>
          {options.map((city) => <option key={city} value={city}>{city}</option>)}
          <option value="__custom__">其他（手动输入）</option>
        </select>
      )}
    </div>
  );
}

function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [saved, setSaved] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const hydrated = useRef(false);
  const autoRename = useRef(false);
  const resumeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getState().then((next) => {
      setState(next);
      window.setTimeout(() => { hydrated.current = true; }, 0);
    });
  }, []);

  useEffect(() => {
    if (!state || !hydrated.current) return;
    setSaved(false);
    const timer = window.setTimeout(async () => {
      await saveState(state);
      setSaved(true);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [state]);

  const profile = useMemo(() => state ? getActiveProfile(state) : null, [state]);

  useEffect(() => {
    if (autoRename.current) {
      autoRename.current = false;
      return;
    }
    setRenaming(false);
  }, [state?.activeProfileId]);

  const startRename = () => {
    if (!profile) return;
    setDraftName(profile.name);
    setRenaming(true);
  };

  const commitRename = () => {
    const name = draftName.trim();
    if (name) setActive((item) => ({ ...item, name }));
    setRenaming(false);
  };

  const setActive = (mutate: (profile: Profile) => Profile) => {
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        profiles: current.profiles.map((item) => item.id === current.activeProfileId
          ? { ...mutate(item), updatedAt: Date.now() }
          : item)
      };
    });
  };

  const updateSection = (section: "personal" | "target" | "additional", key: string, value: string) => {
    setActive((current) => ({
      ...current,
      [section]: { ...current[section], [key]: value }
    }));
  };

  const updateExperience = (category: ExperienceCategory, id: string, key: string, value: string) => {
    setActive((current) => {
      const entries = current[category] as unknown as Array<Record<string, string>>;
      return {
        ...current,
        [category]: entries.map((entry) => entry.id === id ? { ...entry, [key]: value } : entry)
      } as Profile;
    });
  };

  const addExperience = (config: ExperienceConfig) => {
    setActive((current) => ({
      ...current,
      [config.key]: [...(current[config.key] as unknown as Array<Record<string, string>>), { id: createId(config.key), ...config.empty }]
    } as Profile));
  };

  const removeExperience = (category: ExperienceCategory, id: string) => {
    setActive((current) => ({
      ...current,
      [category]: (current[category] as unknown as Array<Record<string, string>>).filter((entry) => entry.id !== id)
    } as Profile));
  };

  const createProfile = () => {
    if (!state) return;
    const next = createEmptyProfile(`求职档案 ${state.profiles.length + 1}`);
    setState({ ...state, profiles: [...state.profiles, next], activeProfileId: next.id });
    autoRename.current = true;
    setDraftName(next.name);
    setRenaming(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const duplicateProfile = () => {
    if (!state || !profile) return;
    const copyProfile: Profile = JSON.parse(JSON.stringify(profile));
    copyProfile.id = createId("profile");
    copyProfile.name = `${profile.name} 副本`;
    copyProfile.updatedAt = Date.now();
    for (const key of ["education", "work", "projects", "campus"] as const) {
      copyProfile[key] = copyProfile[key].map((entry) => ({ ...entry, id: createId(key) })) as never;
    }
    setState({ ...state, profiles: [...state.profiles, copyProfile], activeProfileId: copyProfile.id });
  };

  const deleteProfile = () => {
    if (!state || !profile || state.profiles.length === 1) return;
    if (!window.confirm(`确定删除“${profile.name}”吗？此操作无法撤销。`)) return;
    const profiles = state.profiles.filter((item) => item.id !== profile.id);
    setState({ ...state, profiles, activeProfileId: profiles[0].id });
  };

  if (!state || !profile) {
    return <div className="loading"><Sparkles size={22} /> 正在加载本地资料…</div>;
  }

  const completion = profileCompletion(profile);
  const experienceCount = profile.education.length + profile.work.length + profile.projects.length + profile.campus.length;
  const contactCount = [profile.personal.fullName, profile.personal.phone, profile.personal.email, profile.personal.location].filter(Boolean).length;
  const ringStyle = { "--progress": `${completion * 3.6}deg` } as React.CSSProperties;

  return (
    <div className="options-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={19} /></div>
          <div><strong>OfferPilot</strong><span>APPLICATION COPILOT</span></div>
        </div>
        <div className="workspace-label"><span>WORKSPACE</span><strong>求职资料中心</strong></div>
        <nav>
          <span className="nav-label">核心资料</span>
          <a href="#basic"><CircleUserRound size={17} /><span>基本信息</span><ChevronRight size={14} /></a>
          <a href="#target"><Target size={17} /><span>求职意向</span><ChevronRight size={14} /></a>
          <span className="nav-label nav-label-spaced">履历资产</span>
          <a href="#education"><GraduationCap size={17} /><span>教育经历</span><ChevronRight size={14} /></a>
          <a href="#work"><BriefcaseBusiness size={17} /><span>实习经历</span><ChevronRight size={14} /></a>
          <a href="#projects"><BookOpen size={17} /><span>项目经历</span><ChevronRight size={14} /></a>
          <a href="#campus"><UsersRound size={17} /><span>校园经历</span><ChevronRight size={14} /></a>
          <a href="#additional"><Award size={17} /><span>能力与其他</span><ChevronRight size={14} /></a>
          <span className="nav-label nav-label-spaced">插件设置</span>
          <a href="#preferences"><Settings2 size={17} /><span>填写偏好</span><ChevronRight size={14} /></a>
        </nav>
        <div className="privacy-note">
          <div className="privacy-icon"><ShieldCheck size={17} /></div>
          <div><strong>隐私模式已开启</strong><span>所有资料仅保存在当前设备</span></div>
        </div>
        <div className="sidebar-version"><span>OfferPilot</span><span>v0.1</span></div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="page-heading">
            <span className="eyebrow"><i /> PROFILE WORKSPACE</span>
            <h1>把重复填写，交给 OfferPilot</h1>
            <p>维护一份完整档案，在不同网申页面快速复用。</p>
          </div>
          <div className="top-actions">
            <div className="local-badge"><LockKeyhole size={14} />本地存储</div>
            <div className={`save-state ${saved ? "is-saved" : "is-saving"}`}>{saved ? <><Check size={15} /> 所有更改已保存</> : <><Save size={15} /> 正在保存</>}</div>
          </div>
        </header>

        <section className="profile-hero">
          <div className="hero-grid" />
          <div className="hero-glow" />
          <div className="hero-main">
            <div className="hero-label"><span>ACTIVE PROFILE</span><i>正在使用</i></div>
            <div className="hero-title-row">
              <div>
                {renaming ? (
                  <input
                    className="hero-name-input"
                    autoFocus
                    value={draftName}
                    placeholder="档案名称"
                    onChange={(event) => setDraftName(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") setRenaming(false);
                    }}
                  />
                ) : (
                  <button type="button" className="hero-name-button" onClick={startRename} title="点击重命名档案">
                    {profile.name}<Pencil size={14} />
                  </button>
                )}
                <div className="profile-chips">
                  <span><Target size={13} />{profile.target.role || "待设置期望职位"}</span>
                  <span><MapPin size={13} />{profile.target.city || profile.personal.location || "待设置城市"}</span>
                </div>
              </div>
              <div className="hero-actions">
                <button title="重命名档案" onClick={startRename}><Pencil size={17} /></button>
                <button title="复制档案" onClick={duplicateProfile}><Copy size={17} /></button>
                <button className="hero-danger" title="删除档案" disabled={state.profiles.length === 1} onClick={deleteProfile}><Trash2 size={17} /></button>
              </div>
            </div>
            <div className="profile-switcher">
              <div className="hero-select-wrap">
                <span>切换档案</span>
                <select value={state.activeProfileId} onChange={(event) => setState({ ...state, activeProfileId: event.target.value })}>
                  {state.profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <button className="hero-new-button" onClick={createProfile}><Plus size={16} />新建求职档案</button>
            </div>
          </div>
          <div className="completion-panel">
            <div className="completion-ring" style={ringStyle}>
              <div><strong>{completion}<small>%</small></strong><span>资料完整度</span></div>
            </div>
            <div className="completion-detail">
              <strong>{completion >= 80 ? "已经准备得很充分" : "继续完善你的档案"}</strong>
              <span>{completion >= 80 ? "可以开始高效投递" : "完整资料能匹配更多字段"}</span>
            </div>
          </div>
        </section>

        <section className="overview-grid" aria-label="档案概览">
          <article><div className="stat-icon mint"><CircleUserRound size={18} /></div><div><span>关键信息</span><strong>{contactCount}<small> / 4 项</small></strong></div><em className={contactCount === 4 ? "done" : ""}>{contactCount === 4 ? "已就绪" : "待完善"}</em></article>
          <article><div className="stat-icon lilac"><Building2 size={18} /></div><div><span>履历条目</span><strong>{experienceCount}<small> 段</small></strong></div><em>{experienceCount ? "可复用" : "待添加"}</em></article>
          <article><div className="stat-icon sand"><FileCheck2 size={18} /></div><div><span>常用简历</span><strong className="stat-text">{profile.resumeName ? "已关联" : "未添加"}</strong></div><em className={profile.resumeName ? "done" : ""}>{profile.resumeName ? "已就绪" : "待添加"}</em></article>
          <article><div className="stat-icon blue"><WandSparkles size={18} /></div><div><span>智能填写</span><strong className="stat-text">已启用</strong></div><em className="done">运行中</em></article>
        </section>

        <ResumeImport profile={profile} onApply={setActive} />

        <nav className="section-jumpbar" aria-label="快速跳转">
          <span>快速定位</span>
          <a href="#resume-import">简历导入</a>
          <a href="#basic">基本信息</a><a href="#target">求职意向</a><a href="#education">教育</a><a href="#work">实习</a><a href="#projects">项目</a><a href="#campus">校园</a><a href="#additional">能力</a><a href="#preferences">偏好</a>
        </nav>

        <section className="form-section" id="basic">
          <div className="section-heading"><div><span>01</span><h2>基本信息</h2><p>高频联系信息与个人资料</p></div></div>
          <div className="form-grid">
            <TextField label="档案名称" value={profile.name} placeholder="如：产品岗 · 上海" onChange={(name) => setActive((item) => ({ ...item, name }))} />
            <TextField label="姓名" value={profile.personal.fullName} placeholder="你的姓名" onChange={(value) => updateSection("personal", "fullName", value)} />
            <TextField label="手机号码" value={profile.personal.phone} placeholder="11 位手机号" type="tel" onChange={(value) => updateSection("personal", "phone", value)} />
            <TextField label="邮箱" value={profile.personal.email} placeholder="name@example.com" type="email" onChange={(value) => updateSection("personal", "email", value)} />
            <label className={`field ${profile.personal.gender ? "has-value" : ""}`}><span className="field-label">性别</span><select className="select" value={profile.personal.gender} onChange={(event) => updateSection("personal", "gender", event.target.value)}><option value="">暂不填写</option><option>男</option><option>女</option><option>其他</option></select></label>
            <MonthField label="出生年月" value={profile.personal.birthDate} from={1950} to={new Date().getFullYear()} onChange={(value) => updateSection("personal", "birthDate", value)} />
            <LocationField label="现居城市" value={profile.personal.location} onChange={(value) => updateSection("personal", "location", value)} />
            <LocationField label="籍贯" value={profile.personal.hometown} onChange={(value) => updateSection("personal", "hometown", value)} />
            <TextField label="详细地址" value={profile.personal.address} placeholder="省市区与街道地址" onChange={(value) => updateSection("personal", "address", value)} />
            <TextField label="邮政编码" value={profile.personal.postalCode} placeholder="邮编" onChange={(value) => updateSection("personal", "postalCode", value)} />
            <TextField label="证件号码" value={profile.personal.idNumber} placeholder="仅存储在本机" onChange={(value) => updateSection("personal", "idNumber", value)} />
            <TextField label="微信号" value={profile.personal.wechat} placeholder="微信号" onChange={(value) => updateSection("personal", "wechat", value)} />
            <div className="wide"><TextField label="个人主页 / 作品集" value={profile.personal.website} placeholder="https://..." onChange={(value) => updateSection("personal", "website", value)} /></div>
          </div>
        </section>

        <section className="form-section" id="target">
          <div className="section-heading"><div><span>02</span><h2>求职意向</h2><p>不同方向可以创建多套档案</p></div></div>
          <div className="form-grid">
            <TextField label="期望职位" value={profile.target.role} placeholder="如：前端开发工程师" onChange={(value) => updateSection("target", "role", value)} />
            <LocationField label="期望城市" value={profile.target.city} onChange={(value) => updateSection("target", "city", value)} />
            <TextField label="期望薪资" value={profile.target.salary} placeholder="如：15k-20k" onChange={(value) => updateSection("target", "salary", value)} />
            <TextField label="工作性质" value={profile.target.employmentType} placeholder="全职 / 实习" onChange={(value) => updateSection("target", "employmentType", value)} />
          </div>
        </section>

        {experienceConfigs.map((config, configIndex) => {
          const entries = profile[config.key] as unknown as Array<Record<string, string>>;
          return (
            <section className="form-section" id={config.key} key={config.key}>
              <div className="section-heading">
                <div><span>0{configIndex + 3}</span><h2>{config.title}</h2><p>{config.description}</p></div>
                <button className="btn btn-secondary" onClick={() => addExperience(config)}><Plus size={16} />添加一段</button>
              </div>
              {entries.length === 0 ? (
                <button className="empty-card" onClick={() => addExperience(config)}><Plus size={20} /><strong>添加{config.title}</strong><span>点击开始完善这部分资料</span></button>
              ) : entries.map((entry, index) => (
                <article className="experience-card" key={entry.id}>
                  <div className="card-head"><strong>{config.title} {index + 1}</strong><button className="icon-btn" title="删除" onClick={() => removeExperience(config.key, entry.id)}><Trash2 size={16} /></button></div>
                  <div className="form-grid">
                    {config.fields.map((field) => (
                      <div className={field.wide ? "wide" : ""} key={field.key}>
                        {field.kind === "date" ? (
                          <MonthField
                            label={field.label}
                            value={entry[field.key] ?? ""}
                            from={1990}
                            allowPresent={field.key === "endDate"}
                            onChange={(value) => updateExperience(config.key, entry.id, field.key, value)}
                          />
                        ) : (
                          <TextField
                            label={field.label}
                            value={entry[field.key] ?? ""}
                            placeholder={field.placeholder}
                            textarea={field.kind === "textarea"}
                            onChange={(value) => updateExperience(config.key, entry.id, field.key, value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </section>
          );
        })}

        <section className="form-section" id="additional">
          <div className="section-heading"><div><span>07</span><h2>能力与其他</h2><p>用换行或顿号分隔多项内容</p></div></div>
          <div className="form-grid">
            <TextField label="专业技能" value={profile.additional.skills} placeholder="JavaScript、Python、Figma…" textarea onChange={(value) => updateSection("additional", "skills", value)} />
            <TextField label="语言能力" value={profile.additional.languages} placeholder="英语 CET-6、日语 N2…" textarea onChange={(value) => updateSection("additional", "languages", value)} />
            <TextField label="证书" value={profile.additional.certificates} placeholder="职业资格与技能证书" textarea onChange={(value) => updateSection("additional", "certificates", value)} />
            <TextField label="奖项荣誉" value={profile.additional.awards} placeholder="奖学金、竞赛奖项等" textarea onChange={(value) => updateSection("additional", "awards", value)} />
            <div className="wide"><TextField label="自我评价" value={profile.additional.selfIntroduction} placeholder="简明介绍你的优势、能力和求职动机" textarea onChange={(value) => updateSection("additional", "selfIntroduction", value)} /></div>
          </div>
        </section>

        <section className="form-section" id="preferences">
          <div className="section-heading"><div><span>08</span><h2>填写偏好</h2><p>控制自动填写行为与简历提示</p></div></div>
          <div className="preference-list">
            <label className="toggle-row"><div><strong>只填写空白字段</strong><span>保留你已经在网页上填写的内容</span></div><input type="checkbox" checked={state.settings.fillEmptyOnly} onChange={(event) => setState({ ...state, settings: { ...state.settings, fillEmptyOnly: event.target.checked } })} /><i /></label>
            <label className="toggle-row"><div><strong>高亮已填写字段</strong><span>短暂标记插件成功填写的内容，方便复核</span></div><input type="checkbox" checked={state.settings.highlightFilled} onChange={(event) => setState({ ...state, settings: { ...state.settings, highlightFilled: event.target.checked } })} /><i /></label>
            <div className="resume-row">
              <div className="resume-icon"><FileText size={20} /></div>
              <div className="resume-copy"><strong>常用简历</strong><span>{profile.resumeName || "尚未选择文件"}</span><small>出于浏览器安全限制，仅记住文件名；网申时仍需你确认并选择文件。</small></div>
              <input ref={resumeInput} hidden type="file" accept=".pdf,.doc,.docx" onChange={(event) => setActive((item) => ({ ...item, resumeName: event.target.files?.[0]?.name ?? "" }))} />
              <button className="btn btn-secondary" onClick={() => resumeInput.current?.click()}><Upload size={16} />选择文件</button>
            </div>
          </div>
        </section>

        <footer className="page-footer">
          <div><ShieldCheck size={18} /><span><strong>你的资料，只属于你</strong>内容始终保存在当前浏览器本地</span></div>
          <div className="footer-status"><i /> AUTO SAVE ENABLED</div>
        </footer>
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  import("react-dom/client").then(({ createRoot }) => createRoot(root).render(<App />));
}
