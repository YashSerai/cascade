import { useEffect, useMemo, useState } from "react";
import { analyzeMission, getContinuePrompt, startMission, subscribeToMission } from "./api";
import { seededBrief, seededMission } from "../../shared/mock";
import type { AgentRole, MissionBrief, MissionMode, MissionRun } from "../../shared/types";

const stageLabels: Record<MissionRun["stage"], string> = {
  objective_received: "Objective Received",
  recon: "Recon",
  plan_locked: "Plan Locked",
  execution_underway: "Execution Underway",
  verification: "Verification",
  proof_delivered: "Proof Delivered",
  mission_blocked: "Mission Blocked"
};

const stageOrder: Exclude<MissionRun["stage"], "mission_blocked">[] = [
  "objective_received",
  "recon",
  "plan_locked",
  "execution_underway",
  "verification",
  "proof_delivered"
];

const stageDescriptions: Record<Exclude<MissionRun["stage"], "mission_blocked">, string> = {
  objective_received: "Signal converted into a concrete mission target.",
  recon: "Repo shape, framework, and likely impact zones are mapped.",
  plan_locked: "The route is chosen and the acceptance bar is fixed.",
  execution_underway: "The active patch is moving through the repo surface.",
  verification: "Checks and proof are gathered before the reveal.",
  proof_delivered: "Exports unlock and the mission lands with evidence."
};

const agentNames: Record<AgentRole, string> = {
  pm: "Pathfinder",
  architect: "Cartographer",
  executor: "Maker",
  qa: "Sentinel"
};

const agentAccents: Record<AgentRole, string> = {
  pm: "dawn",
  architect: "tide",
  executor: "ember",
  qa: "mint"
};

