const express = require("express");
const { classifyProject } = require("../services/classifier");
const { extractRequirements } = require("../services/extractor");
const { detectGaps } = require("../services/gapDetector");
const { refineWithAnswers } = require("../services/refineService");
const { buildScope } = require("../services/scopeBuilder");
const { suggestPricing } = require("../services/pricingEngine");
const { generateProposal } = require("../services/proposalGenerator");
const { createError, isPlainObject } = require("../utils/validation");

const router = express.Router();

function readRequiredBrief(value, fieldName = "brief", minLength = 10) {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw createError(`${fieldName} is required and must be at least ${minLength} characters`, 400);
  }

  return value.trim();
}

function readRequiredString(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw createError(`${fieldName} is required`, 400);
  }

  return value.trim();
}

function readRequiredObject(value, fieldName) {
  if (!isPlainObject(value)) {
    throw createError(`${fieldName} is required`, 400);
  }

  return value;
}

function readRequiredAnswers(value) {
  if (!Array.isArray(value)) {
    throw createError("userAnswers must be an array", 400);
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createError(`userAnswers[${index}] must be an object`, 400);
    }

    return {
      question: readRequiredString(item.question, `userAnswers[${index}].question`),
      answer: readRequiredString(item.answer, `userAnswers[${index}].answer`),
    };
  });
}

function handleRoute(handler) {
  return async (req, res, next) => {
    try {
      const payload = await handler(req, res);
      if (!res.headersSent) {
        res.status(200).json(payload);
      }
    } catch (error) {
      next(error);
    }
  };
}

router.post(
  "/classify",
  handleRoute(async (req) => {
    const brief = readRequiredBrief(req.body.brief);
    return classifyProject(brief);
  }),
);

router.post(
  "/extract",
  handleRoute(async (req) => {
    const brief = readRequiredBrief(req.body.brief);
    const category = readRequiredString(req.body.category, "category");
    return extractRequirements(brief, category);
  }),
);

router.post(
  "/gaps",
  handleRoute(async (req) => {
    const brief = readRequiredBrief(req.body.brief);
    const category = readRequiredString(req.body.category, "category");
    const extraction = readRequiredObject(req.body.extraction, "extraction");
    return detectGaps(brief, category, extraction);
  }),
);

router.post(
  "/refine",
  handleRoute(async (req) => {
    const brief = readRequiredBrief(req.body.brief);
    const category = readRequiredString(req.body.category, "category");
    const previousExtraction = readRequiredObject(req.body.previousExtraction, "previousExtraction");
    const userAnswers = readRequiredAnswers(req.body.userAnswers);
    return refineWithAnswers(brief, category, previousExtraction, userAnswers);
  }),
);

router.post(
  "/scope",
  handleRoute(async (req) => {
    const brief = readRequiredBrief(req.body.brief);
    const category = readRequiredString(req.body.category, "category");
    const extraction = readRequiredObject(req.body.extraction, "extraction");
    return buildScope(brief, category, extraction);
  }),
);

router.post(
  "/pricing",
  handleRoute(async (req) => {
    const brief = readRequiredBrief(req.body.brief);
    const category = readRequiredString(req.body.category, "category");
    const extraction = readRequiredObject(req.body.extraction, "extraction");
    const scope = readRequiredObject(req.body.scope, "scope");
    return suggestPricing(brief, category, extraction, scope);
  }),
);

router.post(
  "/proposal",
  handleRoute(async (req) => {
    const brief = readRequiredBrief(req.body.brief);
    const category = readRequiredString(req.body.category, "category");
    const extraction = readRequiredObject(req.body.extraction, "extraction");
    const scope = readRequiredObject(req.body.scope, "scope");
    const pricing = readRequiredObject(req.body.pricing, "pricing");
    return generateProposal(brief, category, extraction, scope, pricing);
  }),
);

module.exports = router;
