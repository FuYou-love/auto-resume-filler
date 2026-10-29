import { createDefaultState, STORAGE_KEY } from "./constants";
import type { AppState, Profile } from "./types";

function normalizeState(value?: Partial<AppState>): AppState {
  const fallback = createDefaultState();
  const profiles = Array.isArray(value?.profiles) && value.profiles.length > 0 ? value.profiles : fallback.profiles;
  const activeProfileId = profiles.some((profile) => profile.id === value?.activeProfileId)
    ? value!.activeProfileId!
    : profiles[0].id;

  return {
    profiles,
    activeProfileId,
    settings: { ...fallback.settings, ...(value?.settings ?? {}) }
  };
}

function hasExtensionStorage(): boolean {
  return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
}

export async function getState(): Promise<AppState> {
  if (hasExtensionStorage()) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return normalizeState(result[STORAGE_KEY] as Partial<AppState> | undefined);
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return normalizeState(stored ? JSON.parse(stored) as Partial<AppState> : undefined);
  } catch {
    return normalizeState();
  }
}

export async function saveState(state: AppState): Promise<void> {
  if (hasExtensionStorage()) {
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function updateProfile(profile: Profile): Promise<AppState> {
  const state = await getState();
  const nextProfile = { ...profile, updatedAt: Date.now() };
  const profiles = state.profiles.some((item) => item.id === profile.id)
    ? state.profiles.map((item) => (item.id === profile.id ? nextProfile : item))
    : [...state.profiles, nextProfile];
  const nextState = { ...state, profiles };
  await saveState(nextState);
  return nextState;
}

export function getActiveProfile(state: AppState): Profile {
  return state.profiles.find((profile) => profile.id === state.activeProfileId) ?? state.profiles[0];
}
