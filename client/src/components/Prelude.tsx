import type { MissionBrief, MissionStage } from "../../../shared/types";
import { getCurrentChapterLabel, getPreviewScenes } from "../presentation";

interface PreludeProps {
  brief: MissionBrief;
  missionStage: MissionStage;
  missionProgress: number;
  onStart: () => void;
}

export function Prelude({ brief, missionStage, missionProgress, onStart }: PreludeProps) {
  const previewScenes = getPreviewScenes(missionStage, brief);
  const currentChapterLabel = getCurrentChapterLabel(missionStage);

  return (
    <section className="prelude">
      <div className="prelude-copy">
        <p className="section-tag">Cascade / cinematic mission control</p>
        <h1>Make the wait feel like the show.</h1>
        <p className="prelude-lead">
          Cascade turns repo fixes and opportunity hunts into a front-row product experience. Users paste a repo, choose a
          route, and watch the mission unfold as a cinematic journey instead of a dead terminal stare.
        </p>

        <button type="button" className="primary-button hero-button" onClick={onStart}>
          Start a Mission
        </button>

        <div className="prelude-pill-row">
          <span className="signal-pill">Front-end storytelling</span>
          <span className="signal-pill">Visible progress</span>
          <span className="signal-pill">Demo-ready reveal</span>
        </div>
      </div>

      <div className="prelude-preview cinematic-panel">
        <div className="preview-header">
          <div>
            <p className="section-tag muted">Mission Preview</p>
            <h2>{brief.missionTitle}</h2>
          </div>
          <span className="preview-progress">Now in {currentChapterLabel}</span>
        </div>

        <div className="preview-meter">
          <div className="preview-meter-fill" style={{ width: `${missionProgress}%` }} />
        </div>

        <div className="preview-summary">
          <span className="preview-summary-kicker">What the audience is following</span>
          <strong>{brief.selectedObjective}</strong>
          <p>{brief.implementationBrief}</p>
        </div>

        <div className="preview-scenes">
          {previewScenes.map((scene) => (
            <article key={scene.title} className={`preview-scene ${scene.state}`}>
              <span>{scene.title}</span>
              <p>{scene.body}</p>
            </article>
          ))}
        </div>

        <p className="preview-note">
          Cascade turns the waiting time into a guided story your audience can actually follow from first signal to final reveal.
        </p>
      </div>
    </section>
  );
}
