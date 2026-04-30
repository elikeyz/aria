#!/usr/bin/env bash

set -euo pipefail

echo "aria API - Docker Deployment"
echo "========================================="

# Load .env if present
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Validate required env
if [ -z "${DEFAULT_AWS_REGION:-}" ]; then
  echo "Error: DEFAULT_AWS_REGION not found in your .env file."
  exit 1
fi

REGION="$DEFAULT_AWS_REGION"
ECR_REPOSITORY="aria-api"

echo ""
echo "Getting AWS account details..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "AWS Account: $ACCOUNT_ID"
echo "Region: $REGION"

# Get ECR URL from Terraform
echo ""
echo "Getting ECR repository URL..."

ORIGINAL_DIR=$(pwd)
TERRAFORM_DIR="$(cd "$(dirname "$0")/../terraform" && pwd)"

cd "$TERRAFORM_DIR"

terraform init -input=false \
  -backend-config="bucket=aria-terraform-state-${ACCOUNT_ID}" \
  -backend-config="key=dev/terraform.tfstate" \
  -backend-config="region=${REGION}" \
  -backend-config="dynamodb_table=aria-terraform-locks" \
  -backend-config="encrypt=true"

ECR_URL=$(terraform output -raw ecr_repository_url || true)

cd "$ORIGINAL_DIR"

if [ -z "$ECR_URL" ]; then
  echo "Error: ECR repository not found. Run 'terraform apply' first."
  exit 1
fi

echo "ECR Repository: $ECR_URL"

# Login to ECR
echo ""
echo "Logging in to ECR..."

aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ECR_URL"

echo "Login successful!"

# Generate tag
TIMESTAMP=$(date +%s)
IMAGE_TAG="deploy-${TIMESTAMP}"

# Build Docker image
echo ""
echo "Building Docker image for linux/amd64 with tag: $IMAGE_TAG"
echo "(This ensures compatibility with AWS App Runner)"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

docker build \
  --platform linux/amd64 \
  -t "${ECR_REPOSITORY}:${IMAGE_TAG}" \
  .

# Tag images
echo ""
echo "Tagging image for ECR..."

docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_URL}:${IMAGE_TAG}"
docker tag "${ECR_REPOSITORY}:${IMAGE_TAG}" "${ECR_URL}:latest"

# Push
echo ""
echo "Pushing image to ECR..."

docker push "${ECR_URL}:${IMAGE_TAG}"
docker push "${ECR_URL}:latest"

echo ""
echo "✅ Docker image pushed successfully!"
echo ""
echo "Next step: Run 'terraform apply' in terraform/ to create the App Runner service."

# Get App Runner service
echo ""
echo "Getting App Runner service details..."

SERVICE_ARNS=$(aws apprunner list-services \
  --region "$REGION" \
  --query "ServiceSummaryList[?ServiceName=='aria-api'].ServiceArn" \
  --output json)

SERVICE_ARN=$(echo "$SERVICE_ARNS" | jq -r '.[0]')

if [ "$SERVICE_ARN" == "null" ] || [ -z "$SERVICE_ARN" ]; then
  echo ""
  echo "App Runner service not found. You may need to run 'terraform apply' first."
  exit 0
fi

echo "Found service: $SERVICE_ARN"

# Get access role
ACCESS_ROLE=$(aws apprunner describe-service \
  --service-arn "$SERVICE_ARN" \
  --region "$REGION" \
  --query "Service.SourceConfiguration.AuthenticationConfiguration.AccessRoleArn" \
  --output text)

echo ""
echo "Updating service to use new image: ${ECR_URL}:${IMAGE_TAG}"

SOURCE_CONFIG=$(jq -n \
  --arg image "${ECR_URL}:${IMAGE_TAG}" \
  --arg role "$ACCESS_ROLE" \
  --arg region "$REGION" \
  --arg openai "${OPENAI_API_KEY:-}" \
  '{
    ImageRepository: {
      ImageIdentifier: $image,
      ImageConfiguration: {
        Port: "8000",
        RuntimeEnvironmentVariables: {
          ENVIRONMENT: "production",
          OPENAI_API_KEY: $openai,
          DEFAULT_AWS_REGION: $region,
        }
      },
      ImageRepositoryType: "ECR"
    },
    AuthenticationConfiguration: {
      AccessRoleArn: $role
    },
    AutoDeploymentsEnabled: false
  }')

aws apprunner update-service \
  --service-arn "$SERVICE_ARN" \
  --region "$REGION" \
  --source-configuration "$SOURCE_CONFIG" \
  > /dev/null

echo "✅ Service updated with new image!"

# Wait for deployment
echo ""
echo "Waiting for deployment to complete (this may take 5-10 minutes)..."

MAX_ATTEMPTS=120
ATTEMPTS=0

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
  STATUS=$(aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --query "Service.Status" \
    --output text)

  STATUS=$(echo "$STATUS" | xargs)

  if [ "$STATUS" == "RUNNING" ]; then
    echo ""
    echo "✅ Deployment complete! Service is running."

    SERVICE_URL=$(aws apprunner describe-service \
      --service-arn "$SERVICE_ARN" \
      --region "$REGION" \
      --query "Service.ServiceUrl" \
      --output text)

    echo ""
    echo "🚀 Your service is available at:"
    echo "   https://${SERVICE_URL}"
    echo ""
    echo "Test it with:"
    echo "   curl https://${SERVICE_URL}/health"
    break
  elif [ "$STATUS" == "OPERATION_IN_PROGRESS" ]; then
    echo -n "."
    sleep 5
    ATTEMPTS=$((ATTEMPTS + 1))
  else
    echo ""
    echo "⚠️ Unexpected status: $STATUS"
    break
  fi
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
  echo ""
  echo "⚠️ Deployment is taking longer than expected."
fi
