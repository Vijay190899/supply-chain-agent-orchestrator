#!/usr/bin/env bash
# Deploy the orchestrator service to Google Cloud Run.
#
# Uses `gcloud run deploy --source`, which builds the container with Cloud
# Build and deploys it in one step (no local Docker needed). Idempotent:
# re-running ships a new revision.
#
# Prerequisites: gcloud installed and authenticated, a project selected, and
# billing enabled. See docs/DEPLOY.md for the full walkthrough.
#
# Usage:
#   PROJECT_ID=my-project ./deploy/deploy.sh
#   PROJECT_ID=my-project REGION=europe-west3 ./deploy/deploy.sh

set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID to your GCP project id}"
REGION="${REGION:-europe-west1}"
SERVICE="${SERVICE:-supply-chain-orchestrator}"

echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Service : ${SERVICE}"
echo

gcloud config set project "${PROJECT_ID}"

echo "Enabling required APIs (first run only)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

echo "Building and deploying..."
gcloud run deploy "${SERVICE}" \
  --source . \
  --region "${REGION}" \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --port 8080

URL="$(gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)')"
echo
echo "Deployed: ${URL}"
echo "Try it:   curl -s ${URL}/ | jq"
echo "Run one:  curl -s -X POST ${URL}/run -H 'Content-Type: application/json' -d '{\"scenario\":\"suez-blockage\"}' | jq"
