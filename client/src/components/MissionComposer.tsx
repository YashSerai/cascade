import { useEffect, useState } from "react";
import type { MissionBrief, MissionMode } from "../../../shared/types";
import { modePresentation } from "../presentation";

interface MissionComposerProps {
  mode: MissionMode;
  repoUrl: string;
  promptText: string;
  apiKey: string;
  busyState: "idle" | "analyzing" | "launching";
  error: string;
  brief: MissionBrief | null;
  liveBrief: MissionBrief | null;
  onModeChange: (mode: MissionMode) => void;
  onRepoUrlChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onAnalyze: () => void;
  onLaunch: () => void;
  onSelectCandidate: (feature: string) => void;
}

const analyzeLoadingFrames = [
  {
    label: "Clone repo",
    detail: "Pulling the public repo into a temporary workspace so the route can be grounded in real files."
  },
  {
    label: "Read surfaces",
    detail: "Inspecting the app shell, scripts, and likely change files before the route is shown."
  },
  {
    label: "Lock pseudo-plan",
    detail: "Turning the repo scan into role focus, proof targets, and a route the room can follow."
  }
];

export function MissionComposer(props: MissionComposerProps) {
  const {
    mode,
    repoUrl,
    promptText,
    apiKey,
    busyState,
    error,
    brief,
    liveBrief,
    onModeChange,
    onRepoUrlChange,
    onPromptChange,
    onApiKeyChange,
    onAnalyze,
    onLaunch,
    onSelectCandidate
  } = props;

  const modeCopy = modePresentation[mode];
  const isLaunchReady = liveBrief !== null;
  const needsExecutionKey = isLaunchReady && liveBrief?.modelSelection.keyMode === "none" && !apiKey.trim();
  const routeLaneLabel = liveBrief
    ? liveBrief.modelSelection.provider === "vertex-ai"
      ? "Hosted Vertex lane"
      : liveBrief.modelSelection.keyMode === "server"
        ? "Hosted Gemini lane"
        : liveBrief.modelSelection.keyMode === "user"
          ? "Your Gemini key"
          : "Planning lane"
    : "Route appears after analyze";
  const [loadingFrame, setLoadingFrame] = useState(0);
  const activeLoadingSteps = brief?.routePlan.loadingSteps?.length ? brief.routePlan.loadingSteps : analyzeLoadingFrames;

  useEffect(() => {
    if (busyState !== "analyzing") {
      setLoadingFrame(0);
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingFrame((current) => (current + 1) % activeLoadingSteps.length);
    }, 900);

    return () => window.clearInterval(timer);
  }, [busyState, activeLoadingSteps.length]);

  return (
    <section className="composer-section" id="mission-composer">
      <div className="section-heading">
        <div>
          <p className="section-tag">Mission Composer</p>
          <h2>Choose the lane and frame the ask.</h2>
        </div>
        <p className="section-intro">
          Use discovery when the signal is messy, or fix mode when the outcome is already known.
        </p>
      </div>

      <div className={`composer-grid ${brief || busyState === "analyzing" ? "route-ready" : "route-idle"}`}>
        <div className="composer-form cinematic-panel">
          <div className="mode-switch">
            {(Object.keys(modePresentation) as MissionMode[]).map((item) => (
              <button
                key={item}
                type="button"
                className={`mode-card ${item === mode ? "active" : ""}`}
                onClick={() => onModeChange(item)}
              >
                <span className="mode-card-kicker">{modePresentation[item].kicker}</span>
                <strong>{modePresentation[item].label}</strong>
                <small>{modePresentation[item].description}</small>
              </button>
            ))}
          </div>

          <label className="field">
            <span>GitHub repo or file URL</span>
            <input
              value={repoUrl}
              onChange={(event) => onRepoUrlChange(event.target.value)}
              placeholder="https://github.com/owner/repo"
            />
          </label>

          <label className="field">
            <span>{modeCopy.promptLabel}</span>
            <textarea
              value={promptText}
              onChange={(event) => onPromptChange(event.target.value)}
              rows={7}
              placeholder="Describe the product problem, feature, or bug."
            />
          </label>

          <label className="field">
            <span>Gemini key (optional)</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder="Leave blank to use the hosted lane when available."
            />
          </label>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={onAnalyze} disabled={busyState !== "idle"}>
              {busyState === "analyzing" ? "Locking the route..." : "Analyze route"}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onLaunch}
              disabled={!isLaunchReady || busyState !== "idle" || needsExecutionKey}
            >
              {busyState === "launching"
                ? "Starting the run..."
                : needsExecutionKey
                  ? "Add Gemini key to run live"
                  : "Start live run"}
            </button>
          </div>

          {needsExecutionKey ? (
            <p className="launch-hint">
              Analyze works in planning mode. Add a Gemini key above to unlock live execution.
            </p>
          ) : null}

          {error ? <p className="error-message">{error}</p> : null}
        </div>

        {busyState === "analyzing" ? (
          <aside className="composer-readiness cinematic-panel analyzing-route">
            <div className="readiness-header">
              <div>
                <p className="section-tag muted">Route loading</p>
                <h3>Building a repo-aware route.</h3>
              </div>
              <span className="status-pill advisory">Pseudo-plan mode</span>
            </div>

            <div className="route-loading-pulse">
              <div className="route-loading-ring" />
              <div>
                <span>{activeLoadingSteps[loadingFrame]?.label}</span>
                <strong>{activeLoadingSteps[loadingFrame]?.detail}</strong>
              </div>
            </div>

            <div className="route-step-stack">
              {activeLoadingSteps.map((step, index) => (
                <article key={step.label} className={`route-step-card ${index <= loadingFrame ? "active" : ""}`}>
                  <span>{step.label}</span>
                  <p>{step.detail}</p>
                </article>
              ))}
            </div>
          </aside>
        ) : brief ? (
          <aside className="composer-readiness cinematic-panel revealed-panel">
            <div className="readiness-header">
              <div>
                <p className="section-tag muted">Route locked</p>
                <h3>{brief.routePlan.routeHeadline}</h3>
              </div>
              <span className={`status-pill ${brief.repoScan.supportLevel}`}>{brief.routePlan.summaryCards.support.title}</span>
            </div>

            <div className="route-ribbon">
              <span>{routeLaneLabel}</span>
              <strong>{brief.routePlan.ribbonTitle}</strong>
              <small>{brief.routePlan.ribbonSummary}</small>
            </div>

            <div className="readiness-grid">
              <div className="readiness-tile">
                <span>{brief.routePlan.summaryCards.lane.label}</span>
                <strong>{brief.routePlan.summaryCards.lane.title}</strong>
                <small>{brief.routePlan.summaryCards.lane.body}</small>
              </div>
              <div className="readiness-tile">
                <span>{brief.routePlan.summaryCards.support.label}</span>
                <strong>{brief.routePlan.summaryCards.support.title}</strong>
                <small>{brief.routePlan.summaryCards.support.body}</small>
              </div>
              <div className="readiness-tile">
                <span>{brief.routePlan.summaryCards.primarySurface.label}</span>
                <strong>{brief.routePlan.summaryCards.primarySurface.title}</strong>
                <small>{brief.routePlan.summaryCards.primarySurface.body}</small>
              </div>
              <div className="readiness-tile">
                <span>{brief.routePlan.summaryCards.payoff.label}</span>
                <strong>{brief.routePlan.summaryCards.payoff.title}</strong>
                <small>{brief.routePlan.summaryCards.payoff.body}</small>
              </div>
            </div>

            <div className="readiness-block">
              <span>How Cascade will approach it</span>
              <ul>
                {brief.routePlan.journeyMoments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="readiness-block">
              <span>What this run should prove</span>
              <div className="candidate-grid">
                {brief.routePlan.proofTargets.map((target) => (
                  <div key={target} className="candidate-button static">
                    {target}
                  </div>
                ))}
              </div>
            </div>

            <div className="readiness-block">
              <span>Alternate routes</span>
              <div className="candidate-grid">
                {brief.candidateFeatures.map((feature) => (
                  <button key={feature} type="button" className="candidate-button" onClick={() => onSelectCandidate(feature)}>
                    {feature}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        ) : (
          <aside className="composer-placeholder cinematic-panel">
            <p className="section-tag muted">Route hidden</p>
            <h3>The route reveal starts after analysis.</h3>
            <p className="readiness-copy">
              Analyze clones the repo, reads the real app surface, and uses the model output to fill the route cards,
              role focus, and proof targets.
            </p>
            <div className="placeholder-pills">
              <span className="signal-pill">Clone repo</span>
              <span className="signal-pill">Lock pseudo-plan</span>
              <span className="signal-pill">Start run to open theater</span>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}
