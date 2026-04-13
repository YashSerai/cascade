import type { AgentRole, MissionBrief, MissionRun } from "../../../shared/types";
import {
  agentOrder,
  getCrewSpotlight,
  humanizeSurfaceLabel,
  stagePresentation,
  type ChapterState
} from "../presentation";

interface MissionTheaterProps {
  brief: MissionBrief;
  mission: MissionRun;
  chapters: ChapterState[];
  selectedCrewRole: AgentRole;
  onSelectCrew: (role: AgentRole) => void;
  onOpenTechnicalProof: () => void;
}

export function MissionTheater({
  brief,
  mission,
  chapters,
  selectedCrewRole,
  onSelectCrew,
  onOpenTechnicalProof
}: MissionTheaterProps) {
  const stageInfo = stagePresentation[mission.stage];
  const selectedCrew = getCrewSpotlight(selectedCrewRole, brief, mission);
  const recentLogs = mission.artifacts.logs.slice(-4).reverse();
  const primaryBlocker = mission.artifacts.blockers[0] ?? "";

  return (
    <section className="theater-section" id="mission-theater">
      <div className="section-heading theater-heading">
        <div>
          <p className="section-tag">Mission Theater</p>
          <h2>Watch the run unfold.</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenTechnicalProof}>
          Technical proof
        </button>
      </div>

      <div className="theater-shell cinematic-panel">
        <div className="theater-copy">
          <p className="section-tag muted">{stageInfo.chapter}</p>
          <h3>{stageInfo.title}</h3>
          <p className="theater-copy-body">{stageInfo.description}</p>

          <div className="theater-stat-row">
            <div className="theater-stat">
              <span>Objective</span>
              <strong>{brief.selectedObjective}</strong>
            </div>
            <div className="theater-stat">
              <span>Scene</span>
              <strong>{stageInfo.chapter}</strong>
            </div>
            <div className="theater-stat">
              <span>Surface</span>
              <strong>{humanizeSurfaceLabel(brief.impactedAreas[0] ?? brief.repoScan.targetPathHint ?? "main experience")}</strong>
            </div>
          </div>

          <article className={`crew-focus ${selectedCrew.statusTone}`}>
            <div className="crew-focus-header">
              <div>
                <span>{selectedCrew.statusLabel}</span>
                <h4>{selectedCrew.name}</h4>
              </div>
            </div>

            <p className="crew-focus-summary">{selectedCrew.summary}</p>

            <div className="crew-focus-grid">
              <article className="crew-focus-card">
                <span>{selectedCrew.detailTitle}</span>
                <p>{selectedCrew.detailBody}</p>
              </article>
              <article className="crew-focus-card">
                <span>{selectedCrew.audienceTitle}</span>
                <p>{selectedCrew.audienceBody}</p>
              </article>
            </div>
          </article>

          <div className="signal-banner">
            <span>What should feel different</span>
            <strong>{brief.acceptanceCriteria[0] ?? "The product should feel clearer immediately."}</strong>
            <small>{stageInfo.pulse}</small>
          </div>

          {primaryBlocker ? (
            <article className="run-blocker">
              <span>Blocker</span>
              <strong>{primaryBlocker}</strong>
              <p>Clear this and rerun to unlock execution, checks, and proof artifacts.</p>
            </article>
          ) : null}

          <article className="run-ledger">
            <div className="run-ledger-header">
              <div>
                <span>Run ledger</span>
                <strong>What changed in this run</strong>
              </div>
              <small>{mission.stage === "objective_received" ? "Waiting for launch" : "Streaming mission state"}</small>
            </div>

            {recentLogs.length > 0 ? (
              <div className="run-log-stack">
                {recentLogs.map((log) => (
                  <article key={`${log.timestamp}-${log.message}`} className={`run-log ${log.level}`}>
                    <span>{log.level}</span>
                    <p>{log.message}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Once the live run starts, stage changes and blockers will land here.</p>
            )}
          </article>
        </div>

        <div className="constellation-panel">
          <div className="constellation-field">
            <div className="constellation-grid" />
            <svg className="journey-wireframe" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
              <line x1="500" y1="310" x2="190" y2="138" />
              <line x1="500" y1="310" x2="808" y2="146" />
              <line x1="500" y1="310" x2="770" y2="488" />
              <line x1="500" y1="310" x2="210" y2="492" />
            </svg>

            <div className="mission-core-shell">
              <div className="mission-core">
                <span>Mission core</span>
                <strong>{brief.selectedObjective}</strong>
                <small>{brief.implementationBrief}</small>
              </div>
            </div>

            {agentOrder.map((role) => {
              const spotlight = getCrewSpotlight(role, brief, mission);
              const selected = role === selectedCrewRole;

              return (
                <button
                  key={role}
                  type="button"
                  className={`agent-node ${spotlight.statusTone} ${selected ? "selected" : ""} agent-${role}`}
                  onClick={() => onSelectCrew(role)}
                  aria-pressed={selected}
                >
                  <span className="agent-node-status">{spotlight.statusLabel}</span>
                  <strong>{spotlight.name}</strong>
                </button>
              );
            })}
          </div>

          <div className="chapter-rail">
            {chapters.map((chapter) => (
              <article key={chapter.stage} className={`chapter-card ${chapter.state}`}>
                <span>{chapter.chapter}</span>
                <p>{chapter.pulse}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
