import type { MissionBrief, MissionRun } from "../../../shared/types";
import { formatTimeLabel, humanizeCheckName, humanizeCheckStatus, humanizeSurfaceLabel, stagePresentation } from "../presentation";

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
          <h2>Close the loop with proof.</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenTechnicalProof}>
          Technical proof
        </button>
      </div>

      <div className="proof-grid">
        <article className="proof-hero cinematic-panel">
          <div className="proof-hero-header">
            <div>
              <p className="section-tag muted">{isLiveMission ? "Live outcome" : "Preview finish"}</p>
              <h3>{stageInfo.chapter}</h3>
            </div>
            <span className={`status-pill ${mission.stage === "mission_blocked" ? "blocked" : "supported"}`}>
              {mission.stage === "mission_blocked" ? "Blocker logged" : "Proof ready"}
            </span>
          </div>

          <p className="proof-summary-copy">{mission.artifacts.summary}</p>

          <div className="proof-metrics">
            <div className="metric-tile">
              <span>Files touched</span>
              <strong>{mission.artifacts.changedFiles.length}</strong>
            </div>
            <div className="metric-tile">
              <span>Checks passed</span>
              <strong>{passedChecks}</strong>
            </div>
            <div className="metric-tile">
              <span>Pain points</span>
              <strong>{brief.painPoints.length}</strong>
            </div>
            <div className="metric-tile">
              <span>Next steps</span>
              <strong>{mission.artifacts.nextSteps.length}</strong>
            </div>
          </div>

          <div className="button-column">
            {isLiveMission ? (
              <>
                <a className="secondary-button full" href={`/api/missions/${activeMissionId}/brief.md`}>
                  Download brief
                </a>
                <button type="button" className="primary-button full" onClick={onOpenContinuePrompt}>
                  Continue mission
                </button>
              </>
            ) : (
              <div className="empty-state">Run a live mission to unlock the brief download and continue prompt.</div>
            )}
          </div>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">What changed</p>
          <h3>Files touched</h3>
          <ul className="proof-list">
            {mission.artifacts.changedFiles.length > 0 ? (
              mission.artifacts.changedFiles.map((file) => (
                <li key={file.path}>
                  <strong>{file.summary}</strong>
                  <span>{humanizeSurfaceLabel(file.path)}</span>
                </li>
              ))
            ) : (
              <li className="empty-state">No changed surfaces yet.</li>
            )}
          </ul>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">Why it matters</p>
          <h3>Impact areas</h3>
          <ul className="proof-list">
            {brief.impactedAreas.map((area) => (
              <li key={area}>
                <strong>{humanizeSurfaceLabel(area)}</strong>
              </li>
            ))}
          </ul>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">Verification</p>
          <h3>Checks</h3>
          <ul className="proof-list">
            {mission.artifacts.checks.length > 0 ? (
              mission.artifacts.checks.map((check) => (
                <li key={`${check.name}-${check.status}`}>
                  <strong>{humanizeCheckName(check.name)}</strong>
                  <span>{humanizeCheckStatus(check.status)}</span>
                </li>
              ))
            ) : (
              <li className="empty-state">Verification will land here once the route reaches the vault.</li>
            )}
          </ul>
        </article>

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">Next move</p>
          <h3>Next steps</h3>
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

        <article className="proof-card cinematic-panel">
          <p className="section-tag muted">Pull request</p>
          <h3>PR draft</h3>
          <ul className="proof-list">
            {mission.artifacts.pullRequestDraft ? (
              <>
                <li>
                  <strong>{mission.artifacts.pullRequestDraft.title}</strong>
                  <span>{mission.artifacts.pullRequestDraft.summary}</span>
                </li>
                {mission.artifacts.pullRequestDraft.checklist.map((item) => (
                  <li key={item}>
                    <strong>{item}</strong>
                  </li>
                ))}
              </>
            ) : (
              <li className="empty-state">A PR-ready summary will appear after execution packages the mission.</li>
            )}
          </ul>
        </article>

        {mission.artifacts.screenshots.length > 0 ? (
          <article className="proof-card cinematic-panel proof-card-wide">
            <p className="section-tag muted">Visual proof</p>
            <h3>Captured screens</h3>
            <div className="screenshot-list">
              {mission.artifacts.screenshots.map((shot) => (
                <a key={shot.url} className="screenshot-chip" href={shot.url}>
                  {shot.label}
                </a>
              ))}
            </div>
          </article>
        ) : (
          <article className="proof-card cinematic-panel proof-card-wide">
            <p className="section-tag muted">Visual proof</p>
            <h3>Proof shots to capture</h3>
            <ul className="proof-list">
              {brief.routePlan.proofTargets.map((target) => (
                <li key={target}>
                  <strong>{target}</strong>
                </li>
              ))}
            </ul>
          </article>
        )}

        <article className="proof-card cinematic-panel proof-card-wide">
          <p className="section-tag muted">Mission ledger</p>
          <h3>Recent missions</h3>
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
