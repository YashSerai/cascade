import type { CSSProperties } from "react";
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
  const selectedRoleFocus = brief.routePlan.roleFocus[selectedCrewRole];
  const timeline = mission.artifacts.logs.slice(-8);
  const primaryBlocker = mission.artifacts.blockers[0] ?? "";
  const fileNodes = buildFileNodes(brief, mission, selectedRoleFocus.filePaths);

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
        <div className="theater-storyline">
          <div className="mission-marquee">
            <div>
              <span className="section-tag muted">{stageInfo.chapter}</span>
              <h3>{brief.selectedObjective}</h3>
            </div>
            <span className={`status-pill ${mission.stage === "mission_blocked" ? "blocked" : brief.repoScan.supportLevel}`}>
              {mission.stage === "proof_delivered"
                ? "Proof packaged"
                : mission.stage === "mission_blocked"
                  ? "Blocker surfaced"
                  : "Run in motion"}
            </span>
          </div>

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
              <span>Route focus</span>
              <strong>{brief.routePlan.routeHeadline}</strong>
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

            <article className="role-focus-rail">
              <span>Why this role matters now</span>
              <strong>{selectedRoleFocus.headline}</strong>
              <p>{selectedRoleFocus.successSignal}</p>
              <small>Repo elements: {selectedRoleFocus.filePaths.map((item) => humanizeSurfaceLabel(item)).join(", ")}</small>
            </article>
          </article>

          <article className="mission-timeline">
            <div className="run-ledger-header">
              <div>
                <span>Mission timeline</span>
                <strong>Each beat as the run advances</strong>
              </div>
              <small>{timeline.length > 0 ? `${timeline.length} recorded beats` : "Waiting for launch"}</small>
            </div>

            {timeline.length > 0 ? (
              <div className="timeline-list">
                {timeline.map((log, index) => (
                  <article
                    key={`${log.timestamp}-${log.message}`}
                    className={`timeline-card ${log.level}`}
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <div className="timeline-glyph" aria-hidden="true" />
                    <div>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      <strong>{log.message}</strong>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">Once the live run starts, the theater will stream concrete mission beats here.</p>
            )}
          </article>

          {primaryBlocker ? (
            <article className="run-blocker">
              <span>Blocker</span>
              <strong>{primaryBlocker}</strong>
              <p>Use Continue Working to hand the mission off for another pass.</p>
            </article>
          ) : null}
        </div>

        <div className="theater-command-deck">
          <article className="crew-deck">
            <div className="run-ledger-header">
              <div>
                <span>Agent deck</span>
                <strong>Who owns the mission right now</strong>
              </div>
              <small>Tap a role to change the active lens, highlighted files, and route narrative</small>
            </div>

            <div className="agent-deck-grid">
              {agentOrder.map((role, index) => {
                const spotlight = getCrewSpotlight(role, brief, mission);
                const selected = role === selectedCrewRole;

                return (
                  <button
                    key={role}
                    type="button"
                    className={`agent-node ${spotlight.statusTone} ${selected ? "selected" : ""}`}
                    onClick={() => onSelectCrew(role)}
                    aria-pressed={selected}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <span className="agent-node-status">{spotlight.statusLabel}</span>
                    <strong>{spotlight.name}</strong>
                    <em>{brief.routePlan.roleFocus[role].headline}</em>
                    <small>{mission.agents[role].latestAction}</small>
                    <div className="agent-progress-track" aria-hidden="true">
                      <div className="agent-progress-fill" style={{ width: `${mission.agents[role].progress}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </article>

          <article className="file-orbit">
            <div className="run-ledger-header">
              <div>
                <span>Surface graph</span>
                <strong>Files the mission is reading and changing</strong>
              </div>
              <small>{selectedCrew.name} is currently centered on {selectedRoleFocus.filePaths.length} file surface(s)</small>
            </div>

            <div className="orbit-stage">
              <svg className="orbit-lines" viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
                {fileNodes.map((node) => (
                  <line key={node.path} x1="500" y1="320" x2={node.anchorX} y2={node.anchorY} />
                ))}
              </svg>

              <div className="orbit-core">
                <span>Repo core</span>
                <strong>{brief.repoTarget.repo}</strong>
                <small>{brief.repoScan.framework}</small>
              </div>

              {fileNodes.map((node, index) => (
                <article
                  key={node.path}
                  className={`file-node ${node.state}`}
                  style={
                    {
                      "--x": `${node.x}%`,
                      "--y": `${node.y}%`,
                      animationDelay: `${index * 110}ms`
                    } as CSSProperties
                  }
                >
                  <span>{node.label}</span>
                  <strong>{node.path}</strong>
                  <small>{node.summary}</small>
                </article>
              ))}
            </div>
          </article>

          <div className="chapter-rail">
            {chapters.map((chapter, index) => (
              <article
                key={chapter.stage}
                className={`chapter-card ${chapter.state}`}
                style={{ animationDelay: `${index * 70}ms` }}
              >
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

function buildFileNodes(brief: MissionBrief, mission: MissionRun, selectedPaths: string[]) {
  const routeFiles = brief.routePlan.fileMap.map((entry) => entry.path);
  const targetedFiles = mission.artifacts.executionPlan?.targetFiles ?? [];
  const changedFiles = mission.artifacts.changedFiles.map((file) => file.path);
  const uniqueFiles = [...new Set([...changedFiles, ...targetedFiles, ...routeFiles])].slice(0, 6);
  const positions = [
    { x: 15, y: 17, anchorX: 210, anchorY: 126 },
    { x: 70, y: 15, anchorX: 790, anchorY: 118 },
    { x: 79, y: 44, anchorX: 860, anchorY: 286 },
    { x: 67, y: 74, anchorX: 760, anchorY: 510 },
    { x: 18, y: 72, anchorX: 220, anchorY: 494 },
    { x: 10, y: 44, anchorX: 150, anchorY: 302 }
  ];

  return uniqueFiles.map((path, index) => {
    const changed = mission.artifacts.changedFiles.find((file) => file.path === path);
    const targeted = targetedFiles.includes(path);
    const routed = brief.routePlan.fileMap.find((entry) => entry.path === path);
    const state = changed ? "changed" : targeted ? "targeted" : routed ? routed.phase === "verify" ? "verify" : routed.phase === "shape" ? "targeted" : "scanned" : "scanned";
    const position = positions[index] ?? positions[0];
    const isSelected = selectedPaths.includes(path);

    return {
      path,
      label:
        state === "changed" ? "Changed" : state === "targeted" ? "Targeted" : state === "verify" ? "Verification" : "Scanned",
      state: `${state}${isSelected ? " selected" : ""}`,
      summary:
        changed?.summary ??
        routed?.reason ??
        (targeted ? "The execution plan is routed through this file." : "This surfaced during repo scan and route framing."),
      ...position
    };
  });
}
