# Cascade

Cascade turns a public GitHub repo plus messy product intent into a visible implementation mission.

Paste a repo or file URL, choose `Discover` or `Mission`, add meeting notes, customer feedback, or a direct feature request, and Cascade will:

- analyze the repo
- choose or clarify an objective
- show PM, Architect, Executor, and QA agents moving through a mission map
- attempt a real patch for supported JS/TS npm web repos
- package proof with changed files, checks, blockers, and exports

## Why Cascade

Most coding agents start after the decision has already been made. Cascade sits one layer earlier and one layer wider:

- `Discover Mode` turns customer signal into a feature mission.
- `Mission Mode` turns a direct ask into a repo-aware implementation run.
- The UI makes the journey legible instead of hiding it behind logs.

## Product Snapshot

- React + TypeScript frontend
- Express + TypeScript API
- Gemini analysis and execution planning on the server
- `gemini-3.1-pro-preview` by default, then `gemini-3-pro-preview`, then `gemini-2.5-pro`
- Cloud Run deployment target
- BYOK support in the UI for open-source/self-hosted usage

## Screenshots

Add polished screenshots here before posting or submitting:

- `assets/screenshots/mission-map.png`
- `assets/screenshots/proof-bundle.png`
- `assets/screenshots/continue-working.png`

## Demo Videos

Drop your public demo links here:

- Playcast: `TODO`
- Elevator pitch: `TODO`
- Hosted prototype: `TODO`

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Run locally

```bash
npm run dev
```

This starts:

- Vite on `http://127.0.0.1:5173`
- Express on `http://127.0.0.1:8080`

### 3. Add Gemini credentials

Use either:

- a server-side env var: `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- the BYOK field in the UI

The public repo is designed so local users can bring their own Gemini key. The hosted judge/demo deployment can use a server-side key.

## Build and Test

```bash
npm run typecheck
npm test
npm run build
```

## Cloud Run Deployment

### Option 1: Deploy from source

```bash
gcloud run deploy cascade ^
  --source . ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --min-instances 1 ^
  --max-instances 1 ^
  --concurrency 4 ^
  --timeout 1800 ^
  --set-env-vars NODE_ENV=production
```

Then add your Gemini secret or env var in Cloud Run:

- `GEMINI_API_KEY`

### Option 2: Build and deploy a container

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/cascade/cascade:latest
gcloud run services replace cloudrun.yaml
```

Before using `cloudrun.yaml`, replace:

- `REGION`
- `PROJECT_ID`

## Execution Scope

Cascade accepts any public GitHub repo for analysis, but live execution is intentionally narrower in v1:

- Supported: JS/TS web repos with `package.json`, `npm`, and a build or test command
- Advisory-only: public repos outside the supported lane

That constraint is deliberate. It keeps the demo honest and the Cloud Run runtime reliable.

## Exports

Every mission can produce:

- a markdown implementation brief
- a `Continue Working` prompt for another coding agent
- changed files and verification artifacts

## Repo Layout

```text
client/                 React frontend
server/                 Express API, scanner, Gemini services
shared/                 Shared types and seeded demo state
docs/                   One-pager, scripts, launch assets
assets/screenshots/     Screenshot placeholders
assets/demo/            Demo-video placeholders
```

## Submission Docs

- [One Pager](./docs/one-pager.md)
- [Playcast Script](./docs/playcast-script.md)
- [Elevator Pitch](./docs/elevator-pitch.md)
- [Social Launch Copy](./docs/social-launch.md)
