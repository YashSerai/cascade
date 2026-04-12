import type { MissionBrief, MissionRun } from "./types";

const now = new Date().toISOString();

export const seededBrief: MissionBrief = {
  missionTitle: "Turn support churn into a guided onboarding mission",
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
  selectedObjective: "Make onboarding progress visible and easier to restart",
  rationale:
    "Meeting notes repeatedly mention users getting lost between first sign-up and first value. A guided onboarding journey creates the fastest visual improvement and addresses the repeated friction directly.",
  confidence: 0.86,
  painPoints: [
    "New users do not know what step unlocks value first.",
    "Support calls repeatedly explain the same setup sequence.",
    "There is no visible progress or reset path."
  ],
  candidateFeatures: ["Guided onboarding mission", "Contextual setup checklist", "Reset and resume launcher"],
  acceptanceCriteria: [
    "Users can see the current onboarding stage at a glance.",
    "Users can restart setup without losing orientation.",
    "The onboarding surface visually matches the product brand."
  ],
  impactedAreas: ["src/App.tsx", "navigation shell", "global styles"],
  implementationBrief:
    "Introduce a mission-style onboarding ribbon, a reset action, and visual proof points so the product feels guided instead of static.",
  modelSelection: {
    requestedModel: "gemini-3.1-pro-preview",
    fallbackModel: "gemini-3-pro-preview",
    attemptedModels: ["gemini-3.1-pro-preview"],
    activeModel: "gemini-3.1-pro-preview",
    fallbackUsed: false,
    keyMode: "server"
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
      approach:
        "Tighten the hero copy, add mission progress chips, and stage the onboarding flow around three clear steps.",
      targetFiles: ["src/App.tsx", "src/styles.css"],
      verificationStrategy: ["npm install --no-audit --no-fund", "npm run build"],
      notes: ["Keep the end-state visually obvious for a 60-second demo."]
    },
    changedFiles: [
      { path: "src/App.tsx", summary: "Added the mission-driven onboarding surface and reset action." },
      { path: "src/styles.css", summary: "Introduced terrain gradients, path lines, and verification states." }
    ],
    checks: [{ name: "build", status: "passed", command: "npm run build", output: "Build completed successfully in 4.2s." }],
    screenshots: [],
    logs: [
      { timestamp: now, level: "info", message: "Recon complete. React/Vite project detected." },
      { timestamp: now, level: "info", message: "Executor is applying a guided onboarding journey to the main UI." }
    ],
    summary:
      "Cascade reframed the ask into a visible onboarding mission, updated the main React surface, and verified the package build.",
    blockers: [],
    nextSteps: ["Capture a polished screenshot for the launch thread.", "Try the second candidate feature against the same repo."]
  }
};
