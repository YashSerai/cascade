import type { MissionBrief, MissionMode } from "../../../shared/types";
import { getSupportPresentation, humanizeSurfaceLabel, modePresentation } from "../presentation";

interface MissionComposerProps {
  mode: MissionMode;
  repoUrl: string;
  promptText: string;
  apiKey: string;
  busyState: "idle" | "analyzing" | "launching";
  error: string;
  brief: MissionBrief;
  liveBrief: MissionBrief | null;
  onModeChange: (mode: MissionMode) => void;
  onRepoUrlChange: (value: string) => void;
  onPromptChange: (value: string) => void;
  onApiKeyChange: (value: string) => void;
  onAnalyze: () => void;
  onLaunch: () => void;
  onSelectCandidate: (feature: string) => void;
}

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

  const support = getSupportPresentation(brief.repoScan.supportLevel);
  const modeCopy = modePresentation[mode];
  const isLaunchReady = liveBrief !== null;
  const needsExecutionKey = isLaunchReady && liveBrief?.modelSelection.keyMode === "none" && !apiKey.trim();

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

      <div className="composer-grid">
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
                {busyState === "analyzing" ? "Reading the route..." : "Analyze route"}
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
              Analyze works in heuristic mode, but live execution needs BYOK or a hosted server Gemini key.
            </p>
          ) : null}

          {error ? <p className="error-message">{error}</p> : null}
        </div>

        <aside className="composer-readiness cinematic-panel">
          <div className="readiness-header">
            <div>
              <p className="section-tag muted">{liveBrief ? "Route locked" : "Route preview"}</p>
              <h3>{brief.selectedObjective}</h3>
            </div>
            <span className={`status-pill ${brief.repoScan.supportLevel}`}>{support.label}</span>
          </div>

          <p className="readiness-copy">{brief.rationale}</p>

          <div className="readiness-grid">
            <div className="readiness-tile">
              <span>Lane</span>
              <strong>{modeCopy.label}</strong>
              <small>{modeCopy.description}</small>
            </div>
            <div className="readiness-tile">
              <span>Support</span>
              <strong>{support.label}</strong>
              <small>{support.body}</small>
            </div>
            <div className="readiness-tile">
              <span>Primary surface</span>
              <strong>{humanizeSurfaceLabel(brief.impactedAreas[0] ?? brief.repoScan.targetPathHint ?? "main experience")}</strong>
              <small>This is where the change should read first.</small>
            </div>
            <div className="readiness-tile">
              <span>Payoff</span>
              <strong>{brief.acceptanceCriteria[0] ?? "The result should feel clear at a glance."}</strong>
              <small>{brief.acceptanceCriteria[1] ?? "The reveal should be obvious without reading a diff."}</small>
            </div>
          </div>

          <div className="readiness-block">
            <span>Success looks like</span>
            <ul>
              {brief.acceptanceCriteria.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
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
      </div>
    </section>
  );
}
