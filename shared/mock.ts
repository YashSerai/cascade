import type { MissionBrief, MissionRun } from "./types";

const now = new Date().toISOString();

export const seededBrief: MissionBrief = {
  missionTitle: "Onboarding needs a clearer route",
  mode: "discover",
  repoTarget: {
    inputUrl: "https://github.com/example/product-app",
    repoUrl: "https://github.com/example/product-app",
    owner: "example",
    repo: "product-app",
    cloneUrl: "https://github.com/example/product-app.git",
    targetPath: "src/App.tsx"
  },
  repoScan: {
    framework: "React + Vite",
    packageManager: "npm",
    supportLevel: "supported",
    supportReason: "Detected a standard React/Vite app with npm scripts for build and test.",
    installCommand: "npm install --no-audit --no-fund",
    buildCommand: "npm run build",
    testCommand: "npm run test",
    importantFiles: ["src/App.tsx", "src/components/Hero.tsx", "src/styles.css"],
    importantFileSummaries: [
      { path: "src/App.tsx", summary: "Main shell contains the onboarding narrative, CTA cluster, and route-driven sections." },
      { path: "src/components/Hero.tsx", summary: "Hero component frames the first-run promise and top-of-page payoff." },
      { path: "src/styles.css", summary: "Global styling holds the progress states, route line visuals, and proof cues." }
    ],
    risks: ["Visual polish work may need coordinated CSS updates."],
    rootScripts: ["dev", "build", "test"],
    targetPathHint: "src/App.tsx"
  },
  selectedObjective: "Show progress and safe restart points",
  rationale:
    "New users lose the thread between sign-up and first value. A visible path fixes the confusion fastest.",
  confidence: 0.86,
  painPoints: [
    "The first win is hard to spot.",
    "Support repeats the same setup order.",
    "Restarting drops users back into guesswork."
  ],
  candidateFeatures: ["Guided onboarding path", "Resume-and-reset launcher", "Setup checklist with progress"],
  acceptanceCriteria: [
    "Users can spot the current step immediately.",
    "Restarting setup keeps context.",
    "The flow feels native to the product."
  ],
  impactedAreas: ["src/App.tsx", "navigation shell", "global styles"],
  implementationBrief: "Add a step rail, restart action, and proof states.",
  routePlan: {
    ribbonTitle: "Clarify the onboarding route and restart states",
    ribbonSummary: "Cascade reads the app shell, hero, and styles first so the demo lands as one visible onboarding improvement instead of scattered edits.",
    routeHeadline: "Clone the repo, map onboarding friction, and lock a proof-friendly route.",
    routeSummary: "Cascade reads the app shell, hero, and styles first so the demo lands as one visible improvement instead of scattered edits.",
    whyThisRoute: "The main shell already carries the onboarding story, so changing it creates the clearest user-facing shift.",
    loadingSteps: [
      { label: "Clone repo", detail: "Pull the current repo state into a temporary workspace." },
      { label: "Read product shell", detail: "Inspect the hero, onboarding surface, and styles that shape the first-run story." },
      { label: "Lock route", detail: "Turn the ask into role-specific guidance, file targets, and proof shots." }
    ],
    journeyMoments: [
      "Frame the onboarding ask around one visible first-run win.",
      "Use the main shell and hero to carry the product story without diff-hunting.",
      "Package proof around changed UI, verification, and a PR-ready narrative."
    ],
    proofTargets: ["Before/after onboarding shell", "Verification output card", "PR-ready summary with touched files"],
    fileMap: [
      { path: "src/App.tsx", reason: "Primary storytelling and change surface.", phase: "shape" },
      { path: "src/components/Hero.tsx", reason: "Supports the first impression and CTA framing.", phase: "scan" },
      { path: "src/styles.css", reason: "Carries the visual state changes and proof cues.", phase: "verify" }
    ],
    summaryCards: {
      lane: {
        label: "Lane",
        title: "Onboarding rescue route",
        body: "Turn the first-run pain into one visible product improvement instead of scattered tweaks."
      },
      support: {
        label: "Support",
        title: "Ready for a live pass",
        body: "Detected a standard React/Vite app with npm scripts for build and test."
      },
      primarySurface: {
        label: "Primary surface",
        title: "App shell and onboarding frame",
        body: "The main shell already carries the onboarding story, so this is where the change will read first."
      },
      payoff: {
        label: "Payoff",
        title: "Show progress and safe restart points",
        body: "Users should see their current step immediately and recover without losing context."
      }
    },
    roleFocus: {
      pm: {
        role: "pm",
        headline: "Turn confusion into one visible onboarding win.",
        currentLens: "New users should spot their current step immediately.",
        repoHook: "The main shell already contains the first-run story.",
        successSignal: "The current step reads without explanation.",
        filePaths: ["src/App.tsx", "src/components/Hero.tsx"]
      },
      architect: {
        role: "architect",
        headline: "Keep the route inside the onboarding shell and styling system.",
        currentLens: "The smallest believable route touches structure and visual state.",
        repoHook: "App shell plus styles can carry the entire improvement.",
        successSignal: "The route stays coherent and build-friendly.",
        filePaths: ["src/App.tsx", "src/styles.css"]
      },
      executor: {
        role: "executor",
        headline: "Build the onboarding path where users will notice it first.",
        currentLens: "The hero and step rail should read as one deliberate motion.",
        repoHook: "App shell exposes the exact components needed for the visible shift.",
        successSignal: "The updated onboarding surface feels native to the product.",
        filePaths: ["src/App.tsx", "src/components/Hero.tsx"]
      },
      qa: {
        role: "qa",
        headline: "Close the loop with proof, not just changed files.",
        currentLens: "Proof should connect UI outcome, build status, and handoff copy.",
        repoHook: "The repo already has a build script for a clean verification beat.",
        successSignal: "The handoff is credible without opening the diff.",
        filePaths: ["src/App.tsx", "src/styles.css"]
      }
    },
    prTitle: "Clarify onboarding route and restart states",
    prSummary: "Tighten the onboarding shell, add visible progress, and package proof for the handoff."
  },
  modelSelection: {
    requestedModel: "gemini-3.1-pro-preview",
    fallbackModel: "gemini-3-pro-preview",
    attemptedModels: ["gemini-3.1-pro-preview"],
    activeModel: "gemini-3.1-pro-preview",
    fallbackUsed: false,
    keyMode: "server",
    provider: "gemini-developer"
  }
};

