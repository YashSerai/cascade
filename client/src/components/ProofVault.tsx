import type { MissionBrief, MissionRun } from "../../../shared/types";
import { formatTimeLabel, getModelLabel, stagePresentation } from "../presentation";

interface ProofVaultProps {
  brief: MissionBrief;
  mission: MissionRun;
  activeMissionId: string | null;
  history: MissionRun[];
  onOpenContinuePrompt: () => void;
  onOpenTechnicalProof: () => void;
}

export function ProofVault({
  brief,
  mission,
  activeMissionId,
  history,
  onOpenContinuePrompt,
  onOpenTechnicalProof
}: ProofVaultProps) {
  const isLiveMission = activeMissionId !== null;
  const passedChecks = mission.artifacts.checks.filter((check) => check.status === "passed").length;
  const stageInfo = stagePresentation[mission.stage];

  return (
    <section className="proof-section" id="proof-vault">
      <div className="section-heading">
        <div>
          <p className="section-tag">Proof Vault</p>
          <h2>Land the mission with confidence, not clutter.</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenTechnicalProof}>
          View Technical Proof
        </button>
      </div>

      <div className="proof-grid">
        <article className="proof-hero cinematic-panel">
          <div className="proof-hero-header">
            <div>
              <p className="section-tag muted">{isLiveMission ? "Live mission outcome" : "Preview ending"}</p>
              <h3>{stageInfo.chapter}</h3>
            </div>
            <span className={`status-pill ${mission.stage === "mission_blocked" ? "blocked" : "supported"}`}>
              {mission.stage === "mission_blocked" ? "Blocker captured" : "Proof packaged"}
            </span>
          </div>

          <p className="proof-summary-copy">{mission.artifacts.summary}</p>

          <div className="proof-metrics">
            <div className="metric-tile">
              <span>Changed surfaces</span>
              <strong>{mission.artifacts.changedFiles.length}</strong>
            </div>
            <div className="metric-tile">
              <span>Checks passed</span>
              <strong>{passedChecks}</strong>
            </div>
            <div className="metric-tile">
              <span>User pain points</span>
              <strong>{brief.painPoints.length}</strong>
            </div>
            <div className="metric-tile">
              <span>Model</span>
              <strong>{getModelLabel(brief)}</strong>
            </div>
          </div>

          <div className="button-column">
            {isLiveMission ? (
              <>
                <a className="secondary-button full" href={`/api/missions/${activeMissionId}/brief.md`}>
                  Download Brief
                </a>
                <button type="button" className="primary-button full" onClick={onOpenContinuePrompt}>
                  Continue Working
                </button>
              </>
            ) : (
              <div className="empty-state">
                Launch a live mission to unlock downloadable proof artifacts and the continuation handoff.
              </div>
            )}
          </div>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">What changed</p>
          <h3>Changed surfaces</h3>
          <ul className="proof-list">
            {mission.artifacts.changedFiles.length > 0 ? (
              mission.artifacts.changedFiles.map((file) => (
                <li key={file.path}>
                  <strong>{file.summary}</strong>
                  <span>{file.path}</span>
                </li>
              ))
            ) : (
              <li className="empty-state">No changed surfaces yet.</li>
            )}
          </ul>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">Why it matters</p>
          <h3>Impact surfaces</h3>
          <ul className="proof-list">
            {brief.impactedAreas.map((area) => (
              <li key={area}>
                <strong>{area}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">Verification</p>
          <h3>Outcome checks</h3>
          <ul className="proof-list">
            {mission.artifacts.checks.length > 0 ? (
              mission.artifacts.checks.map((check) => (
                <li key={`${check.name}-${check.status}`}>
                  <strong>{check.name}</strong>
                  <span>{check.status}</span>
                </li>
              ))
            ) : (
              <li className="empty-state">Verification will land here once the route reaches the vault.</li>
            )}
          </ul>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">Next move</p>
          <h3>Recommended next steps</h3>
          <ul className="proof-list">
            {mission.artifacts.nextSteps.length > 0 ? (
              mission.artifacts.nextSteps.map((step) => (
                <li key={step}>
                  <strong>{step}</strong>
                </li>
              ))
            ) : (
              <li className="empty-state">Next steps will appear after execution or review.</li>
            )}
          </ul>
        </article>

        {mission.artifacts.screenshots.length > 0 ? (
          <article className="proof-card cinematic-panel proof-card-wide">
            <p className="section-tag muted">Visual proof</p>
            <h3>Screenshots</h3>
            <div className="screenshot-list">
              {mission.artifacts.screenshots.map((shot) => (
                <a key={shot.url} className="screenshot-chip" href={shot.url}>
                  {shot.label}
                </a>
              ))}
            </div>
          </article>
        ) : null}

        <article className="proof-card cinematic-panel proof-card-wide">
          <p className="section-tag muted">Mission ledger</p>
          <h3>Recent runs</h3>
          <ul className="ledger-list">
            {history.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{entry.brief.selectedObjective}</strong>
                  <span>{stagePresentation[entry.stage].chapter}</span>
                </div>
                <small>{formatTimeLabel(entry.updatedAt)}</small>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
