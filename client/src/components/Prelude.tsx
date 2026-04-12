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
        <p className="section-tag">Cascade / live mission control</p>
        <h1>Show the work while it ships.</h1>
        <p className="prelude-lead">
          Cascade turns repo changes into a live product story. Drop in a repo, frame the ask, and let the room follow
          progress without reading logs.
        </p>

        <button type="button" className="primary-button hero-button" onClick={onStart}>
          Start a Mission
        </button>

        <div className="prelude-pill-row">
          <span className="signal-pill">Clear route</span>
          <span className="signal-pill">Live progress</span>
          <span className="signal-pill">Proof at handoff</span>
        </div>
      </div>

      <div className="prelude-preview cinematic-panel">
        <div className="preview-header">
          <div>
            <p className="section-tag muted">Mission Preview</p>
            <h2>{brief.missionTitle}</h2>
          </div>
          <span className="preview-progress">Now: {currentChapterLabel}</span>
        </div>

        <div className="preview-meter">
          <div className="preview-meter-fill" style={{ width: `${missionProgress}%` }} />
        </div>

        <div className="preview-summary">
          <span className="preview-summary-kicker">Mission focus</span>
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
      </div>
    </section>
  );
}
