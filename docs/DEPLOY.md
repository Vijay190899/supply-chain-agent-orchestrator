# Deploying to Google Cloud Run

The orchestrator ships an HTTP service (`supplyagents.service`) that runs a
disruption scenario per request. This deploys it to Cloud Run, which scales to
zero when idle, so a portfolio demo costs close to nothing.

## What it costs

Cloud Run's free tier covers 2 million requests and 180,000 vCPU-seconds per
month. A demo that scales to zero between clicks stays inside the free tier;
new accounts also get $300 in credits. Expect roughly $0.

## One-time account setup (browser)

1. Go to <https://console.cloud.google.com> and sign in.
2. Create a project (top bar, project selector, **New Project**). Note the
   **Project ID** (not the display name); it looks like `orchestrator-470912`.
3. Enable billing on the project (**Billing** in the console). The free tier and
   $300 credit still apply; a card is required but you will not be charged for
   this workload.

## One-time local setup

1. Install the Google Cloud CLI: <https://cloud.google.com/sdk/docs/install>
   (on Windows, the installer adds `gcloud` to PATH; restart your shell).
2. Authenticate:

   ```bash
   gcloud auth login
   ```

## Deploy

From the repo root:

```bash
PROJECT_ID=<your-project-id> REGION=europe-west1 ./deploy/deploy.sh
```

The script enables the Run and Cloud Build APIs, builds the container in the
cloud (no local Docker needed), deploys it, and prints the public URL. The
first build takes a few minutes; later deploys are faster. `europe-west1`
(Belgium) is a sensible region from Berlin; `europe-west3` is Frankfurt.

## Try it

```bash
URL=<printed by the script>

curl -s $URL/                     # service info + known scenarios
curl -s $URL/healthz              # {"status":"ok"}

curl -s -X POST $URL/run \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"suez-blockage","decision":"approved"}'
```

The response carries the event log, whether the approval gate was hit, the
chosen option, and the drafted customer message.

## Optional: export traces to Langfuse

The service traces to Langfuse when the keys are present. Store them as secrets
and reference them from the service:

```bash
echo -n "$LANGFUSE_PUBLIC_KEY" | gcloud secrets create langfuse-public --data-file=-
echo -n "$LANGFUSE_SECRET_KEY" | gcloud secrets create langfuse-secret --data-file=-

gcloud run services update supply-chain-orchestrator --region "$REGION" \
  --update-secrets=LANGFUSE_PUBLIC_KEY=langfuse-public:latest \
  --update-secrets=LANGFUSE_SECRET_KEY=langfuse-secret:latest \
  --update-env-vars=LANGFUSE_HOST=https://cloud.langfuse.com
```

## Infrastructure as code (alternative)

`deploy/terraform/` manages the same Cloud Run service declaratively. Build and
push the image once, then `terraform apply`. See the comments in
`deploy/terraform/main.tf`.

## Teardown

```bash
gcloud run services delete supply-chain-orchestrator --region "$REGION"
```

## Notes and limits

- The service resolves the human-approval gate within a single request using
  the `decision` field. The durable pause/resume across separate calls is a
  local feature (SQLite checkpoint); in the cloud it needs a shared store
  (Cloud SQL), which is deliberately out of scope for a free-tier demo.
- Feeds run in-process here. The MCP server path is for local use; wrapping it
  as a sidecar is future work.
