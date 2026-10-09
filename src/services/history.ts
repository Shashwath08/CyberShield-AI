import { useSyncExternalStore } from "react";

import type { AnalysisResult, RiskLevel, ScanType } from "@/lib/engine/types";

/**
 * Scan history lives only in this browser (localStorage). Nothing is stored on the
 * server, so one person's messages can never be shown to another.
 */
export interface ScanRecord {
  id: string;
  createdAt: string;
  type: ScanType;
  /** Truncated preview of the input — full message text is not retained. */
  preview: string;
  score: number;
  level: RiskLevel;
  result: AnalysisResult;
}

const KEY = "cybershield.history.v1";
const SETTINGS_KEY = "cybershield.settings.v1";
const MAX_RECORDS = 200;
const PREVIEW_LEN = 140;

export interface Settings {
  saveHistory: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: ScanRecord[] | null = null;
let settingsCache: Settings | null = null;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function emit() {
  for (const l of listeners) l();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function loadHistory(): ScanRecord[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(storage()?.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? (parsed as ScanRecord[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist(records: ScanRecord[]) {
  cache = records;
  storage()?.setItem(KEY, JSON.stringify(records));
  emit();
}

export function getSettings(): Settings {
  if (settingsCache) return settingsCache;
  try {
    settingsCache = {
      saveHistory: true,
      ...(JSON.parse(storage()?.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>),
    };
  } catch {
    settingsCache = { saveHistory: true };
  }
  return settingsCache;
}

export function updateSettings(next: Partial<Settings>) {
  settingsCache = { ...getSettings(), ...next };
  storage()?.setItem(SETTINGS_KEY, JSON.stringify(settingsCache));
  emit();
}

export function saveScan(result: AnalysisResult): ScanRecord | null {
  if (!getSettings().saveHistory) return null;
  const preview =
    result.input.length > PREVIEW_LEN ? `${result.input.slice(0, PREVIEW_LEN)}…` : result.input;
  const record: ScanRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    type: result.type,
    preview,
    score: result.score,
    level: result.level,
    // Keep full text only for URLs; messages keep a preview to minimise stored personal data.
    result:
      result.type === "message"
        ? {
            ...result,
            input: preview,
            indicators: result.indicators.map(({ span: _s, ...rest }) => rest),
          }
        : result,
  };
  persist([record, ...loadHistory()].slice(0, MAX_RECORDS));
  return record;
}

export function deleteScan(id: string) {
  persist(loadHistory().filter((r) => r.id !== id));
}

export function clearHistory() {
  persist([]);
}

export interface HistoryQuery {
  search?: string;
  type?: ScanType | "all";
  level?: RiskLevel | "all";
  page?: number;
  pageSize?: number;
}

export function queryHistory(records: readonly ScanRecord[], q: HistoryQuery) {
  const search = q.search?.trim().toLowerCase() ?? "";
  const filtered = records.filter(
    (r) =>
      (!q.type || q.type === "all" || r.type === q.type) &&
      (!q.level || q.level === "all" || r.level === q.level) &&
      (!search || r.preview.toLowerCase().includes(search)),
  );
  const pageSize = q.pageSize ?? 10;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, q.page ?? 1), pages);
  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    total: filtered.length,
    page,
    pages,
  };
}

export function historyStats(records: readonly ScanRecord[]) {
  const byLevel: Record<RiskLevel, number> = { low: 0, moderate: 0, high: 0, critical: 0 };
  let urls = 0;
  for (const r of records) {
    byLevel[r.level] += 1;
    if (r.type === "url") urls += 1;
  }
  return { total: records.length, urls, messages: records.length - urls, byLevel };
}

const EMPTY: ScanRecord[] = [];
export function useHistory(): ScanRecord[] {
  return useSyncExternalStore(subscribe, loadHistory, () => EMPTY);
}

const DEFAULT_SETTINGS: Settings = { saveHistory: true };
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}

/** Test helper: drop in-memory caches. */
export function resetHistoryCache() {
  cache = null;
  settingsCache = null;
}
