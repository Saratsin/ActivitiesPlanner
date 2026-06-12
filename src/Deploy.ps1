$IMAGE="europe-central2-docker.pkg.dev/activitiesplaner/cloud-run-services/telegram-bot:latest"
gcloud builds submit --tag "$IMAGE"
gcloud run deploy "telegram-bot" --image $IMAGE `
--region "europe-central2" --platform managed `
--allow-unauthenticated --port 8080 `
--memory 512Mi --cpu 1 `
--timeout 300 --min-instances 1 `
--max-instances 1