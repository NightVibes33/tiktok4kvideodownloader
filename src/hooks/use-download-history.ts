import { useState, useCallback, useEffect } from "react";

export interface DownloadHistoryItem {
  id: string;
  url: string;
  description: string;
  author: string;
  avatar: string;
  cover: string;
  downloadedAt: number;
}

const STORAGE_KEY = "tiktok-download-history";
const MAX_ITEMS = 20;

function loadHistory(): DownloadHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useDownloadHistory() {
  const [history, setHistory] = useState<DownloadHistoryItem[]>(loadHistory);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch { /* storage full — ignore */ }
  }, [history]);

  const addToHistory = useCallback((item: Omit<DownloadHistoryItem, "downloadedAt">) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.id !== item.id);
      return [{ ...item, downloadedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return { history, addToHistory, removeFromHistory, clearHistory };
}
