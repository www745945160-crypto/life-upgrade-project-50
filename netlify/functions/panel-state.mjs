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

function normalizeState(input = {}) {
  return {
    xp: Math.max(0, Number(input.xp || 0)),
    coins: Math.max(0, Number(input.coins || 0)),
    season: String(input.season || "01").slice(0, 12),
    day: Math.min(50, Math.max(1, Number(input.day || 1))),
    history: Array.isArray(input.history) ? input.history.slice(0, 50) : [],
    wishes: Array.isArray(input.wishes) ? input.wishes.slice(0, 50) : [],
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
