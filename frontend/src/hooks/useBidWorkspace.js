import { useState } from "react";
import {
  generateWorkspacePackage,
  improveWorkspaceProposal,
  refineWorkspace,
  startWorkspace,
  submitWorkspaceFeedback,
} from "../api/client.js";

export const WORKSPACE_STAGES = [
  { id: "intake", label: "Intake" },
  { id: "analysis", label: "Analysis" },
  { id: "clarification", label: "Clarify" },
  { id: "package", label: "Package" },
  { id: "quality_review", label: "Quality" },
  { id: "improved", label: "Improve" },
  { id: "feedback", label: "Feedback" },
];

const INITIAL_STATE = {
  brief: "",
  preferences: {
    region: "US/global USD",
    urgency: "normal",
  },
  workspace: null,
  bidPackage: null,
  evaluation: null,
  improvedProposal: null,
  feedbackReceipt: null,
};

function createErrorState(message, retryFn) {
  return { message, retryFn };
}

function hasOpenQuestions(workspace) {
  return Boolean(workspace?.gaps?.follow_up_questions?.length);
}

function nextStageAfterAnalysis(workspace) {
  return hasOpenQuestions(workspace) ? "clarification" : "analysis";
}

export function useBidWorkspace() {
  const [state, setState] = useState(INITIAL_STATE);
  const [stage, setStage] = useState("intake");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState(null);

  const resetWorkspace = () => {
    setState(INITIAL_STATE);
    setStage("intake");
    setLoading(false);
    setLoadingMessage("");
    setError(null);
  };

  const startAnalysis = async (brief, preferences = state.preferences) => {
    const activeBrief = typeof brief === "string" ? brief.trim() : "";

    if (activeBrief.length < 10) {
      setError(createErrorState("Brief must be at least 10 characters.", () => startAnalysis(activeBrief, preferences)));
      return;
    }

    setLoading(true);
    setLoadingMessage("Analyzing brief, retrieving local knowledge, and finding gaps...");
    setError(null);
    setStage("analysis");
    setState({
      ...INITIAL_STATE,
      brief: activeBrief,
      preferences,
    });

    try {
      const workspace = await startWorkspace(activeBrief, preferences);
      setState((current) => ({
        ...current,
        brief: activeBrief,
        preferences,
        workspace,
      }));
      setStage(nextStageAfterAnalysis(workspace));
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, () => startAnalysis(activeBrief, preferences)));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const submitClarifications = async (userAnswers) => {
    if (!state.workspace) {
      setError(createErrorState("Run analysis before submitting clarifications.", () => submitClarifications(userAnswers)));
      return;
    }

    setLoading(true);
    setLoadingMessage("Refining requirements with your answers...");
    setError(null);
    setStage("clarification");

    try {
      const workspace = await refineWorkspace({
        workspace_id: state.workspace.workspace_id,
        brief: state.brief,
        preferences: state.preferences,
        classification: state.workspace.classification,
        extraction: state.workspace.extraction,
        ragContext: state.workspace.ragContext,
        userAnswers,
      });

      setState((current) => ({
        ...current,
        workspace,
        bidPackage: null,
        evaluation: null,
        improvedProposal: null,
      }));
      setStage(nextStageAfterAnalysis(workspace));
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, () => submitClarifications(userAnswers)));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const generatePackage = async () => {
    if (!state.workspace?.classification || !state.workspace?.extraction) {
      setError(createErrorState("Complete workspace analysis before generating a package.", generatePackage));
      return;
    }

    setLoading(true);
    setLoadingMessage("Generating grounded scope, pricing, proposal, and quality review...");
    setError(null);
    setStage("package");

    try {
      const result = await generateWorkspacePackage({
        workspace_id: state.workspace.workspace_id,
        brief: state.brief,
        preferences: state.preferences,
        classification: state.workspace.classification,
        extraction: state.workspace.extraction,
        ragContext: state.workspace.ragContext,
      });

      setState((current) => ({
        ...current,
        bidPackage: result.package,
        evaluation: result.evaluation,
        workspace: {
          ...current.workspace,
          ragContext: result.ragContext || current.workspace.ragContext,
          similar_projects: result.similar_projects || current.workspace.similar_projects,
        },
      }));
      setStage("quality_review");
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, generatePackage));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const improveProposal = async () => {
    if (!state.bidPackage?.proposal || !state.evaluation) {
      setError(createErrorState("Generate a package before improving the proposal.", improveProposal));
      return;
    }

    setLoading(true);
    setLoadingMessage("Improving proposal with evaluator feedback...");
    setError(null);

    try {
      const result = await improveWorkspaceProposal({
        workspace_id: state.workspace.workspace_id,
        brief: state.brief,
        classification: state.workspace.classification,
        extraction: state.workspace.extraction,
        ragContext: state.workspace.ragContext,
        scope: state.bidPackage.scope,
        pricing: state.bidPackage.pricing,
        proposal: state.bidPackage.proposal,
        evaluation: state.evaluation,
      });

      setState((current) => ({
        ...current,
        improvedProposal: result.proposal,
      }));
      setStage("improved");
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, improveProposal));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  const submitFeedback = async (feedback) => {
    if (!state.workspace?.classification) {
      setError(createErrorState("Feedback is available after analysis.", () => submitFeedback(feedback)));
      return;
    }

    setLoading(true);
    setLoadingMessage("Saving lightweight feedback hints...");
    setError(null);

    try {
      const receipt = await submitWorkspaceFeedback({
        workspace_id: state.workspace.workspace_id,
        category: state.workspace.classification.category,
        subcategory: state.workspace.classification.subcategory,
        ...feedback,
      });

      setState((current) => ({
        ...current,
        feedbackReceipt: receipt,
      }));
      setStage("feedback");
    } catch (caughtError) {
      setError(createErrorState(caughtError.message, () => submitFeedback(feedback)));
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  };

  return {
    ...state,
    error,
    generatePackage,
    improveProposal,
    loading,
    loadingMessage,
    resetWorkspace,
    stage,
    startAnalysis,
    submitClarifications,
    submitFeedback,
  };
}