export default function App() {
  const [mode, setMode] = useState<MissionMode>("discover");
  const [repoUrl, setRepoUrl] = useState("https://github.com/vercel/satori");
  const [promptText, setPromptText] = useState(
    "Customer feedback says the first-run experience is confusing. People want clearer onboarding, fewer dead ends, and a stronger sense of progress."
  );
  const [apiKey, setApiKey] = useState("");
  const [brief, setBrief] = useState<MissionBrief | null>(null);
  const [activeMission, setActiveMission] = useState<MissionRun | null>(null);
  const [history, setHistory] = useState<MissionRun[]>([]);
  const [continuePrompt, setContinuePrompt] = useState("");
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [error, setError] = useState("");
  const [busyState, setBusyState] = useState<"idle" | "analyzing" | "launching">("idle");

  useEffect(() => {
    if (!activeMission) {
      return;
    }

    const unsubscribe = subscribeToMission(activeMission.id, (mission) => {
      setActiveMission(mission);
      setHistory((previous) => mergeHistory(previous, mission));
    });

    return unsubscribe;
  }, [activeMission?.id]);

  const visibleMission = activeMission ?? seededMission;
  const visibleBrief = brief ?? activeMission?.brief ?? seededBrief;
  const promptLabel = mode === "discover" ? "Feedback, meeting notes, or customer pain" : "Feature request or bug to implement";
  const modelLabel = visibleBrief.modelSelection.activeModel ?? visibleBrief.modelSelection.requestedModel ?? "heuristic mode";
  const historyVisible = history.length > 0 ? history : [seededMission];
  const currentStageIndex =
    visibleMission.stage === "mission_blocked" ? stageOrder.indexOf("verification") : stageOrder.indexOf(visibleMission.stage);

  const missionProgress = useMemo(() => {
    if (visibleMission.stage === "mission_blocked") {
      return 86;
    }

    const index = stageOrder.indexOf(visibleMission.stage);
    return Math.max(12, ((index + 1) / stageOrder.length) * 100);
  }, [visibleMission.stage]);

  async function handleAnalyze() {
    setBusyState("analyzing");
    setError("");
    try {
      const response = await analyzeMission({
        repoUrl,
        mode,
        promptText,
        apiKey: apiKey.trim() || undefined
      });
      setBrief(response.brief);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analyze failed.");
    } finally {
      setBusyState("idle");
    }
  }

  async function handleLaunch() {
    if (!brief) {
      return;
    }

    setBusyState("launching");
    setError("");
    try {
      const response = await startMission({ brief, apiKey: apiKey.trim() || undefined });
      setActiveMission(response.mission);
      setHistory((previous) => mergeHistory(previous, response.mission));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Mission launch failed.");
    } finally {
      setBusyState("idle");
    }
  }

  async function handleOpenContinuePrompt() {
    if (!activeMission) {
      return;
    }

    const content = await getContinuePrompt(activeMission.id);
    setContinuePrompt(content);
    setShowContinuePrompt(true);
  }

  function loadAlternateFeature(feature: string) {
    setMode("mission");
    setPromptText(`Implement this improvement in the repo: ${feature}`);
  }

  return (
    <div className="app-shell">
      <div className="aurora aurora-left" />
      <div className="aurora aurora-right" />
      <div className="terrain-noise" />

      <header className="masthead">
        <div className="masthead-copy">
          <p className="eyebrow">Cascade / mission control</p>
          <h1>Guide a repo through a visual adventure, not a terminal transcript.</h1>
          <p className="hero-copy">
            Paste a public GitHub repo or file URL, add product signal or a direct request, and watch the mission route narrow
            toward proof.
          </p>
          <div className="badge-row">
            <Badge>{modelLabel}</Badge>
            <Badge>{visibleBrief.repoScan.supportLevel}</Badge>
            <Badge>{visibleBrief.repoScan.framework}</Badge>
            <Badge>Cloud Run live</Badge>
          </div>
        </div>

        <aside className="masthead-panel glass-card">
          <p className="section-kicker">Current expedition</p>
          <h2>{visibleBrief.selectedObjective}</h2>
          <p>{visibleBrief.implementationBrief}</p>

          <div className="progress-meter">
            <div className="progress-meter-fill" style={{ width: `${missionProgress}%` }} />
          </div>

          <div className="meter-grid">
            <Stat label="Active stage" value={stageLabels[visibleMission.stage]} />
            <Stat label="Confidence" value={`${Math.round(visibleBrief.confidence * 100)}%`} />
            <Stat label="Target repo" value={`${visibleBrief.repoTarget.owner}/${visibleBrief.repoTarget.repo}`} />
            <Stat label="Key mode" value={visibleBrief.modelSelection.keyMode} />
          </div>
        </aside>
      </header>

      <main className="experience-grid">
        <section className="intake-card glass-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">Mission intake</p>
              <h2>Choose the signal source and launch the route.</h2>
            </div>
            <div className="support-pill">{visibleBrief.repoScan.supportReason}</div>
          </div>

          <div className="mode-toggle">
            {(["discover", "mission"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={item === mode ? "active" : ""}
                onClick={() => setMode(item)}
              >
                <span>{item === "discover" ? "Discover" : "Mission"}</span>
                <small>{item === "discover" ? "Turn notes into a chosen feature" : "Drive a direct fix or feature"}</small>
              </button>
            ))}
          </div>

          <label className="field">
            <span>Public GitHub repo or file URL</span>
            <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/owner/repo" />
          </label>

          <label className="field">
            <span>{promptLabel}</span>
            <textarea
              value={promptText}
              onChange={(event) => setPromptText(event.target.value)}
              rows={8}
              placeholder="Paste customer feedback, meeting notes, or a direct implementation request."
            />
          </label>

          <label className="field">
            <span>Gemini API key for BYOK (optional)</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Hosted demos can use the server key. OSS users can bring their own."
            />
          </label>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={handleAnalyze} disabled={busyState !== "idle"}>
              {busyState === "analyzing" ? "Charting route..." : "Analyze Repo"}
            </button>
            <button type="button" className="secondary-button" onClick={handleLaunch} disabled={!brief || busyState !== "idle"}>
              {busyState === "launching" ? "Launching mission..." : "Launch Mission"}
            </button>
          </div>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="objective-card">
            <p className="section-kicker">Chosen destination</p>
            <h3>{visibleBrief.selectedObjective}</h3>
            <p>{visibleBrief.rationale}</p>

            <div className="list-block">
              <span>Acceptance criteria</span>
              <ul>
                {visibleBrief.acceptanceCriteria.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="candidate-card">
            <div className="section-header compact">
              <div>
                <p className="section-kicker">Alternate routes</p>
                <h3>Try another mission</h3>
              </div>
            </div>
            <div className="candidate-grid">
              {visibleBrief.candidateFeatures.map((feature) => (
                <button key={feature} type="button" className="candidate-button" onClick={() => loadAlternateFeature(feature)}>
                  {feature}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="map-card glass-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">Adventure map</p>
              <h2>{visibleBrief.missionTitle}</h2>
            </div>
            <div className={`stage-chip ${visibleMission.stage === "mission_blocked" ? "blocked" : ""}`}>
              {stageLabels[visibleMission.stage]}
            </div>
          </div>

          <div className="destination-grid">
            <article className="destination-card">
              <p className="section-kicker">Destination</p>
              <h3>{visibleBrief.selectedObjective}</h3>
              <p>{visibleBrief.implementationBrief}</p>
              <div className="badge-row soft">
                {visibleBrief.impactedAreas.slice(0, 4).map((area) => (
                  <Badge key={area}>{area}</Badge>
                ))}
              </div>
            </article>

            <article className="intel-card">
              <div className="intel-row">
                <span>Repo anchor</span>
                <strong>{visibleBrief.repoTarget.targetPath ?? "whole repo"}</strong>
              </div>
              <div className="intel-row">
                <span>Support lane</span>
                <strong>{visibleBrief.repoScan.supportLevel}</strong>
              </div>
              <div className="intel-row">
                <span>Verifier</span>
                <strong>{visibleBrief.repoScan.buildCommand ?? visibleBrief.repoScan.testCommand ?? "Advisory only"}</strong>
              </div>
            </article>
          </div>

          <div className="expedition-map">
            <div className="journey-line" />
            {stageOrder.map((stage, index) => (
              <LandmarkCard
                key={stage}
                stage={stage}
                index={index}
                currentStageIndex={currentStageIndex}
                blocked={visibleMission.stage === "mission_blocked"}
              />
            ))}

            <div className="proof-orb">
              <p className="section-kicker">Mission pulse</p>
              <strong>{Math.round(missionProgress)}%</strong>
              <span>{visibleMission.stage === "mission_blocked" ? "Route interrupted, proof preserved" : "Route converging on proof"}</span>
            </div>
          </div>

          <div className="agent-fleet">
            {(["pm", "architect", "executor", "qa"] as AgentRole[]).map((role) => (
              <AgentCard key={role} role={role} mission={visibleMission} />
            ))}
          </div>

          <div className="log-deck">
            <div className="section-header compact">
              <div>
                <p className="section-kicker">Route chatter</p>
                <h3>Latest mission events</h3>
              </div>
            </div>
            <div className="log-list">
              {visibleMission.artifacts.logs.slice(-4).reverse().map((log) => (
                <article key={`${log.timestamp}-${log.message}`} className={`log-entry ${log.level}`}>
                  <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
                  <p>{log.message}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="proof-card glass-card">
          <div className="section-header">
            <div>
              <p className="section-kicker">Proof chamber</p>
              <h2>{visibleMission.stage === "mission_blocked" ? "Blocker-aware proof" : "Evidence and handoff"}</h2>
            </div>
          </div>

          <div className="proof-summary">
            <p>{visibleMission.artifacts.summary}</p>
            <div className="proof-metrics">
              <MetricCard label="Changed files" value={String(visibleMission.artifacts.changedFiles.length)} />
              <MetricCard label="Checks" value={String(visibleMission.artifacts.checks.length)} />
              <MetricCard label="Pain points" value={String(visibleBrief.painPoints.length)} />
              <MetricCard label="Model" value={modelLabel} compact />
            </div>
          </div>

          <div className="button-column">
            {activeMission ? (
              <>
                <a className="secondary-button full" href={`/api/missions/${activeMission.id}/brief.md`}>
                  Download Brief
                </a>
                <button type="button" className="primary-button full" onClick={handleOpenContinuePrompt}>
                  Continue Working
                </button>
              </>
            ) : (
              <div className="empty-state">
                Launch a live mission to unlock downloadable proof and continuation prompts.
              </div>
            )}
          </div>

          <ArtifactCard title="Impacted areas" items={visibleBrief.impactedAreas} />
          <ArtifactCard
            title="Changed files"
            items={visibleMission.artifacts.changedFiles.map((file) => `${file.path} - ${file.summary}`)}
            empty="No changed files yet."
          />
          <ArtifactCard
            title="Checks"
            items={visibleMission.artifacts.checks.map((check) => `${check.name}: ${check.status}`)}
            empty="Verification will appear here."
          />
          <ArtifactCard title="Next steps" items={visibleMission.artifacts.nextSteps} empty="Next steps unlock after execution." />

          <div className="history-card">
            <p className="section-kicker">Mission ledger</p>
            <ul>
              {historyVisible.map((mission) => (
                <li key={mission.id}>
                  <strong>{mission.brief.selectedObjective}</strong>
                  <span>{stageLabels[mission.stage]}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </main>

      {showContinuePrompt ? (
        <div className="modal-backdrop" onClick={() => setShowContinuePrompt(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="section-header compact">
              <div>
                <p className="section-kicker">Continue working</p>
                <h2>Hand the route to another agent</h2>
              </div>
              <button type="button" className="modal-close" onClick={() => setShowContinuePrompt(false)}>
                Close
              </button>
            </div>
            <textarea readOnly value={continuePrompt} rows={16} />
            <div className="action-row">
              <button type="button" className="primary-button" onClick={() => navigator.clipboard.writeText(continuePrompt)}>
                Copy Prompt
              </button>
              {activeMission ? (
                <a className="secondary-button" href={`/api/missions/${activeMission.id}/continue.txt`}>
                  Download .txt
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LandmarkCard(props: {
  stage: Exclude<MissionRun["stage"], "mission_blocked">;
  index: number;
  currentStageIndex: number;
  blocked: boolean;
}) {
  const { stage, index, currentStageIndex, blocked } = props;
  const state = blocked && index === currentStageIndex ? "blocked" : index < currentStageIndex ? "complete" : index === currentStageIndex ? "active" : "pending";

  return (
    <article className={`landmark-card ${state} landmark-${index + 1}`}>
      <span className="landmark-index">0{index + 1}</span>
      <h3>{stageLabels[stage]}</h3>
      <p>{stageDescriptions[stage]}</p>
    </article>
  );
}

function AgentCard({ role, mission }: { role: AgentRole; mission: MissionRun }) {
  const agent = mission.agents[role];

  return (
    <article className={`agent-card ${agent.status} ${agentAccents[role]}`}>
      <div className="agent-topline">
        <div>
          <span className="agent-eyebrow">{agentNames[role]}</span>
          <h3>{role.toUpperCase()}</h3>
        </div>
        <strong>{agent.progress}%</strong>
      </div>
      <p>{agent.latestAction}</p>
      <div className="agent-bar">
        <div className="agent-bar-fill" style={{ width: `${agent.progress}%` }} />
      </div>
    </article>
  );
}

function ArtifactCard({ title, items, empty = "Nothing recorded yet." }: { title: string; items: string[]; empty?: string }) {
  return (
    <article className="artifact-card">
      <h3>{title}</h3>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="empty-state">{empty}</p>
      )}
    </article>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="badge">{children}</span>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`metric-card ${compact ? "compact" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function mergeHistory(history: MissionRun[], mission: MissionRun) {
  const next = [mission, ...history.filter((entry) => entry.id !== mission.id)];
  return next.slice(0, 6);
}
