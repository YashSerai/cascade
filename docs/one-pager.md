# Cascade One-Pager

## Team

- Founder / Builder: Yash Serai

## Problem

Coding agents are getting better at implementation, but founders and small teams still have two gaps:

- deciding what to build from messy user signal
- trusting what the agent actually changed

## Solution

Cascade turns a public repo and product intent into a visible mission.

- `Discover Mode` converts meeting notes, customer feedback, and issue clusters into a selected feature objective.
- `Mission Mode` converts a direct feature or bug request into a repo-aware implementation mission.
- The system shows four visible agents: PM, Architect, Executor, and QA.
- The result ends with proof: changed files, checks, blockers, and exportable next steps.

## Why It Matters

- Makes coding-agent work legible
- Bridges customer signal to implementation
- Produces demo-friendly proof instead of opaque logs
- Works as both a founder tool and a coding workflow layer

## Product Flow

1. Paste a public GitHub repo or file URL.
2. Add customer notes or a direct request.
3. Cascade scans the repo and forms a mission brief.
4. The mission map animates through recon, planning, execution, and verification.
5. The proof bundle unlocks with exports and next steps.

## Stack

- React + TypeScript
- Express + TypeScript
- Gemini server-side analysis and execution planning
- Cloud Run deployment

## Gemini Usage

- Primary model: `gemini-3.1-pro-preview`
- Fallback chain: `gemini-3-pro-preview`, then `gemini-2.5-pro`
- BYOK supported in the open-source flow
- Server-side key supported for hosted hackathon judging

## v1 Constraint

Cascade analyzes any public GitHub repo, but real live execution is limited to supported JS/TS npm web repos. This keeps the hosted prototype reliable while preserving a repo-agnostic top-of-funnel.

## Why Now

The market has strong implementation agents but weaker product-decision and proof layers. Cascade packages those missing pieces into a format that is understandable, memorable, and demoable.
