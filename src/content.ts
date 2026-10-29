import { fillPage, scanPage } from "./fill-engine";
import type { ContentRequest, FillResult } from "./types";

declare global {
  interface Window { __offerPilotLoaded?: boolean }
}

function showToast(result: FillResult): void {
  document.getElementById("offerpilot-toast-host")?.remove();
  const host = document.createElement("div");
  host.id = "offerpilot-toast-host";
  host.style.cssText = "position:fixed;right:24px;top:24px;z-index:2147483647;";
  const shadow = host.attachShadow({ mode: "closed" });
  const resumeMessage = result.needsResume ? " 检测到简历上传框，请手动确认文件。" : "";
  shadow.innerHTML = `
    <style>
      .toast{width:310px;padding:16px 17px;border:1px solid #dbe5dc;border-radius:16px;background:#fff;color:#17211b;box-shadow:0 20px 55px rgba(25,54,38,.2);font-family:system-ui,"Microsoft YaHei",sans-serif;animation:in .24s ease-out}
      .top{display:flex;align-items:center;gap:9px;margin-bottom:8px}.mark{width:29px;height:29px;display:grid;place-items:center;border-radius:9px;background:#1f6b48;color:#fff;font-size:15px}.title{font-size:13px;font-weight:700}.body{color:#68736b;font-size:12px;line-height:1.55}.count{color:#1f6b48;font-weight:700}.bar{height:3px;margin-top:13px;overflow:hidden;border-radius:4px;background:#e8ece8}.bar:after{content:"";display:block;width:100%;height:100%;background:#1f6b48;animation:time 4.6s linear forwards}@keyframes in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}@keyframes time{to{width:0}}
    </style>
    <div class="toast"><div class="top"><div class="mark">✓</div><div class="title">OfferPilot 填写完成</div></div><div class="body">已填写 <span class="count">${result.filled}</span> 个字段，跳过 ${result.skipped} 个。请提交前仔细核对。${resumeMessage}</div><div class="bar"></div></div>`;
  document.documentElement.appendChild(host);
  window.setTimeout(() => host.remove(), 4800);
}

if (!window.__offerPilotLoaded) {
  window.__offerPilotLoaded = true;
  chrome.runtime.onMessage.addListener((request: ContentRequest, _sender, sendResponse) => {
    try {
      if (request.type === "OFFERPILOT_PING") {
        sendResponse({ ready: true });
      } else if (request.type === "OFFERPILOT_SCAN") {
        sendResponse(scanPage());
      } else if (request.type === "OFFERPILOT_FILL") {
        const result = fillPage(request.profile, request.settings);
        showToast(result);
        sendResponse(result);
      }
    } catch (error) {
      sendResponse({ message: error instanceof Error ? error.message : "页面填写失败" });
    }
    return true;
  });
}
