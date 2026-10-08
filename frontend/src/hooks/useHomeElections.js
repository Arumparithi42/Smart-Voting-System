import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { serverNow } from '../utils/serverClock';

// Featured (home page) elections - the ones the Admin set to "Show this
// election on the home page: Yes" - from GET /api/home-elections.
//
// One shared store for every consumer (the top ticker and the bottom-right
// election box), so both show the same data from a single request. It
// refreshes every minute, when the tab regains focus, and when a featured
// election starts or ends.
const REFRESH_MS = 60_000;

let state = { data: null, failed: false };
const listeners = new Set();
let refreshTimer = null;
let stageTimer = null;
let inFlight = null;

const emit = () => listeners.forEach((fn) => fn(state));

export const reloadHomeElections = () => {
  if (inFlight) return inFlight;
  inFlight = axiosInstance.get('/api/home-elections')
    .then((res) => { state = { data: res.data, failed: false }; })
    .catch(() => { state = { ...state, failed: true }; })
    .finally(() => { inFlight = null; emit(); });
  return inFlight;
};

// Reload when the next featured election opens or closes.
const scheduleStageCheck = () => {
  clearInterval(stageTimer);
  stageTimer = setInterval(() => {
    const items = state.data ? [...state.data.ongoing, ...state.data.upcoming] : [];
    const now = serverNow();
    if (items.some((e) => Date.parse(e.lifecycleStage === 'ONGOING' ? e.endTime : e.startTime) <= now)) reloadHomeElections();
  }, 1000);
};

const start = () => {
  reloadHomeElections();
  refreshTimer = setInterval(reloadHomeElections, REFRESH_MS);
  window.addEventListener('focus', reloadHomeElections);
  scheduleStageCheck();
};

const stop = () => {
  clearInterval(refreshTimer);
  clearInterval(stageTimer);
  window.removeEventListener('focus', reloadHomeElections);
};

export default function useHomeElections() {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    listeners.add(setSnapshot);
    if (listeners.size === 1) start();
    else setSnapshot(state);
    return () => {
      listeners.delete(setSnapshot);
      if (listeners.size === 0) stop();
    };
  }, []);
  const { data, failed } = snapshot;
  // Ongoing first (soonest to close), then upcoming (soonest to start).
  const elections = data ? [...data.ongoing, ...data.upcoming] : [];
  return { data, failed, elections, reload: reloadHomeElections };
}

// A per-second clock for countdowns (server-corrected).
export function useNow(active = true) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

const pad = (n) => String(n).padStart(2, '0');
export const formatRemaining = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const time = `${pad(Math.floor((s % 86400) / 3600))}h ${pad(Math.floor((s % 3600) / 60))}m ${pad(s % 60)}s`;
  return d > 0 ? `${d}d ${time}` : time;
};
