"use client";

import { useEffect, useState } from 'react';

const storageKey = 'coaster-generation-retry-at';

function secondsLeft(until: number) {
  return Math.max(0, Math.ceil((until - Date.now()) / 1000));
}

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const short = `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  return hours ? `${hours}:${short}` : short;
}

export function useGenerationCooldown() {
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const saved = Number(localStorage.getItem(storageKey));
    if (saved > Date.now()) { setRetryAt(saved); setRemaining(secondsLeft(saved)); }
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey) return;
      const until = Number(event.newValue);
      setRetryAt(until);
      setRemaining(secondsLeft(until));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(() => {
      const next = secondsLeft(retryAt);
      setRemaining(next);
      if (!next) { window.clearInterval(timer); localStorage.removeItem(storageKey); setRetryAt(0); }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAt]);

  function startCooldown(retryAfter: string | null) {
    const parsed = Number(retryAfter);
    const seconds = Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 60;
    const until = Date.now() + seconds * 1000;
    localStorage.setItem(storageKey, String(until));
    setRetryAt(until);
    setRemaining(seconds);
  }

  return { remaining, countdown: formatTime(remaining), startCooldown };
}
