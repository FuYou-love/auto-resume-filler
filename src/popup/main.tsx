import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronDown, FileText, Settings, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { profileCompletion } from "../constants";
import { getActiveProfile, getState, saveState } from "../storage";
import type { AppState, ContentRequest, FillResult } from "../types";
import "../base.css";
import "./popup.css";

interface PageState {
  status: "loading" | "ready" | "unsupported" | "error";
  title: string;
  detected: number;
  needsResume: boolean;
}

async function activeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "OFFERPILOT_PING" } satisfies ContentRequest);
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  }
}

async function sendToPage<T>(request: ContentRequest): Promise<T> {
  const tab = await activeTab();
  if (!tab?.id) throw new Error("找不到当前标签页");
  await ensureContentScript(tab.id);
  return chrome.tabs.sendMessage(tab.id, request) as Promise<T>;
}

function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState<PageState>({ status: "loading", title: "正在识别当前页面", detected: 0, needsResume: false });
  const [filling, setFilling] = useState(false);
  const [result, setResult] = useState<FillResult | null>(null);

  useEffect(() => {
    getState().then(setState);
    (async () => {
      const tab = await activeTab();
      const url = tab?.url ?? "";
      if (!tab?.id || !/^https?:\/\//.test(url)) {
        setPage({ status: "unsupported", title: "此页面不支持自动填写", detected: 0, needsResume: false });
        return;
      }
      try {
        const scan = await sendToPage<{ detected: number; needsResume: boolean }>({ type: "OFFERPILOT_SCAN" });
        setPage({ status: "ready", title: tab.title || "当前网申页面", ...scan });
      } catch {
        setPage({ status: "error", title: "暂时无法读取此页面", detected: 0, needsResume: false });
      }
    })();
  }, []);

  const profile = useMemo(() => state ? getActiveProfile(state) : null, [state]);

  const selectProfile = async (id: string) => {
    if (!state) return;
    const next = { ...state, activeProfileId: id };
    setState(next);
    await saveState(next);
    setResult(null);
  };

  const fill = async () => {
    if (!state || !profile) return;
    setFilling(true);
    setResult(null);
    try {
      const nextResult = await sendToPage<FillResult>({ type: "OFFERPILOT_FILL", profile, settings: state.settings });
      if (nextResult.message) throw new Error(nextResult.message);
      setResult(nextResult);
      setPage((current) => ({ ...current, detected: nextResult.detected, needsResume: nextResult.needsResume }));
    } catch {
      setPage((current) => ({ ...current, status: "error", title: "填写失败，请刷新网页后重试" }));
    } finally {
      setFilling(false);
    }
  };

  if (!state || !profile) {
    return <div className="popup-loading"><Sparkles size={20} />正在准备资料…</div>;
  }

  const completion = profileCompletion(profile);
  const isReady = page.status === "ready";

  return (
    <div className="popup-shell">
      <header className="popup-header">
        <div className="popup-brand"><div className="brand-mark"><Sparkles size={18} /></div><div><strong>OfferPilot</strong><span>让网申少一点重复</span></div></div>
        <button className="icon-btn" title="管理资料" onClick={() => chrome.runtime.openOptionsPage()}><Settings size={18} /></button>
      </header>

      <main>
        <section className="page-card">
          <div className={`status-dot ${page.status}`}><span /></div>
          <div className="page-copy">
            <small>{isReady ? "已识别网申页面" : "当前页面"}</small>
            <strong title={page.title}>{page.title}</strong>
            {isReady && <span>发现约 {page.detected} 个可匹配字段{page.needsResume ? " · 含简历上传" : ""}</span>}
          </div>
          {isReady && <CheckCircle2 size={19} className="ready-check" />}
        </section>

        <section className="profile-card">
          <div className="card-label"><span>使用档案</span><button onClick={() => chrome.runtime.openOptionsPage()}>编辑资料 <ArrowRight size={12} /></button></div>
          <div className="select-wrap">
            <select value={state.activeProfileId} onChange={(event) => selectProfile(event.target.value)}>
              {state.profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <ChevronDown size={16} />
          </div>
          <div className="profile-meta">
            <div className="mini-progress"><span style={{ width: `${completion}%` }} /></div>
            <span>资料完整度 {completion}%</span>
            <span>{profile.education.length + profile.work.length + profile.projects.length + profile.campus.length} 段经历</span>
          </div>
        </section>

        {result ? (
          <section className="result-card">
            <div className="result-icon"><CheckCircle2 size={20} /></div>
            <div><strong>已填写 {result.filled} 个字段</strong><span>跳过 {result.skipped} 个，请在提交前逐项核对。</span>{result.needsResume && <em><FileText size={12} />简历文件需要手动选择</em>}</div>
          </section>
        ) : (
          <div className="hint"><ShieldCheck size={14} /><span>资料仅从本机读取，不会发送到任何服务器</span></div>
        )}

        <button className="fill-button" disabled={!isReady || filling || completion === 0} onClick={fill}>
          <WandSparkles size={19} />
          <span>{filling ? "正在智能填写…" : isReady ? "智能填写当前页面" : "请打开网申表单页面"}</span>
        </button>
        {completion === 0 && <button className="setup-link" onClick={() => chrome.runtime.openOptionsPage()}>先完善求职资料</button>}
      </main>

      <footer className="popup-footer"><span>填写后请人工复核，插件不会自动提交</span><span>v0.1</span></footer>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  import("react-dom/client").then(({ createRoot }) => createRoot(root).render(<App />));
}
