import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, FileUp, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import { createEmptyProfile } from "../constants";
import { importStats, mergeResumeIntoProfile, parseResumeFile } from "../resume/parser";
import type { ImportMode, ParsedResume, Profile } from "../types";

type Status = "idle" | "parsing" | "preview" | "error" | "done";

interface ImportSelection {
  basic: boolean;
  education: boolean;
  work: boolean;
  projects: boolean;
  campus: boolean;
  additional: boolean;
}

function applySelection(parsed: ParsedResume, selection: ImportSelection): ParsedResume {
  const empty = createEmptyProfile();
  return {
    ...parsed,
    personal: selection.basic ? parsed.personal : empty.personal,
    target: selection.basic ? parsed.target : empty.target,
    additional: selection.additional ? parsed.additional : empty.additional,
    education: selection.education ? parsed.education : [],
    work: selection.work ? parsed.work : [],
    projects: selection.projects ? parsed.projects : [],
    campus: selection.campus ? parsed.campus : []
  };
}

const selectionLabels: Array<{ key: keyof ImportSelection; label: string }> = [
  { key: "basic", label: "基本信息" },
  { key: "education", label: "教育经历" },
  { key: "work", label: "实习 / 工作" },
  { key: "projects", label: "项目经历" },
  { key: "campus", label: "校园经历" },
  { key: "additional", label: "技能与其他" }
];

interface ResumeImportProps {
  profile: Profile;
  onApply: (mutate: (profile: Profile) => Profile) => void;
}

