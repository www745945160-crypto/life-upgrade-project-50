import { getStore } from "@netlify/blobs";

const idPattern = /^[a-f0-9]{64}$/;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, PUT, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function validSyncId(value) {
  return typeof value === "string" && idPattern.test(value);
}

function normalizeList(value, limit) {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object").slice(0, limit)
    : [];
}

function localDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const date = parseLocalDate(dateString) || parseLocalDate(localDateString());
  date.setDate(date.getDate() + days);
  return formatLocalDate(date);
}

function clampDay(value) {
  return Math.min(50, Math.max(1, Number(value || 1)));
}

function extractDate(input) {
  if (parseLocalDate(input.date)) return input.date;
  if (input.daily && parseLocalDate(input.daily.date)) return input.daily.date;
  return null;
}

function dateFromHistory(history, day) {
  if (!Array.isArray(history)) return null;
  const anchor = history.find((entry) => parseLocalDate(entry?.date) && Number.isFinite(Number(entry?.day)));
  if (!anchor) return null;
  return addDays(anchor.date, clampDay(day) - clampDay(anchor.day));
}

function inferSeasonStartDate(day, date) {
  return addDays(parseLocalDate(date) ? date : localDateString(), 1 - clampDay(day));
}

function normalizeState(input = {}) {
  const day = clampDay(input.day);
  const history = normalizeList(input.history, 50);
  const currentDate = extractDate(input) || dateFromHistory(history, day) || localDateString();
  const seasonStartDate = parseLocalDate(input.seasonStartDate)
    ? input.seasonStartDate
    : inferSeasonStartDate(day, currentDate);

  return {
    xp: Math.max(0, Number(input.xp || 0)),
    coins: Math.max(0, Number(input.coins || 0)),
    season: String(input.season || "01").slice(0, 12),
    seasonStartDate,
    day,
    history,
    wishes: normalizeList(input.wishes, 50),
  };
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }

  const store = getStore({ name: "life-upgrade-panel", consistency: "strong" });
  const url = new URL(request.url);

  if (request.method === "GET") {
    const syncId = url.searchParams.get("syncId");
    if (!validSyncId(syncId)) return json({ error: "同步码无效" }, 400);

    const payload = await store.get(syncId);
    if (!payload) return json({ state: null });
    return json({ state: JSON.parse(payload) });
  }

  if (request.method === "PUT") {
    const body = await request.json();
    if (!validSyncId(body.syncId) || !body.state) {
      return json({ error: "保存内容无效" }, 400);
    }

    const state = normalizeState(body.state);
    await store.set(body.syncId, JSON.stringify(state));
    return json({ saved: true, state });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/panel-state",
};
