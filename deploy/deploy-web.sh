#!/usr/bin/env bash
# Deploy the web UI (Next.js) to Google Cloud Run.
#
# Builds the frontend image with Cloud Build (no local Docker needed), baking
# in the backend URL so the UI runs in live mode. If the backend service isn't
# found, it deploys in demo mode (self-contained, no backend required).
#
# Prereqs: gcloud authenticated, a project selected, billing enabled.
# Run from the repo root. See docs/DEPLOY.md.
#
# Usage:
#   PROJECT_ID=my-project ./deploy/deploy-web.sh
#   PROJECT_ID=my-project API_URL=https://my-backend.run.app ./deploy/deploy-web.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID to your GCP project id}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-disruption-console}"
BACKEND_SERVICE="${BACKEND_SERVICE:-supply-chain-orchestrator}"
REPO="web"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${SERVICE}:latest"

gcloud config set project "${PROJECT_ID}"

echo "Enabling required APIs (first run only)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

echo "Ensuring Artifact Registry repo '${REPO}' exists..."
gcloud artifacts repositories describe "${REPO}" --location "${REGION}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${REPO}" --repository-format=docker --location "${REGION}"

# Resolve the backend URL: explicit API_URL wins; else look up the backend
# service; else empty -> demo mode.
if [[ -z "${API_URL:-}" ]]; then
  API_URL="$(gcloud run services describe "${BACKEND_SERVICE}" --region "${REGION}" \
    --format='value(status.url)' 2>/dev/null || true)"
fi
if [[ -n "${API_URL}" ]]; then
  echo "Backend URL: ${API_URL} (live mode)"
else
  echo "No backend found; building in demo mode."
fi

echo "Building the frontend image with Cloud Build..."
gcloud builds submit web \
  --config web/cloudbuild.yaml \
  --substitutions "_IMAGE=${IMAGE},_API_URL=${API_URL}"

echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --region "${REGION}" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --port 8080

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo
echo "Web UI deployed: ${URL}"
