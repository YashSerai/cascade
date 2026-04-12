import type { MissionBrief, MissionRun } from "../../../shared/types";
import {
  agentOrder,
  agentPresentation,
  formatTimeLabel,
  getModelLabel,
  stagePresentation,
  type ChapterState,
  type StoryMoment
} from "../presentation";

interface MissionTheaterProps {
  brief: MissionBrief;
  mission: MissionRun;
  missionProgress: number;
  chapters: ChapterState[];
  storyMoments: StoryMoment[];
  onOpenTechnicalProof: () => void;
}

export function MissionTheater({
  brief,
  mission,
  missionProgress,
  chapters,
  storyMoments,
  onOpenTechnicalProof
}: MissionTheaterProps) {
  const stageInfo = stagePresentation[mission.stage];
  const latestLog = mission.artifacts.logs.at(-1);

  return (
    <section className="theater-section" id="mission-theater">
      <div className="section-heading theater-heading">
        <div>
          <p className="section-tag">Mission Theater</p>
          <h2>The waiting room becomes the product moment.</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onOpenTechnicalProof}>
          Open Technical Proof
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
              <span>Mission pulse</span>
              <strong>{Math.round(missionProgress)}%</strong>
            </div>
            <div className="theater-stat">
              <span>Model</span>
              <strong>{getModelLabel(brief)}</strong>
            </div>
          </div>

          <div className="story-grid">
            {storyMoments.map((moment) => (
              <article key={moment.eyebrow} className="story-card">
                <span>{moment.eyebrow}</span>
                <strong>{moment.title}</strong>
                <p>{moment.body}</p>
              </article>
            ))}
          </div>

          <div className="signal-banner">
            <span>Latest pulse</span>
            <strong>{latestLog ? latestLog.message : stageInfo.pulse}</strong>
            <small>{latestLog ? formatTimeLabel(latestLog.timestamp) : "seeded preview"}</small>
          </div>
        </div>

        <div className="constellation-panel">
          <div className="constellation-field">
            <div className="constellation-grid" />
            <div className="constellation-ring ring-outer" />
            <div className="constellation-ring ring-inner" />
            <div className="constellation-link link-pm" />
            <div className="constellation-link link-architect" />
            <div className="constellation-link link-executor" />
            <div className="constellation-link link-qa" />

            <div className="mission-core">
              <span>Mission core</span>
              <strong>{brief.selectedObjective}</strong>
              <small>{stageInfo.pulse}</small>
            </div>

            {agentOrder.map((role) => {
              const agent = mission.agents[role];
              const info = agentPresentation[role];
              const active = agent.status === "active" || agent.status === "blocked";

              return (
                <article
                  key={role}
                  className={`agent-node ${info.orbitClass} ${agent.status} ${active ? "active" : ""}`}
                >
                  <span>{info.roleLabel}</span>
                  <strong>{info.name}</strong>
                  <small>{agent.progress}%</small>
                </article>
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