export const seededMission: MissionRun = {
  id: "seeded-cascade-demo",
  createdAt: now,
  updatedAt: now,
  stage: "verification",
  brief: seededBrief,
  queuePosition: 0,
  agents: {
    pm: { role: "pm", status: "done", latestAction: "Selected the onboarding mission from repeated support pain.", progress: 100 },
    architect: {
      role: "architect",
      status: "done",
      latestAction: "Mapped the onboarding shell, hero, and styles as the main change surface.",
      progress: 100
    },
    executor: {
      role: "executor",
      status: "active",
      latestAction: "Applying the ribbon, CTA reset state, and visual route markers.",
      progress: 74
    },
    qa: {
      role: "qa",
      status: "active",
      latestAction: "Running build verification and assembling proof cards.",
      progress: 58
    }
  },
  artifacts: {
    executionPlan: {
      approach: "Tighten the onboarding story, add progress states, and keep the handoff obvious.",
      targetFiles: ["src/App.tsx", "src/styles.css"],
      verificationStrategy: ["npm install --no-audit --no-fund", "npm run build"],
      notes: ["Keep the end-state visually obvious for a 60-second demo."]
    },
    changedFiles: [
      { path: "src/App.tsx", summary: "Added the onboarding path and restart action." },
      { path: "src/styles.css", summary: "Added progress states, route lines, and proof cues." }
    ],
    checks: [{ name: "build", status: "passed", command: "npm run build", output: "Build completed successfully in 4.2s." }],
    screenshots: [],
    pullRequestDraft: {
      title: "Clarify onboarding route and restart states",
      summary: "Tighten the onboarding shell, add visible progress, and package proof for the handoff.",
      checklist: ["Changed files: src/App.tsx, src/styles.css.", "Verification: build:passed.", "Proof targets: Before/after onboarding shell | Verification output card | PR-ready summary with touched files"]
    },
    logs: [
      { timestamp: now, level: "info", message: "Recon complete. React/Vite repo detected." },
      { timestamp: now, level: "info", message: "Executor is applying the onboarding path to the main UI." }
    ],
    summary: "Cascade reframed the ask, staged the onboarding flow, and verified the build.",
    blockers: [],
    nextSteps: ["Capture a launch screenshot.", "Try the second route against the same repo."]
  }
};
