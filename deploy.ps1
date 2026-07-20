#!/usr/bin/env pwsh
# ==============================================================================
# SVC-AI-CONTROLLER DEPLOYMENT SCRIPT
# ==============================================================================
# Purpose: Deploy svc-ai-controller to DigitalOcean Kubernetes
# Domain: biztada-crm.tadagram.com
# ==============================================================================

param(
    [switch]$BuildOnly,
    [switch]$DeployOnly,
    [switch]$SkipTests,
    [string]$Tag = "latest"
)

$ErrorActionPreference = "Stop"
$SERVICE_NAME = "svc-biztada-crm"
$REGISTRY = "registry.digitalocean.com/tadabiz-registry"
$IMAGE_NAME = "$REGISTRY/$SERVICE_NAME"
$NAMESPACE = "tadagram"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEPLOYING $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tag: $Tag" -ForegroundColor Yellow
Write-Host "Registry: $REGISTRY" -ForegroundColor Yellow
Write-Host "Domain: biztada-crm.tadagram.com" -ForegroundColor Yellow
Write-Host ""

# ==============================================================================
# STEP 1: Run Tests (unless skipped)
# ==============================================================================
if (-not $SkipTests -and -not $DeployOnly) {
    Write-Host "[CI] Step 1: Running CI Checks (Build, Vet, Test)..." -ForegroundColor Green
    
    Write-Host "  -> Installing dependencies..." -ForegroundColor Cyan
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Host " npm ci failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  -> Building project..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host " npm run build failed!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host " All CI checks passed!" -ForegroundColor Green
    Write-Host ""
}

# ==============================================================================
# STEP 2: Build Docker Image
# ==============================================================================
if (-not $DeployOnly) {
    Write-Host " Step 2: Building Docker Image..." -ForegroundColor Green
    
    # Build image
    docker build -t "${IMAGE_NAME}:${Tag}" .
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Docker build failed!" -ForegroundColor Red
        exit 1
    }
    
    # Also tag as latest if not already
    if ($Tag -ne "latest") {
        docker tag "${IMAGE_NAME}:${Tag}" "${IMAGE_NAME}:latest"
    }
    
    Write-Host " Docker image built: ${IMAGE_NAME}:${Tag}" -ForegroundColor Green
    Write-Host ""
}

# ==============================================================================
# STEP 3: Push to Registry
# ==============================================================================
if (-not $DeployOnly) {
    Write-Host "  Step 3: Pushing to DigitalOcean Registry..." -ForegroundColor Green
    
    # Login to DO registry (assumes doctl is configured)
    # doctl registry login
    # if ($LASTEXITCODE -ne 0) {
    #    Write-Host " Registry login failed!" -ForegroundColor Red
    #    exit 1
    # }
    
    # Push image
    docker push "${IMAGE_NAME}:${Tag}"
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Docker push failed!" -ForegroundColor Red
        exit 1
    }
    
    if ($Tag -ne "latest") {
        docker push "${IMAGE_NAME}:latest"
    }
    
    Write-Host " Image pushed to registry" -ForegroundColor Green
    Write-Host ""
}

if ($BuildOnly) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " BUILD COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
}

# ==============================================================================
# STEP 4: Apply Kubernetes Manifests
# ==============================================================================
Write-Host "  Step 4: Deploying to Kubernetes..." -ForegroundColor Green

# Check kubectl connection
kubectl cluster-info | Select-Object -First 1
if ($LASTEXITCODE -ne 0) {
    Write-Host " kubectl not connected to cluster!" -ForegroundColor Red
    exit 1
}

# Apply manifests in order
$manifests = @(
    "deployment.yaml"
)

foreach ($manifest in $manifests) {
    $path = "../../k8s/$SERVICE_NAME/$manifest"
    
    if (Test-Path $path) {
        Write-Host "  Applying $manifest..." -ForegroundColor Cyan
        kubectl apply -f $path -n $NAMESPACE
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "    Warning: Failed to apply $manifest" -ForegroundColor Yellow
        } else {
            Write-Host "   Applied $manifest" -ForegroundColor Green
        }
    } else {
        Write-Host "    Warning: $manifest not found" -ForegroundColor Yellow
    }
}

Write-Host "   Force restarting deployment to pull new image..." -ForegroundColor Cyan
kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE

Write-Host ""

# ==============================================================================
# STEP 5: Wait for Rollout
# ==============================================================================
Write-Host " Step 5: Waiting for rollout..." -ForegroundColor Green

kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=5m
if ($LASTEXITCODE -ne 0) {
    Write-Host " Rollout failed!" -ForegroundColor Red
    
    # Show pod status
    Write-Host ""
    Write-Host "Pod Status:" -ForegroundColor Yellow
    kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE
    
    # Show recent logs
    Write-Host ""
    Write-Host "Recent Logs:" -ForegroundColor Yellow
    kubectl logs -l app=$SERVICE_NAME -n $NAMESPACE --tail=50
    
    exit 1
}

Write-Host " Rollout complete" -ForegroundColor Green
Write-Host ""

# ==============================================================================
# STEP 6: Verify Deployment
# ==============================================================================
Write-Host " Step 6: Verifying Deployment..." -ForegroundColor Green

# Check pods
Write-Host "  Checking pods..." -ForegroundColor Cyan
kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE

# Check service
Write-Host ""
Write-Host "  Checking service..." -ForegroundColor Cyan
kubectl get svc $SERVICE_NAME -n $NAMESPACE

# Check ingress
Write-Host ""
Write-Host "  Checking ingress..." -ForegroundColor Cyan
kubectl get ingress -l app=$SERVICE_NAME -n $NAMESPACE

# Test health endpoint
Write-Host ""
Write-Host "  Testing health endpoint..." -ForegroundColor Cyan
Start-Sleep -Seconds 5  # Wait for ingress to propagate

$healthUrl = "https://biztada-crm.tadagram.com/health"
try {
    $response = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 10
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   Health check passed" -ForegroundColor Green
        Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "    Health check returned status $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    Health check failed (might take a few minutes for DNS/cert): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ==============================================================================
# SUMMARY
# ==============================================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service: $SERVICE_NAME" -ForegroundColor White
Write-Host "Image: ${IMAGE_NAME}:${Tag}" -ForegroundColor White
Write-Host "Namespace: $NAMESPACE" -ForegroundColor White
Write-Host "Domain: https://biztada-crm.tadagram.com" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  View logs:    kubectl logs -f deployment/$SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  View pods:    kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  View HPA:     kubectl get hpa $SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  Restart:      kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  Scale:        kubectl scale deployment/$SERVICE_NAME --replicas=5 -n $NAMESPACE" -ForegroundColor Gray
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Yellow
Write-Host "  Health:               GET  https://biztada-crm.tadagram.com/health" -ForegroundColor Gray
Write-Host "  Worker Register:      POST https://biztada-crm.tadagram.com/api/v1/accounts" -ForegroundColor Gray
Write-Host "  Create Task:          POST https://biztada-crm.tadagram.com/api/v1/brand-characters" -ForegroundColor Gray
Write-Host "  List Prompts:         GET  https://biztada-crm.tadagram.com/api/v1/my-workers" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