function BasicChips({ parsed }: { parsed: ParsedResume }): React.ReactElement {
  const items = [
    ["姓名", parsed.personal.fullName],
    ["手机", parsed.personal.phone],
    ["邮箱", parsed.personal.email],
    ["性别", parsed.personal.gender],
    ["出生日期", parsed.personal.birthDate],
    ["现居城市", parsed.personal.location],
    ["籍贯", parsed.personal.hometown],
    ["微信号", parsed.personal.wechat],
    ["个人主页", parsed.personal.website],
    ["期望职位", parsed.target.role],
    ["期望城市", parsed.target.city]
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;

  if (!items.length) return <p className="preview-empty">未能识别到基础信息，可直接手动补充。</p>;

  return (
    <div className="chip-grid">
      {items.map(([label, value]) => (
        <div className="preview-chip" key={label}><span>{label}</span><strong>{value}</strong></div>
      ))}
    </div>
  );
}

export function ResumeImport({ profile, onApply }: ResumeImportProps): React.ReactElement {
  const [status, setStatus] = useState<Status>("idle");
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ImportMode>("merge");
  const [dragging, setDragging] = useState(false);
  const [summary, setSummary] = useState("");
  const [selection, setSelection] = useState<ImportSelection>({
    basic: true,
    education: true,
    work: true,
    projects: true,
    campus: true,
    additional: true
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => (parsed ? applySelection(parsed, selection) : null), [parsed, selection]);

  const handleFile = async (file: File) => {
    setStatus("parsing");
    setError("");
    try {
      const result = await parseResumeFile(file);
      setParsed(result);
      setStatus("preview");
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "简历解析失败");
      setStatus("error");
    }
  };

  const reset = () => {
    setParsed(null);
    setStatus("idle");
    setError("");
    setSummary("");
  };

  const apply = () => {
    if (!selected) return;
    const stats = importStats(profile, selected, mode);
    onApply((current) => mergeResumeIntoProfile(current, selected, mode));
    const parts = [`新增 ${stats.added} 项`, `覆盖 ${stats.updated} 项`];
    if (stats.skipped) parts.push(`保留原有 ${stats.skipped} 项（未覆盖）`);
    setSummary(parts.join(" · "));
    setStatus("done");
  };

  return (
    <section className="import-section" id="resume-import">
      <div className="import-head">
        <div className="import-icon"><Sparkles size={20} /></div>
        <div>
          <strong>从简历一键导入</strong>
          <span>上传 PDF / DOCX / TXT 简历，自动解析姓名、联系方式、教育、实习、项目与校园经历</span>
        </div>
      </div>

      {status === "done" ? (
        <div className="import-done">
          <CheckCircle2 size={18} />
          <span>{summary}</span>
          <button className="btn btn-secondary" onClick={reset}><RefreshCw size={15} />再次导入</button>
        </div>
      ) : (
        <div
          className={`import-dropzone ${dragging ? "is-dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
        >
          {status === "parsing" ? (
            <><Loader2 size={24} className="spin" /><strong>正在本机解析简历…</strong><span>不会上传到任何服务器</span></>
          ) : (
            <><FileUp size={24} /><strong>拖拽简历到此处，或点击选择文件</strong><span>支持 PDF、DOCX、TXT / MD，单个文件建议小于 20MB</span></>
          )}
          <input
            ref={inputRef}
            hidden
            type="file"
            accept=".pdf,.doc,.docx,.txt,.md"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void handleFile(file);
            }}
          />
        </div>
      )}

      {status === "error" && <div className="import-error"><AlertTriangle size={16} /><span>{error}</span></div>}

      {status === "preview" && parsed && selected && (
        <div className="import-preview">
          <div className="preview-head">
            <div><FileText size={16} /><strong>{parsed.resumeName}</strong></div>
            <button className="icon-btn" title="取消导入" onClick={reset}><X size={17} /></button>
          </div>

          <div className="selection-row">
            <span>导入内容</span>
            {selectionLabels.map((item) => (
              <label key={item.key} className="selection-chip">
                <input
                  type="checkbox"
                  checked={selection[item.key]}
                  onChange={(event) => setSelection({ ...selection, [item.key]: event.target.checked })}
                />
                {item.label}
              </label>
            ))}
          </div>

          {parsed.warnings.length > 0 && (
            <div className="import-warning">
              <AlertTriangle size={15} />
              <div>{parsed.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div>
            </div>
          )}

          <div className="preview-block">
            <h4>基础信息</h4>
            <BasicChips parsed={selected} />
          </div>

          {[
            { title: "教育经历", items: selected.education.map((item) => [item.school, item.major, item.degree, `${item.startDate} - ${item.endDate}`]) },
            { title: "实习 / 工作经历", items: selected.work.map((item) => [item.company, item.role, `${item.startDate} - ${item.endDate}`]) },
            { title: "项目经历", items: selected.projects.map((item) => [item.name, item.role, `${item.startDate} - ${item.endDate}`]) },
            { title: "校园经历", items: selected.campus.map((item) => [item.organization, item.role, `${item.startDate} - ${item.endDate}`]) }
          ].filter((group) => group.items.length > 0).map((group) => (
            <div className="preview-block" key={group.title}>
              <h4>{group.title}<i>{group.items.length} 条</i></h4>
              <ul>
                {group.items.map((item, index) => (
                  <li key={`${group.title}-${index}`}>
                    <strong>{item.filter(Boolean).slice(0, 2).join(" · ") || "未命名条目"}</strong>
                    <span>{item.filter(Boolean).slice(2).join(" · ")}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {[["专业技能", selected.additional.skills], ["语言能力", selected.additional.languages], ["证书", selected.additional.certificates], ["奖项荣誉", selected.additional.awards], ["自我评价", selected.additional.selfIntroduction]]
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => (
              <div className="preview-block" key={label as string}>
                <h4>{label as string}</h4>
                <p className="preview-text">{value as string}</p>
              </div>
            ))}

          <div className="preview-actions">
            <div className="mode-switch">
              <button className={mode === "merge" ? "active" : ""} onClick={() => setMode("merge")}>补全空白</button>
              <button className={mode === "overwrite" ? "active" : ""} onClick={() => setMode("overwrite")}>覆盖同名字段</button>
              <button className={mode === "reset" ? "active" : ""} onClick={() => setMode("reset")}>清空后导入</button>
            </div>
            <span className="mode-hint">
              {mode === "merge"
                ? `保留“${profile.name}”已填写内容，只补充缺失字段`
                : mode === "overwrite"
                  ? `用简历内容替换“${profile.name}”中同名字段`
                  : `清空“${profile.name}”现有资料，只保留简历中的内容`}
            </span>
            <button className="btn btn-primary" onClick={apply}><CheckCircle2 size={16} />确认导入</button>
          </div>
        </div>
      )}
    </section>
  );
}
