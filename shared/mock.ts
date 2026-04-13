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
    logs: [
      { timestamp: now, level: "info", message: "Recon complete. React/Vite repo detected." },
      { timestamp: now, level: "info", message: "Executor is applying the onboarding path to the main UI." }
    ],
    summary: "Cascade reframed the ask, staged the onboarding flow, and verified the build.",
    blockers: [],
    nextSteps: ["Capture a launch screenshot.", "Try the second route against the same repo."]
  }
};
