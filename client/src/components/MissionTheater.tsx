import { type CSSProperties, useMemo } from "react";
import type { AgentRole, MissionBrief, MissionRun, MissionStage } from "../../../shared/types";
import {
  agentOrder,
  agentPresentation,
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
  const fileNodes = useMemo(
    () => buildFileNodes(brief, mission, selectedRoleFocus.filePaths, mission.stage),
    [brief, mission, selectedRoleFocus.filePaths, mission.stage]
  );
  const activeAgentName = agentPresentation[selectedCrewRole].name;

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
                ? "Proof delivered"
                : mission.stage === "mission_blocked"
                  ? "Needs attention"
                  : mission.stage === "execution_underway"
                    ? "Building"
                    : mission.stage === "verification"
                      ? "Verifying"
                      : "In progress"}
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
              <span>What stopped the run</span>
              <strong>{primaryBlocker}</strong>
              {mission.artifacts.blockers.length > 1 ? (
                <p>{mission.artifacts.blockers.length - 1} additional blocker{mission.artifacts.blockers.length > 2 ? "s" : ""} logged. Open the proof vault for details.</p>
              ) : (
                <p>Cascade attempted to resolve this automatically. Use Continue Working to try again with more context.</p>
              )}
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

          <article className={`file-orbit stage-${mission.stage.replace(/_/g, "-")}`}>
            <div className="run-ledger-header">
              <div>
                <span>Surface graph</span>
                <strong>Files the mission is reading and changing</strong>
              </div>
              <small>{activeAgentName} is active on {selectedRoleFocus.filePaths.length} surface{selectedRoleFocus.filePaths.length !== 1 ? "s" : ""}</small>
            </div>

            <div className="orbit-stage">
              <svg className="orbit-lines" viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <filter id="glow-plasma">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="glow-brass">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="glow-green">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>
                {fileNodes.map((node) => {
                  const baseState = node.state.split(" ")[0];
                  const isActive = node.state.includes("selected");
                  const lineClass = `orbit-wire ${baseState}${isActive ? " active" : ""}`;
                  const filterRef = baseState === "changed" ? "url(#glow-brass)"
                    : baseState === "verify" ? "url(#glow-green)"
                    : baseState === "targeted" ? "url(#glow-plasma)"
                    : undefined;

                  return (
                    <g key={node.path}>
                      <line
                        className={lineClass}
                        x1="500" y1="320"
                        x2={node.anchorX} y2={node.anchorY}
                        filter={filterRef}
                      />
                      {[0, 1, 2].map((i) => (
                        <circle
                          key={i}
                          className={`orbit-particle ${baseState}`}
                          cx="500" cy="320" r={baseState === "changed" ? 3.5 : 2.5}
                          style={{
                            "--tx": `${node.anchorX - 500}px`,
                            "--ty": `${node.anchorY - 320}px`,
                            animationDelay: `${i * (baseState === "changed" ? 800 : baseState === "targeted" ? 1100 : 1600)}ms`,
                          } as CSSProperties}
                        />
                      ))}
                      {isActive ? (
                        <text
                          className="orbit-agent-label"
                          x={(500 + node.anchorX) / 2}
                          y={(320 + node.anchorY) / 2 - 10}
                          textAnchor="middle"
                        >
                          {activeAgentName}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
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
                  <span className="file-node-badge">{node.label}</span>
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

const outerPositions = [
  { x: 14, y: 16, anchorX: 200, anchorY: 120 },
  { x: 72, y: 14, anchorX: 800, anchorY: 110 },
  { x: 82, y: 46, anchorX: 880, anchorY: 300 },
  { x: 70, y: 78, anchorX: 770, anchorY: 530 },
  { x: 16, y: 76, anchorX: 210, anchorY: 510 },
  { x: 8, y: 46, anchorX: 140, anchorY: 300 }
];

const innerPositions = [
  { x: 24, y: 26, anchorX: 290, anchorY: 190 },
  { x: 64, y: 24, anchorX: 710, anchorY: 180 },
  { x: 72, y: 50, anchorX: 790, anchorY: 330 },
  { x: 62, y: 72, anchorX: 690, anchorY: 490 },
  { x: 26, y: 70, anchorX: 300, anchorY: 470 },
  { x: 18, y: 50, anchorX: 230, anchorY: 330 }
];

function getPositionsForStage(stage: MissionStage, state: string, index: number) {
  const isActiveFile = state === "changed" || state === "targeted";
  const pullInward = (stage === "execution_underway" || stage === "verification") && isActiveFile;
  return pullInward ? (innerPositions[index] ?? innerPositions[0]) : (outerPositions[index] ?? outerPositions[0]);
}

function buildFileNodes(brief: MissionBrief, mission: MissionRun, selectedPaths: string[], stage: MissionStage) {
  const routeFiles = brief.routePlan.fileMap.map((entry) => entry.path);
  const targetedFiles = mission.artifacts.executionPlan?.targetFiles ?? [];
  const changedFiles = mission.artifacts.changedFiles.map((file) => file.path);
  const uniqueFiles = [...new Set([...changedFiles, ...targetedFiles, ...routeFiles])].slice(0, 6);

  return uniqueFiles.map((path, index) => {
    const changed = mission.artifacts.changedFiles.find((file) => file.path === path);
    const targeted = targetedFiles.includes(path);
    const routed = brief.routePlan.fileMap.find((entry) => entry.path === path);
    const state = changed ? "changed" : targeted ? "targeted" : routed ? routed.phase === "verify" ? "verify" : routed.phase === "shape" ? "targeted" : "scanned" : "scanned";
    const position = getPositionsForStage(stage, state, index);
    const isSelected = selectedPaths.includes(path);

    return {
      path,
      label:
        stage === "proof_delivered" && state === "changed" ? "Delivered"
        : stage === "verification" && state === "changed" ? "Verifying"
        : state === "changed" ? "Writing"
        : state === "targeted" ? "Reading"
        : state === "verify" ? "Checking"
        : "Scanned",
      state: `${state}${isSelected ? " selected" : ""}`,
      summary:
        changed?.summary ??
        routed?.reason ??
        (targeted ? "The execution plan is routed through this file." : "Surfaced during repo scan."),
      ...position
    };
  });
}
