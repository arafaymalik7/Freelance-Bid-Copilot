const express = require("express");
const {
  generateBidPackage,
  improveWorkspaceProposal,
  quickGenerateBid,
  refineWorkspace,
  startWorkspace,
} = require("../services/bidWorkspaceService");
const { createError, isPlainObject } = require("../utils/validation");

const router = express.Router();

function readBrief(value, minLength = 10) {
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw createError(`brief is required and must be at least ${minLength} characters`, 400);
  }

  return value.trim();
}

function readObject(value, fieldName, { required = true } = {}) {
  if (value === undefined || value === null) {
    if (!required) {
      return undefined;
    }
    throw createError(`${fieldName} is required`, 400);
  }

  if (!isPlainObject(value)) {
    throw createError(`${fieldName} must be an object`, 400);
  }

  return value;
}

function readAnswers(value, fieldName = "userAnswers", { required = true } = {}) {
  if (value === undefined || value === null) {
    if (!required) {
      return [];
    }

    throw createError(`${fieldName} must be an array`, 400);
  }

  if (!Array.isArray(value)) {
    throw createError(`${fieldName} must be an array`, 400);
  }

  return value.map((item, index) => {
    if (!isPlainObject(item)) {
      throw createError(`${fieldName}[${index}] must be an object`, 400);
    }

    if (typeof item.question !== "string" || !item.question.trim()) {
      throw createError(`${fieldName}[${index}].question is required`, 400);
    }

    if (typeof item.answer !== "string" || !item.answer.trim()) {
      throw createError(`${fieldName}[${index}].answer is required`, 400);
    }

    return {
      question: item.question.trim(),
      answer: item.answer.trim(),
    };
  });
}

function handleRoute(handler) {
  return async (req, res, next) => {
    try {
      res.status(200).json(await handler(req));
    } catch (error) {
      next(error);
    }
  };
}

router.post(
  "/quick-generate",
  handleRoute(async (req) => {
    const brief = readBrief(req.body.brief);
    const preferences = readObject(req.body.preferences, "preferences", { required: false }) || {};
    const answers = readAnswers(req.body.answers, "answers", { required: false });
    const previous = readObject(req.body.previous, "previous", { required: false }) || null;

    return quickGenerateBid({ brief, preferences, answers, previous });
  }),
);

router.post(
  "/start",
  handleRoute(async (req) => {
    const brief = readBrief(req.body.brief);
    const preferences = readObject(req.body.preferences, "preferences", { required: false }) || {};

    return startWorkspace({ brief, preferences });
  }),
);

router.post(
  "/refine",
  handleRoute(async (req) => {
    const brief = readBrief(req.body.brief);
    const preferences = readObject(req.body.preferences, "preferences", { required: false }) || {};
    const classification = readObject(req.body.classification, "classification");
    const extraction = readObject(req.body.extraction, "extraction");
    const ragContext = readObject(req.body.ragContext, "ragContext", { required: false });
    const userAnswers = readAnswers(req.body.userAnswers);

    return refineWorkspace({
      workspace_id: req.body.workspace_id,
      brief,
      preferences,
      classification,
      extraction,
      ragContext,
      userAnswers,
    });
  }),
);

router.post(
  "/generate-package",
  handleRoute(async (req) => {
    const brief = readBrief(req.body.brief);
    const preferences = readObject(req.body.preferences, "preferences", { required: false }) || {};
    const classification = readObject(req.body.classification, "classification");
    const extraction = readObject(req.body.extraction, "extraction");
    const ragContext = readObject(req.body.ragContext, "ragContext", { required: false });

    return generateBidPackage({
      workspace_id: req.body.workspace_id,
      brief,
      preferences,
      classification,
      extraction,
      ragContext,
    });
  }),
);

router.post(
  "/improve-proposal",
  handleRoute(async (req) => {
    const brief = readBrief(req.body.brief);
    const classification = readObject(req.body.classification, "classification");
    const extraction = readObject(req.body.extraction, "extraction");
    const ragContext = readObject(req.body.ragContext, "ragContext", { required: false });
    const proposal = readObject(req.body.proposal, "proposal");
    const evaluation = readObject(req.body.evaluation, "evaluation");
    const scope = readObject(req.body.scope, "scope");
    const pricing = readObject(req.body.pricing, "pricing");

    return improveWorkspaceProposal({
      workspace_id: req.body.workspace_id,
      brief,
      classification,
      extraction,
      scope,
      pricing,
      proposal,
      evaluation,
      ragContext,
    });
  }),
);

module.exports = router;
