# Infrastructure-as-code alternative to deploy.sh.
#
# Terraform can't build the image itself, so the flow is: build+push once with
# Cloud Build, then `terraform apply` to manage the Cloud Run service and its
# public-access binding. deploy.sh is simpler for a first deploy; this exists
# to show the same result expressed as reviewable, version-controlled infra.
#
#   gcloud builds submit --tag "${REGION}-docker.pkg.dev/${PROJECT}/apps/orchestrator"
#   terraform init && terraform apply \
#     -var project_id=$PROJECT -var image=<the tag above>

terraform {
  required_version = ">= 1.5"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

variable "project_id" {
  type        = string
  description = "GCP project id."
}

variable "region" {
  type        = string
  default     = "europe-west1"
  description = "Cloud Run region."
}

variable "image" {
  type        = string
  description = "Fully-qualified container image (e.g. europe-west1-docker.pkg.dev/PROJECT/apps/orchestrator)."
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_cloud_run_v2_service" "orchestrator" {
  name     = "supply-chain-orchestrator"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0
      max_instance_count = 3
    }
    containers {
      image = var.image
      ports {
        container_port = 8080
      }
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
      # Langfuse tracing is optional. To enable it, wire these to Secret
      # Manager instead of leaving them unset:
      # env {
      #   name = "LANGFUSE_PUBLIC_KEY"
      #   value_source { secret_key_ref { secret = "langfuse-public"  version = "latest" } }
      # }
    }
  }
}

# Public, unauthenticated access (portfolio demo). Drop this for a private API.
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.orchestrator.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
}

output "service_url" {
  value = google_cloud_run_v2_service.orchestrator.uri
}
