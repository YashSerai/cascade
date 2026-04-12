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

const stageOrder: MissionRun["stage"][] = [
  "objective_received",
  "recon",
  "plan_locked",
  "execution_underway",
  "verification",
  "proof_delivered"
];

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

  const missionProgress = useMemo(() => {
    const index = stageOrder.indexOf(visibleMission.stage);
    if (visibleMission.stage === "mission_blocked") {
      return 92;
    }
    return Math.max(10, ((index + 1) / stageOrder.length) * 100);
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
      <div className="ambient-grid" />
      <header className="topbar">
        <div>
          <p className="eyebrow">Cascade</p>
          <h1>Turn repo intent into a visible mission.</h1>
        </div>
        <div className="topbar-badges">
          <span>{visibleBrief.modelSelection.activeModel ?? "heuristic mode"}</span>
          <span>{visibleBrief.repoScan.supportLevel}</span>
          <span>Cloud Run ready</span>
        </div>
      </header>

      <main className="workspace">
        <section className="left-rail panel">
          <div className="mode-switch">
            {(["discover", "mission"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={item === mode ? "active" : ""}
                onClick={() => setMode(item)}
              >
                {item === "discover" ? "Discover Mode" : "Mission Mode"}
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
              rows={9}
              placeholder="Paste customer feedback, meeting notes, or a direct implementation request."
            />
          </label>

          <label className="field">
            <span>Gemini API key for BYOK (optional)</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Falls back to server-side key if configured."
            />
          </label>

          <div className="action-row">
            <button type="button" className="primary" onClick={handleAnalyze} disabled={busyState !== "idle"}>
              {busyState === "analyzing" ? "Analyzing..." : "Analyze Repo"}
            </button>
            <button type="button" className="secondary" onClick={handleLaunch} disabled={!brief || busyState !== "idle"}>
              {busyState === "launching" ? "Launching..." : "Launch Mission"}
            </button>
          </div>

          {error ? <p className="error-message">{error}</p> : null}

          <div className="brief-card">
            <p className="section-kicker">Selected objective</p>
            <h2>{visibleBrief.selectedObjective}</h2>
            <p>{visibleBrief.rationale}</p>
            <ul className="chip-list">
              {visibleBrief.impactedAreas.slice(0, 5).map((area) => (
                <li key={area}>{area}</li>
              ))}
            </ul>
          </div>

          <div className="brief-card subtle">
            <p className="section-kicker">Candidate features</p>
            <div className="candidate-list">
              {visibleBrief.candidateFeatures.map((feature) => (
                <button key={feature} type="button" className="candidate-chip" onClick={() => loadAlternateFeature(feature)}>
                  {feature}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mission-canvas panel">
          <div className="mission-header">
            <div>
              <p className="section-kicker">Mission map</p>
              <h2>{visibleBrief.missionTitle}</h2>
            </div>
            <div className="progress-pill">{Math.round(missionProgress)}% resolved</div>
          </div>

          <div className="terrain">
            <div className="terrain-wash" />
            <div className="stage-track">
              {stageOrder.map((stage, index) => {
                const currentIndex = stageOrder.indexOf(visibleMission.stage);
                const complete = currentIndex > index || visibleMission.stage === "proof_delivered";
                const active = visibleMission.stage === stage;
                return (
                  <div key={stage} className={`stage-node ${complete ? "complete" : ""} ${active ? "active" : ""}`}>
                    <span>{index + 1}</span>
                    <strong>{stageLabels[stage]}</strong>
                  </div>
                );
              })}
            </div>

            <div className="terrain-zones">
              <ZoneCard title="Signal Basin" copy={visibleBrief.painPoints[0] ?? "Customer signal will appear here."} />
              <ZoneCard title="Plan Ridge" copy={visibleBrief.implementationBrief} />
              <ZoneCard
                title="Proof Harbor"
                copy={
                  visibleMission.stage === "mission_blocked"
                    ? "Blockers surfaced, but the mission stays honest and exportable."
                    : visibleMission.artifacts.summary
                }
              />
            </div>

            <div className="agent-orbit">
              {(["pm", "architect", "executor", "qa"] as AgentRole[]).map((role) => (
                <div key={role} className={`agent-token ${visibleMission.agents[role].status}`}>
                  <span>{role.toUpperCase()}</span>
                  <small>{visibleMission.agents[role].progress}%</small>
                </div>
              ))}
            </div>
          </div>

          <div className="timeline">
            {visibleMission.artifacts.logs.slice(-5).reverse().map((log) => (
              <article key={`${log.timestamp}-${log.message}`} className={`timeline-entry ${log.level}`}>
                <time>{new Date(log.timestamp).toLocaleTimeString()}</time>
                <p>{log.message}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="right-rail panel">
          <div className="agent-grid">
            {(["pm", "architect", "executor", "qa"] as AgentRole[]).map((role) => (
              <AgentCard key={role} role={role} mission={visibleMission} />
            ))}
          </div>

          <div className="proof-header">
            <div>
              <p className="section-kicker">Proof bundle</p>
              <h2>{visibleMission.stage === "mission_blocked" ? "Mission blocked" : "Mission proof"}</h2>
            </div>
            <div className="button-row">
              {activeMission ? (
                <>
                  <a className="ghost-button" href={`/api/missions/${activeMission.id}/brief.md`}>
                    Download Brief
                  </a>
                  <button type="button" className="ghost-button" onClick={handleOpenContinuePrompt}>
                    Continue Working
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="stack">
            <ArtifactCard title="Impacted areas" items={visibleBrief.impactedAreas} />
            <ArtifactCard
              title="Changed files"
              items={visibleMission.artifacts.changedFiles.map((file) => `${file.path} — ${file.summary}`)}
              empty="No changed files yet."
            />
            <ArtifactCard
              title="Checks"
              items={visibleMission.artifacts.checks.map((check) => `${check.name}: ${check.status}`)}
              empty="Verification will appear here."
            />
            <ArtifactCard title="Next steps" items={visibleMission.artifacts.nextSteps} empty="Next steps unlock after execution." />
          </div>

          <div className="history-card">
            <p className="section-kicker">Mission history</p>
            <ul>
              {history.length === 0 ? <li>Launch a real mission to start local history.</li> : null}
              {history.map((mission) => (
                <li key={mission.id}>
                  <strong>{mission.brief.selectedObjective}</strong>
                  <span>{stageLabels[mission.stage]}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {showContinuePrompt ? (
        <div className="modal-backdrop" onClick={() => setShowContinuePrompt(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2>Continue Working Prompt</h2>
              <button type="button" onClick={() => setShowContinuePrompt(false)}>
                Close
              </button>
            </div>
            <textarea readOnly value={continuePrompt} rows={16} />
            <div className="button-row">
              <button type="button" className="primary" onClick={() => navigator.clipboard.writeText(continuePrompt)}>
                Copy Prompt
              </button>
              {activeMission ? (
                <a className="ghost-button" href={`/api/missions/${activeMission.id}/continue.txt`}>
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

function AgentCard({ role, mission }: { role: AgentRole; mission: MissionRun }) {
  const agent = mission.agents[role];
  return (
    <article className={`agent-card ${agent.status}`}>
      <div className="agent-title">
        <span>{role.toUpperCase()}</span>
        <strong>{agent.progress}%</strong>
      </div>
      <p>{agent.latestAction}</p>
    </article>
  );
}

function ArtifactCard({ title, items, empty = "Nothing recorded yet." }: { title: string; items: string[]; empty?: string }) {
  return (
    <article className="artifact-card">
      <h3>{title}</h3>
      {items.length === 0 ? <p className="empty-copy">{empty}</p> : null}
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function ZoneCard({ title, copy }: { title: string; copy: string }) {
  return (
    <article className="zone-card">
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

function mergeHistory(history: MissionRun[], mission: MissionRun) {
  const next = [mission, ...history.filter((entry) => entry.id !== mission.id)];
  return next.slice(0, 6);
}
