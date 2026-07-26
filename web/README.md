# Disruption Console (web UI)

The frontend for the supply-chain orchestrator: a dark ops-console dashboard
that streams a run live. Pick a scenario, watch the four agents light up as they
execute, get an interactive Approve/Reject modal when a cost override breaks the
15% gate, and read the drafted customer notice with per-node timings.

Built with Next.js (App Router), TypeScript, Tailwind CSS, and Framer Motion.

## Two modes

- **Demo mode (default):** with no backend configured, the UI replays canned
  runs that mirror the backend fixtures exactly. The deployed link always works,
  even when the backend is scaled to zero.
- **Live mode:** set `NEXT_PUBLIC_API_URL` to the orchestrator backend and the UI
  streams real runs over NDJSON, including the real LangGraph interrupt at the
  approval gate and LLM-drafted messages.

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000, demo mode
```

Against a local backend:

```bash
# terminal 1: from the repo root
make serve             # backend on :8080

# terminal 2: here
echo "NEXT_PUBLIC_API_URL=http://localhost:8080" > .env.local
npm run dev
```

## Deploy

Two options, both in [docs/DEPLOY.md](../docs/DEPLOY.md):

- **Cloud Run (everything on Google Cloud):** `PROJECT_ID=... ./deploy/deploy-web.sh`
  from the repo root. Builds the standalone image with Cloud Build, finds the
  backend URL automatically, and deploys a second Cloud Run service.
- **Vercel:** set the project root to `web/` and add `NEXT_PUBLIC_API_URL`
  (or leave it unset for the demo-mode build).

## How it maps to the backend

- `lib/stream.ts` reads the NDJSON stream from `POST /api/runs` and
  `POST /api/runs/resume`.
- `lib/demo.ts` holds the canned scripts for demo mode.
- The event shapes in `lib/types.ts` match `supplyagents/streaming.py`.
