const fs = require("fs");
const path = require("path");
const { logInfo } = require("../utils/logger");
const { createError, isPlainObject } = require("../utils/validation");

const FEEDBACK_DIR = path.join(__dirname, "..", "data", "feedback");
const FEEDBACK_LOG_PATH = path.join(FEEDBACK_DIR, "feedbackLog.json");
const FEEDBACK_STATS_PATH = path.join(FEEDBACK_DIR, "feedbackStats.json");

const ALLOWED_LABELS = [
  "too_expensive",
  "too_cheap",
  "too_vague",
  "missing_details",
  "proposal_good",
  "tone_not_good",
];

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return parsed || fallback;
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function feedbackKey(category, subcategory = "general") {
  return `${category || "other"}:${subcategory || "general"}`;
}

function sanitizeFeedback(payload) {
  if (!isPlainObject(payload)) {
    throw createError("feedback payload is required", 400);
  }

  const rating = Number(payload.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw createError("rating must be a number between 1 and 5", 400);
  }

  const labels = Array.isArray(payload.labels)
    ? payload.labels.filter((label) => ALLOWED_LABELS.includes(label))
    : [];

  return {
    workspace_id: typeof payload.workspace_id === "string" ? payload.workspace_id.trim() : null,
    category: typeof payload.category === "string" && payload.category.trim() ? payload.category.trim() : "other",
    subcategory:
      typeof payload.subcategory === "string" && payload.subcategory.trim()
        ? payload.subcategory.trim()
        : "general",
    rating,
    selected_price_tier:
      typeof payload.selected_price_tier === "string" && payload.selected_price_tier.trim()
        ? payload.selected_price_tier.trim()
        : null,
    labels,
    comment: typeof payload.comment === "string" ? payload.comment.trim().slice(0, 1000) : "",
    created_at: new Date().toISOString(),
  };
}

function calculatePriceFactor(labels, rating, currentFactor = 1) {
  let factor = Number.isFinite(currentFactor) ? currentFactor : 1;

  if (labels.includes("too_expensive")) {
    factor -= 0.03;
  }

  if (labels.includes("too_cheap")) {
    factor += 0.03;
  }

  if (rating >= 5) {
    factor += 0.01;
  }

  if (rating <= 2) {
    factor -= 0.01;
  }

  return Number(clamp(factor, 0.85, 1.15).toFixed(3));
}

function updateFeedbackStats(stats, feedback) {
  const key = feedbackKey(feedback.category, feedback.subcategory);
  const existing = stats[key] || {
    category: feedback.category,
    subcategory: feedback.subcategory,
    count: 0,
    average_rating: 0,
    label_counts: {},
    price_adjustment_factor: 1,
    latest_feedback_at: null,
  };

  const newCount = existing.count + 1;
  const totalRating = existing.average_rating * existing.count + feedback.rating;

  feedback.labels.forEach((label) => {
    existing.label_counts[label] = (existing.label_counts[label] || 0) + 1;
  });

  stats[key] = {
    ...existing,
    count: newCount,
    average_rating: Number((totalRating / newCount).toFixed(2)),
    price_adjustment_factor: calculatePriceFactor(
      feedback.labels,
      feedback.rating,
      existing.price_adjustment_factor,
    ),
    latest_feedback_at: feedback.created_at,
  };

  return stats;
}

function recordFeedback(payload) {
  const feedback = sanitizeFeedback(payload);
  const log = readJsonFile(FEEDBACK_LOG_PATH, []);
  const stats = readJsonFile(FEEDBACK_STATS_PATH, {});
  const nextStats = updateFeedbackStats(stats, feedback);

  log.push(feedback);
  writeJsonFile(FEEDBACK_LOG_PATH, log);
  writeJsonFile(FEEDBACK_STATS_PATH, nextStats);

  const stat = nextStats[feedbackKey(feedback.category, feedback.subcategory)];
  logInfo("feedback_recorded", {
    request_id: feedback.workspace_id,
    category: feedback.category,
    subcategory: feedback.subcategory,
    rating: feedback.rating,
    label_count: feedback.labels.length,
    feedback_count: stat?.count,
    average_rating: stat?.average_rating,
    price_adjustment_factor: stat?.price_adjustment_factor,
  });

  return {
    accepted: true,
    feedback,
    hints: getFeedbackHints(feedback.category, feedback.subcategory),
  };
}

function getFeedbackStats(category, subcategory = "general") {
  const stats = readJsonFile(FEEDBACK_STATS_PATH, {});
  return stats[feedbackKey(category, subcategory)] || null;
}

function getFeedbackHints(category, subcategory = "general") {
  const stats = getFeedbackStats(category, subcategory);
  if (!stats) {
    return {
      price_adjustment_factor: 1,
      proposal_hints: [],
      feedback_count: 0,
    };
  }

  const proposalHints = [];
  if ((stats.label_counts.too_vague || 0) > 0) {
    proposalHints.push("Be more specific about deliverables, timeline, and assumptions.");
  }
  if ((stats.label_counts.missing_details || 0) > 0) {
    proposalHints.push("Ask sharper clarification questions and include exclusions.");
  }
  if ((stats.label_counts.tone_not_good || 0) > 0) {
    proposalHints.push("Use a calmer, consultative tone.");
  }

  return {
    price_adjustment_factor: clamp(stats.price_adjustment_factor || 1, 0.85, 1.15),
    proposal_hints: proposalHints,
    feedback_count: stats.count,
    average_rating: stats.average_rating,
  };
}

module.exports = {
  ALLOWED_LABELS,
  calculatePriceFactor,
  feedbackKey,
  getFeedbackHints,
  getFeedbackStats,
  recordFeedback,
  sanitizeFeedback,
  updateFeedbackStats,
};
