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

  return (
    <section className="composer-section" id="mission-composer">
      <div className="section-heading">
        <div>
          <p className="section-tag">Mission Composer</p>
          <h2>Choose the lane, shape the ask, and stage the route.</h2>
        </div>
        <p className="section-intro">
          This is where the product story gets locked: either find the smartest improvement or deliver one specific visible fix.
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
            <span>Public GitHub repo or file URL</span>
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
              rows={8}
              placeholder="Describe the feature, the bug, or the repeated user friction."
            />
          </label>

          <label className="field">
            <span>Bring your own Gemini key (optional)</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder="Leave blank to use the hosted demo lane when available."
            />
          </label>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={onAnalyze} disabled={busyState !== "idle"}>
              {busyState === "analyzing" ? "Charting the route..." : "Analyze the Mission"}
            </button>
            <button type="button" className="secondary-button" onClick={onLaunch} disabled={!isLaunchReady || busyState !== "idle"}>
              {busyState === "launching" ? "Opening the theater..." : "Launch the Theater"}
            </button>
          </div>

          {error ? <p className="error-message">{error}</p> : null}
        </div>

        <aside className="composer-readiness cinematic-panel">
          <div className="readiness-header">
            <div>
              <p className="section-tag muted">{liveBrief ? "Route selected" : "Preview route"}</p>
              <h3>{brief.selectedObjective}</h3>
            </div>
            <span className={`status-pill ${brief.repoScan.supportLevel}`}>{support.label}</span>
          </div>

          <p className="readiness-copy">{brief.rationale}</p>

          <div className="readiness-grid">
            <div className="readiness-tile">
              <span>Mission lane</span>
              <strong>{modeCopy.label}</strong>
              <small>{modeCopy.description}</small>
            </div>
            <div className="readiness-tile">
              <span>Delivery path</span>
              <strong>{support.label}</strong>
              <small>{support.body}</small>
            </div>
            <div className="readiness-tile">
              <span>Main touchpoint</span>
              <strong>{humanizeSurfaceLabel(brief.impactedAreas[0] ?? brief.repoScan.targetPathHint ?? "main experience")}</strong>
              <small>The change should feel most obvious here when the reveal lands.</small>
            </div>
            <div className="readiness-tile">
              <span>Audience payoff</span>
              <strong>{brief.acceptanceCriteria[0] ?? "The experience should feel clearer at a glance."}</strong>
              <small>{brief.acceptanceCriteria[1] ?? "Cascade is aiming for a reveal that feels obvious, not technical."}</small>
            </div>
          </div>

          <div className="readiness-block">
            <span>Acceptance bar</span>
            <ul>
              {brief.acceptanceCriteria.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="readiness-block">
            <span>Other promising routes</span>
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
