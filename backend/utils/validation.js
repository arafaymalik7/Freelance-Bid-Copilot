function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getValueAtPath(object, path) {
  return path.split(".").reduce((current, segment) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    return current[segment];
  }, object);
}

function createError(message, statusCode = 500, publicMessage) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.publicMessage = publicMessage || (statusCode === 400 ? message : "Something went wrong");
  return error;
}

function coerceNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function assertRequiredKeys(payload, requiredPaths) {
  for (const path of requiredPaths) {
    const value = getValueAtPath(payload, path);
    if (value === undefined || value === null || value === "") {
      throw createError(`Incomplete response from AI: missing ${path}`);
    }
  }
}

function assertString(value, fieldName, { allowNull = false } = {}) {
  if (value === null && allowNull) {
    return;
  }

  if (typeof value !== "string" || !value.trim()) {
    throw createError(`Incomplete response from AI: missing ${fieldName}`);
  }
}

function assertArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw createError(`Incomplete response from AI: missing ${fieldName}`);
  }
}

function assertPlainObject(value, fieldName) {
  if (!isPlainObject(value)) {
    throw createError(`Incomplete response from AI: missing ${fieldName}`);
  }
}

function normalizeQuestion(question) {
  assertPlainObject(question, "follow_up_questions");

  const answerType = ["text", "yes_no", "number", "choice"].includes(question.answer_type)
    ? question.answer_type
    : "text";

  return {
    question: typeof question.question === "string" ? question.question.trim() : "",
    why_important:
      typeof question.why_important === "string" ? question.why_important.trim() : "",
    answer_type: answerType,
    choices:
      answerType === "choice" && Array.isArray(question.choices)
        ? question.choices.filter((choice) => typeof choice === "string" && choice.trim())
        : null,
  };
}

function ensurePricingTierOrder(pricing) {
  assertPlainObject(pricing, "pricing");
  assertRequiredKeys(pricing, [
    "basic.min",
    "basic.max",
    "recommended.min",
    "recommended.max",
    "premium.min",
    "premium.max",
  ]);

  const basicMin = coerceNumber(pricing.basic.min);
  const basicMax = coerceNumber(pricing.basic.max);
  const recommendedMin = coerceNumber(pricing.recommended.min);
  const recommendedMax = coerceNumber(pricing.recommended.max);
  const premiumMin = coerceNumber(pricing.premium.min);
  const premiumMax = coerceNumber(pricing.premium.max);

  if (
    [basicMin, basicMax, recommendedMin, recommendedMax, premiumMin, premiumMax].some(
      (value) => value === null,
    )
  ) {
    throw createError("Incomplete response from AI: missing pricing tier values");
  }

  if (!(basicMin <= basicMax && basicMax < recommendedMin && recommendedMin <= recommendedMax)) {
    throw createError("AI pricing tiers are out of order");
  }

  if (!(recommendedMax < premiumMin && premiumMin <= premiumMax)) {
    throw createError("AI pricing tiers are out of order");
  }

  pricing.basic.min = basicMin;
  pricing.basic.max = basicMax;
  pricing.recommended.min = recommendedMin;
  pricing.recommended.max = recommendedMax;
  pricing.premium.min = premiumMin;
  pricing.premium.max = premiumMax;
}

module.exports = {
  assertArray,
  assertPlainObject,
  assertRequiredKeys,
  assertString,
  coerceNumber,
  createError,
  ensurePricingTierOrder,
  getValueAtPath,
  isPlainObject,
  normalizeQuestion,
};

