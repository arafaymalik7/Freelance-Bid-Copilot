import { useState } from "react";
import { quickGenerateBid, submitWorkspaceFeedback } from "../api/client.js";
import { clearRecentBids, readRecentBids, saveRecentBid } from "../utils/recentBids.js";

const DEFAULT_PREFERENCES = {
  region: "US/global USD",
  urgency: "normal",
};

function createErrorState(message, retryFn) {
  return { message, retryFn };
}

export function useQuickBid() {
  const [brief, setBrief] = useState("");
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  const [feedbackReceipt, setFeedbackReceipt] = useState(null);
  const [recentBids, setRecentBids] = useState(() => readRecentBids());

  const reset = () => {
    setBrief("");
    setPreferences(DEFAULT_PREFERENCES);
    setResult(null);
    setStatus("idle");
    setError(null);
    setFeedbackReceipt(null);
  };

  const generateBid = async (nextBrief = brief, nextPreferences = preferences, answers = []) => {
    const activeBrief = typeof nextBrief === "string" ? nextBrief.trim() : "";

    if (activeBrief.length < 10) {
      setError(createErrorState("Paste a client brief with at least 10 characters.", () =>
        generateBid(activeBrief, nextPreferences, answers),
      ));
      return;
    }

    setBrief(activeBrief);
    setPreferences(nextPreferences);
    setStatus("generating");
    setError(null);

    try {
      const generated = await quickGenerateBid({
        brief: activeBrief,
        preferences: nextPreferences,
        answers,
        previous: answers.length && result?.workspace_state ? result.workspace_state : null,
      });

      setResult({
        ...generated,
        critical_questions: (generated.critical_questions || []).slice(0, 3),
      });
      setRecentBids(saveRecentBid(generated));
      setFeedbackReceipt(null);
      setStatus("results");
      return generated;
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, () =>
        generateBid(activeBrief, nextPreferences, answers),
      ));
      setStatus(result ? "results" : "idle");
    }
  };

  const loadRecentBid = (savedBid) => {
    if (!savedBid?.result) {
      return;
    }

    setResult(savedBid.result);
    setBrief(savedBid.result.brief || "");
    setPreferences(savedBid.result.preferences || DEFAULT_PREFERENCES);
    setStatus("results");
    setError(null);
  };

  const clearRecent = () => {
    clearRecentBids();
    setRecentBids([]);
  };

  const saveCurrentBid = () => {
    if (!result) {
      return;
    }

    setRecentBids(saveRecentBid(result));
  };

  const improveWithAnswers = async (answers) => {
    await generateBid(brief, preferences, answers);
  };

  const submitFeedback = async (feedback) => {
    if (!result?.classification) {
      setError(createErrorState("Generate a bid before submitting feedback.", () => submitFeedback(feedback)));
      return;
    }

    setError(null);

    try {
      const receipt = await submitWorkspaceFeedback({
        workspace_id: result.workspace_id,
        category: result.classification.category,
        subcategory: result.classification.subcategory,
        ...feedback,
      });

      setFeedbackReceipt(receipt);
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, () => submitFeedback(feedback)));
    }
  };

  return {
    brief,
    error,
    feedbackReceipt,
    generateBid,
    improveWithAnswers,
    clearRecent,
    loadRecentBid,
    loading: status === "generating",
    loadingMessage: "Generating a complete bid package with scope, pricing, and proposal...",
    preferences,
    recentBids,
    reset,
    result,
    saveCurrentBid,
    setBrief,
    setPreferences,
    status,
    submitFeedback,
  };
}
