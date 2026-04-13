import { useEffect, useMemo, useRef, useState } from "react";
import { seededBrief, seededMission } from "../../shared/mock";
import type { AgentRole, MissionBrief, MissionMode, MissionRun } from "../../shared/types";
import { analyzeMission, getContinuePrompt, startMission, subscribeToMission } from "./api";
import { ContinueMissionModal } from "./components/ContinueMissionModal";
import { MissionComposer } from "./components/MissionComposer";
import { MissionTheater } from "./components/MissionTheater";
import { Prelude } from "./components/Prelude";
import { ProofVault } from "./components/ProofVault";
import { TechnicalProofDrawer } from "./components/TechnicalProofDrawer";
import { getChapterStates, getDefaultCrewRole, getMissionProgress } from "./presentation";

export default function App() {
  const composerRef = useRef<HTMLElement | null>(null);
  const theaterRef = useRef<HTMLElement | null>(null);

  const [mode, setMode] = useState<MissionMode>("mission");
  const [repoUrl, setRepoUrl] = useState("https://github.com/YashSerai/product-ops-studio");
  const [promptText, setPromptText] = useState("Add a feature comparison section under pricing.");
  const [apiKey, setApiKey] = useState("");
  const [brief, setBrief] = useState<MissionBrief | null>(null);
  const [activeMission, setActiveMission] = useState<MissionRun | null>(null);
  const [history, setHistory] = useState<MissionRun[]>([]);
  const [continuePrompt, setContinuePrompt] = useState("");
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [showTechnicalProof, setShowTechnicalProof] = useState(false);
  const [error, setError] = useState("");
  const [busyState, setBusyState] = useState<"idle" | "analyzing" | "launching">("idle");
  const [selectedCrewRole, setSelectedCrewRole] = useState<AgentRole>("executor");

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

  useEffect(() => {
    if (!activeMission) {
      return;
    }

    theaterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeMission?.id]);

  const preludeBrief = brief ?? activeMission?.brief ?? seededBrief;
  const visibleBrief = brief ?? activeMission?.brief ?? null;
  const previewMission = useMemo(
    () => buildPreviewMission(preludeBrief, Boolean(brief), busyState === "analyzing"),
    [preludeBrief, brief, busyState]
  );
  const visibleMission = activeMission ?? previewMission;
  const liveBrief = brief ?? activeMission?.brief ?? null;
  const historyVisible = history.length > 0 ? history : [previewMission];
  const showTheater = Boolean(activeMission);
  const showProof = Boolean(
    activeMission &&
      ["verification", "proof_delivered", "mission_blocked"].includes(activeMission.stage)
  );

  const missionProgress = useMemo(() => getMissionProgress(visibleMission.stage), [visibleMission.stage]);
  const chapters = useMemo(() => getChapterStates(visibleMission.stage), [visibleMission.stage]);

  useEffect(() => {
    setSelectedCrewRole(getDefaultCrewRole(visibleMission));
  }, [visibleMission.id, visibleMission.stage]);

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
    if (!liveBrief) {
      return;
    }

    if (liveBrief.modelSelection.keyMode === "none" && !apiKey.trim()) {
      setError("Live run needs a Gemini key. Add one above or configure a server key to execute the mission.");
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setBusyState("launching");
    setError("");

    try {
      const response = await startMission({ brief: liveBrief, apiKey: apiKey.trim() || undefined });
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

    setError("");

    try {
      const content = await getContinuePrompt(activeMission.id);
      setContinuePrompt(content);
      setShowContinuePrompt(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the continue-working prompt.");
    }
  }

  function handlePreludeStart() {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function loadAlternateFeature(feature: string) {
    setMode("mission");
    setPromptText(`Implement this improvement in the repo: ${feature}`);
  }

  return (
    <div className="cascade-app">
      <div className="scene-glow glow-left" />
      <div className="scene-glow glow-right" />
      <div className="scene-grid" />
      <div className="scene-noise" />

      <Prelude
        brief={preludeBrief}
        missionStage={showTheater ? visibleMission.stage : "objective_received"}
        missionProgress={missionProgress}
        onStart={handlePreludeStart}
      />

      <main className="experience-stack">
        <section ref={composerRef}>
          <MissionComposer
            mode={mode}
            repoUrl={repoUrl}
            promptText={promptText}
            apiKey={apiKey}
            busyState={busyState}
            error={error}
            brief={visibleBrief}
            liveBrief={liveBrief}
            onModeChange={setMode}
            onRepoUrlChange={setRepoUrl}
            onPromptChange={setPromptText}
            onApiKeyChange={setApiKey}
            onAnalyze={handleAnalyze}
            onLaunch={handleLaunch}
            onSelectCandidate={loadAlternateFeature}
          />
        </section>

        {showTheater && visibleBrief ? (
          <section ref={theaterRef} className="revealed-section">
            <MissionTheater
              brief={visibleBrief}
              mission={visibleMission}
              chapters={chapters}
              selectedCrewRole={selectedCrewRole}
              onSelectCrew={setSelectedCrewRole}
              onOpenTechnicalProof={() => setShowTechnicalProof(true)}
            />
          </section>
        ) : null}

        {showProof && visibleBrief ? (
          <section className="revealed-section">
            <ProofVault
              brief={visibleBrief}
              mission={visibleMission}
              activeMissionId={activeMission?.id ?? null}
              history={historyVisible}
              onOpenContinuePrompt={handleOpenContinuePrompt}
              onOpenTechnicalProof={() => setShowTechnicalProof(true)}
            />
          </section>
        ) : null}
      </main>

      <TechnicalProofDrawer
        brief={preludeBrief}
        mission={visibleMission}
        open={showTechnicalProof}
        onClose={() => setShowTechnicalProof(false)}
      />

      <ContinueMissionModal
        content={continuePrompt}
        missionId={activeMission?.id ?? null}
        open={showContinuePrompt}
        onClose={() => setShowContinuePrompt(false)}
      />
    </div>
  );
}

function mergeHistory(history: MissionRun[], mission: MissionRun) {
  const next = [mission, ...history.filter((entry) => entry.id !== mission.id)];
  return next.slice(0, 6);
}

function buildPreviewMission(brief: MissionBrief, routeLocked: boolean, isAnalyzing: boolean): MissionRun {
  const now = new Date().toISOString();

  if (routeLocked) {
    return {
      id: "preview-route-locked",
      createdAt: now,
      updatedAt: now,
      stage: "plan_locked",
      brief,
      queuePosition: 0,
      agents: {
        pm: { role: "pm", status: "done", latestAction: "Turned the ask into a concrete mission brief.", progress: 100 },
        architect: { role: "architect", status: "done", latestAction: "Mapped the change surface and locked the route.", progress: 100 },
        executor: { role: "executor", status: "idle", latestAction: "Waiting for a live run and execution key.", progress: 0 },
        qa: { role: "qa", status: "idle", latestAction: "Waiting for execution before proof can be assembled.", progress: 0 }
      },
      artifacts: {
        changedFiles: [],
        checks: [],
        screenshots: [],
        logs: [
          {
            timestamp: now,
            level: "info",
            message: "Route locked. Start the live run to move from planning into execution."
          }
        ],
        summary: "Route preview is ready. Start live run to generate a real patch, checks, and proof.",
        blockers: [],
        nextSteps: ["Start the live run to move from planning into execution."]
      }
    };
  }

  if (isAnalyzing) {
    return {
      ...seededMission,
      id: "preview-analyzing",
      createdAt: now,
      updatedAt: now,
      stage: "recon",
      brief,
      agents: {
        pm: { role: "pm", status: "done", latestAction: "Parsed the ask and framed the mission.", progress: 100 },
        architect: { role: "architect", status: "active", latestAction: "Scanning the repo and locking the likely change surface.", progress: 52 },
        executor: { role: "executor", status: "idle", latestAction: "Waiting for route lock.", progress: 0 },
        qa: { role: "qa", status: "idle", latestAction: "Waiting for proof-worthy execution.", progress: 0 }
      },
      artifacts: {
        changedFiles: [],
        checks: [],
        screenshots: [],
        logs: [
          {
            timestamp: now,
            level: "info",
            message: "Analyze route is in progress. Repo scan and mission framing are underway."
          }
        ],
        summary: "Cascade is reading the repo and shaping the route.",
        blockers: [],
        nextSteps: []
      }
    };
  }

  return {
    ...seededMission,
    id: "preview-idle",
    createdAt: now,
    updatedAt: now,
    stage: "objective_received",
    brief,
    agents: {
      pm: { role: "pm", status: "active", latestAction: "Waiting for the ask to be analyzed.", progress: 18 },
      architect: { role: "architect", status: "idle", latestAction: "No route locked yet.", progress: 0 },
      executor: { role: "executor", status: "idle", latestAction: "Standing by for a real mission.", progress: 0 },
      qa: { role: "qa", status: "idle", latestAction: "Proof unlocks after a live run.", progress: 0 }
    },
    artifacts: {
      changedFiles: [],
      checks: [],
      screenshots: [],
      logs: [
        {
          timestamp: now,
          level: "info",
          message: "Waiting for analyze route. The theater becomes live once a mission is locked."
        }
      ],
      summary: "Analyze a repo to replace this preview with a route-locked mission.",
      blockers: [],
      nextSteps: []
    }
  };
}
