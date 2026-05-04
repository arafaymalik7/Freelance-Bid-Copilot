const STORAGE_KEY = "bid_copilot_recent_bids";
const MAX_RECENT_BIDS = 8;

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function readRecentBids() {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

export function saveRecentBid(result) {
  if (!canUseStorage() || !result?.workspace_id) {
    return [];
  }

  const item = {
    id: result.workspace_id,
    saved_at: new Date().toISOString(),
    title: result.package?.proposal?.subject_line || "Untitled bid",
    category: result.classification?.category || "other",
    price_range: result.package?.pricing?.recommended || null,
    timeline_days: result.package?.scope?.total_estimated_days || null,
    result,
  };
  const existing = readRecentBids().filter((bid) => bid.id !== item.id);
  const next = [item, ...existing].slice(0, MAX_RECENT_BIDS);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearRecentBids() {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
