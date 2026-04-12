import { useEffect, useMemo, useRef, useState } from "react";
import { seededBrief, seededMission } from "../../shared/mock";
import type { MissionBrief, MissionMode, MissionRun } from "../../shared/types";
import { analyzeMission, getContinuePrompt, startMission, subscribeToMission } from "./api";
import { ContinueMissionModal } from "./components/ContinueMissionModal";
import { MissionComposer } from "./components/MissionComposer";
import { MissionTheater } from "./components/MissionTheater";
import { Prelude } from "./components/Prelude";
import { ProofVault } from "./components/ProofVault";
import { TechnicalProofDrawer } from "./components/TechnicalProofDrawer";
import { buildStoryMoments, getChapterStates, getMissionProgress } from "./presentation";

export default function App() {
  const composerRef = useRef<HTMLElement | null>(null);
  const theaterRef = useRef<HTMLElement | null>(null);

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
  const [showTechnicalProof, setShowTechnicalProof] = useState(false);
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

  useEffect(() => {
    if (!activeMission) {
      return;
    }

    theaterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [activeMission?.id]);

  const visibleMission = activeMission ?? seededMission;
  const visibleBrief = brief ?? activeMission?.brief ?? seededBrief;
  const liveBrief = brief ?? activeMission?.brief ?? null;
  const historyVisible = history.length > 0 ? history : [seededMission];

  const missionProgress = useMemo(() => getMissionProgress(visibleMission.stage), [visibleMission.stage]);
  const chapters = useMemo(() => getChapterStates(visibleMission.stage), [visibleMission.stage]);
  const storyMoments = useMemo(() => buildStoryMoments(visibleBrief, visibleMission), [visibleBrief, visibleMission]);

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

      <Prelude brief={visibleBrief} missionProgress={missionProgress} chapters={chapters} onStart={handlePreludeStart} />

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

        <section ref={theaterRef}>
          <MissionTheater
            brief={visibleBrief}
            mission={visibleMission}
            missionProgress={missionProgress}
            chapters={chapters}
            storyMoments={storyMoments}
            onOpenTechnicalProof={() => setShowTechnicalProof(true)}
          />
        </section>

        <ProofVault
          brief={visibleBrief}
          mission={visibleMission}
          activeMissionId={activeMission?.id ?? null}
          history={historyVisible}
          onOpenContinuePrompt={handleOpenContinuePrompt}
          onOpenTechnicalProof={() => setShowTechnicalProof(true)}
        />
      </main>

      <TechnicalProofDrawer
        brief={visibleBrief}
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
