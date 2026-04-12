import type { MissionBrief } from "../../../shared/types";
import type { ChapterState } from "../presentation";

interface PreludeProps {
  brief: MissionBrief;
  missionProgress: number;
  chapters: ChapterState[];
  onStart: () => void;
}

export function Prelude({ brief, missionProgress, chapters, onStart }: PreludeProps) {
  const previewChapters = [chapters[0], chapters[Math.min(2, chapters.length - 1)], chapters[chapters.length - 1]];

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
          <span className="signal-pill">{brief.repoScan.framework}</span>
          <span className="signal-pill">{brief.repoScan.supportLevel}</span>
          <span className="signal-pill">{brief.repoTarget.owner + "/" + brief.repoTarget.repo}</span>
        </div>
      </div>

      <div className="prelude-preview cinematic-panel">
        <div className="preview-header">
          <div>
            <p className="section-tag muted">Live preview</p>
            <h2>{brief.missionTitle}</h2>
          </div>
          <span className="preview-progress">{Math.round(missionProgress)}%</span>
        </div>

        <div className="preview-core">
          <div className="preview-grid" />
          <div className="preview-ring preview-ring-a" />
          <div className="preview-ring preview-ring-b" />
          <div className="preview-orb preview-orb-pm">PM</div>
          <div className="preview-orb preview-orb-architect">AR</div>
          <div className="preview-orb preview-orb-executor">EX</div>
          <div className="preview-orb preview-orb-qa">QA</div>

          <div className="preview-heart">
            <span className="preview-heart-kicker">Mission core</span>
            <strong>{brief.selectedObjective}</strong>
            <small>{previewChapters[1]?.pulse ?? brief.implementationBrief}</small>
          </div>
        </div>

        <div className="preview-rail">
          {previewChapters.map((chapter) => (
            <article key={chapter.stage} className={`preview-chapter ${chapter.state}`}>
              <span>{chapter.chapter}</span>
              <small>{chapter.pulse}</small>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
