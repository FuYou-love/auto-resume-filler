import { getState, saveState } from "./storage";

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  const state = await getState();
  await saveState(state);

  if (reason === "install") {
    await chrome.runtime.openOptionsPage();
  }
});
