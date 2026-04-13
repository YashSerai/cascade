import type { MissionBrief, MissionStage } from "../../../shared/types";
import { getCurrentChapterLabel, getPreviewScenes } from "../presentation";

interface PreludeProps {
  brief: MissionBrief | null;
  missionStage: MissionStage;
  missionProgress: number;
  isAnalyzing: boolean;
  onStart: () => void;
}

const emptyScenes = [
  { title: "Clone repo", body: "Appears here after Analyze route runs against your URL.", state: "pending" as const },
  { title: "Read surfaces", body: "Real file context and summaries show up post-scan.", state: "pending" as const },
  { title: "Lock route", body: "Personalized steps and proof targets fill in next.", state: "pending" as const }
];

export function Prelude({ brief, missionStage, missionProgress, isAnalyzing, onStart }: PreludeProps) {
  const hasBrief = brief !== null;
  const previewScenes = hasBrief ? getPreviewScenes(missionStage, brief) : emptyScenes;
  const statusLabel = isAnalyzing && !hasBrief ? "Analyzing repository…" : `Now: ${getCurrentChapterLabel(missionStage)}`;

  return (
    <section className="prelude">
      <div className="prelude-copy">
        <p className="section-tag">Cascade / live mission control</p>
        <h1>Ship the story the room can follow.</h1>
        <p className="prelude-lead">
          Paste a public repo, describe the change, and run a live mission: clone, scan, patch, verify, proof — with PM,
          Architect, Builder, and QA on screen so judges see the work, not a log tail.
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

      <div className={`prelude-preview cinematic-panel${isAnalyzing && !hasBrief ? " prelude-preview-analyzing" : ""}${!hasBrief ? " prelude-preview-idle" : ""}`}>
        <div className="preview-header">
          <div>
            <p className="section-tag muted">Mission Preview</p>
            <h2>{hasBrief ? brief.missionTitle : "Waiting for analyze"}</h2>
          </div>
          <span className="preview-progress">{statusLabel}</span>
        </div>

        <div className="preview-meter">
          <div className="preview-meter-fill" style={{ width: `${hasBrief || isAnalyzing ? missionProgress : 8}%` }} />
        </div>

        <div className={`preview-summary${!hasBrief ? " preview-summary-idle" : ""}`}>
          <span className="preview-summary-kicker">Mission focus</span>
          {hasBrief ? (
            <>
              <strong>{brief.selectedObjective}</strong>
              <p>{brief.implementationBrief}</p>
            </>
          ) : (
            <>
              <strong className="preview-placeholder-title">No mission loaded</strong>
              <p>
                Click <strong>Analyze route</strong> to clone your repo, scan real files, and generate a personalized,
                repo-aware mission preview here.
              </p>
            </>
          )}
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
