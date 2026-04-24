import { useState } from "react";
import {
  buildScope,
  classifyBrief,
  detectGaps,
  extractRequirements,
  generateProposal,
  refineWithAnswers,
  suggestPricing,
} from "../api/client.js";

const STEP_LABELS = [
  "Brief",
  "Classify",
  "Extract",
  "Questions",
  "Refine",
  "Scope",
  "Pricing",
  "Proposal",
];

function createErrorState(message, retryFn) {
  return { message, retryFn };
}

export function usePipeline() {
  const [brief, setBrief] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);
  const [classification, setClassification] = useState(null);
  const [extraction, setExtraction] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [scope, setScope] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [proposal, setProposal] = useState(null);
  const [refinementRound, setRefinementRound] = useState(0);

  const profileStepLabel = STEP_LABELS[step] || STEP_LABELS[0];

  const resetPipeline = () => {
    setBrief("");
    setStep(0);
    setLoading(false);
    setLoadingMessage("");
    setError(null);
    setClassification(null);
    setExtraction(null);
    setGaps(null);
    setScope(null);
    setPricing(null);
    setProposal(null);
    setRefinementRound(0);
  };

  const runFullPipeline = async (nextBrief = brief) => {
    const activeBrief = typeof nextBrief === "string" ? nextBrief.trim() : "";

    if (!activeBrief) {
      setError(createErrorState("Brief is required", () => runFullPipeline(activeBrief)));
      return;
    }

    setBrief(activeBrief);
    setLoading(true);
    setLoadingMessage("Identifying project type...");
    setError(null);
    setStep(1);
    setClassification(null);
    setExtraction(null);
    setGaps(null);
    setScope(null);
    setPricing(null);
    setProposal(null);
    setRefinementRound(0);

    try {
      const classificationResult = await classifyBrief(activeBrief);
      setClassification(classificationResult);

      setStep(2);
      setLoadingMessage("Extracting requirements...");
      const extractionResult = await extractRequirements(activeBrief, classificationResult.category);
      setExtraction(extractionResult);

      setStep(3);
      setLoadingMessage("Finding gaps and generating questions...");
      const gapsResult = await detectGaps(activeBrief, classificationResult.category, extractionResult);
      setGaps(gapsResult);
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, () => runFullPipeline(activeBrief)));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const submitRefinement = async (userAnswers) => {
    if (!classification || !extraction) {
      setError(createErrorState("Refinement is not available yet", () => submitRefinement(userAnswers)));
      return;
    }

    setLoading(true);
    setLoadingMessage("Refining with your answers...");
    setError(null);
    setStep(4);

    try {
      const refined = await refineWithAnswers(brief, classification.category, extraction, userAnswers);
      setExtraction(refined);
      setGaps((current) => ({
        missing_info: current?.missing_info ?? [],
        risk_flags: current?.risk_flags ?? [],
        follow_up_questions: refined.new_follow_up_questions,
      }));
      setRefinementRound(refined.refinement_round);
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, () => submitRefinement(userAnswers)));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const continueToProposal = async () => {
    if (!classification || !extraction) {
      setError(createErrorState("Complete the brief analysis before continuing", continueToProposal));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      setStep(5);
      setLoadingMessage("Building project scope...");
      const scopeResult = await buildScope(brief, classification.category, extraction);
      setScope(scopeResult);

      setStep(6);
      setLoadingMessage("Calculating pricing...");
      const pricingResult = await suggestPricing(brief, classification.category, extraction, scopeResult);
      setPricing(pricingResult);

      setStep(7);
      setLoadingMessage("Writing your proposal...");
      const proposalResult = await generateProposal(
        brief,
        classification.category,
        extraction,
        scopeResult,
        pricingResult,
      );
      setProposal(proposalResult);
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, continueToProposal));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return {
    brief,
    classification,
    continueToProposal,
    error,
    extraction,
    gaps,
    loading,
    loadingMessage,
    pricing,
    profileStepLabel,
    proposal,
    refinementRound,
    resetPipeline,
    runFullPipeline,
    scope,
    setBrief,
    step,
    submitRefinement,
  };
}

