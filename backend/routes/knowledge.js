const express = require("express");
const { searchVectorIndex } = require("../services/vectorSearchService");
const { createError } = require("../utils/validation");

const router = express.Router();

function handleRoute(handler) {
  return async (req, res, next) => {
    try {
      res.status(200).json(await handler(req));
    } catch (error) {
      next(error);
    }
  };
}

router.get(
  "/search",
  handleRoute(async (req) => {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (query.length < 3) {
      throw createError("q query parameter must be at least 3 characters", 400);
    }

    const topK = Math.max(1, Math.min(Number(req.query.topK) || 5, 20));
    const category = typeof req.query.category === "string" ? req.query.category.trim() : undefined;
    const results = await searchVectorIndex(query, { category, topK });

    return {
      query,
      category: category || null,
      topK,
      results: results.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        category: item.category,
        subcategory: item.subcategory,
        similarity: item.similarity,
        source_file: item.source_file,
        metadata: item.metadata,
      })),
    };
  }),
);

module.exports = router;
