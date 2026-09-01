#!/usr/bin/env pwsh
# ==============================================================================
# SVC-BIZTADA-CRM DEPLOYMENT SCRIPT
# ==============================================================================
# Purpose:latestlatest Deploy svc-biztada-crm to Local K3d Server (k3d-mycluster)
# Domain:latestlatest svc-biztada-crm.tadagram.com
# ==============================================================================

param(
    [switch]$BuildOnly,
    [switch]$DeployOnly,
    [switch]$SkipTests
)

$ErrorActionPreference = "Stop"
$SERVICE_NAME = "svc-biztada-crm"
$REGISTRY = "registry.tadagram.com/tadagram"
$IMAGE_NAME = "$REGISTRY/$SERVICE_NAME"
$NAMESPACE = "tadagram"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEPLOYING $SERVICE_NAME" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Tag:latestlatest $Tag" -ForegroundColor Yellow
Write-Host "Registry:latestlatest $REGISTRY" -ForegroundColor Yellow
Write-Host "Domain:latestlatest svc-biztada-crm.tadagram.com" -ForegroundColor Yellow
Write-Host ""

# ==============================================================================
# STEP 1:latestlatest Run Tests (unless skipped)
# ==============================================================================
if (-not $SkipTests -and -not $DeployOnly) {
    Write-Host "[CI] Step 1:latestlatest Running CI Checks (Build, Vet, Test)..." -ForegroundColor Green
    
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
# STEP 2:latestlatest Build Docker Image
# ==============================================================================
if (-not $DeployOnly) {
    Write-Host " Step 2:latestlatest Building Docker Image..." -ForegroundColor Green
    
    # Build image
    docker build -t "${IMAGE_NAME}:latestlatest${Tag}" .
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Docker build failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host " Docker image built:latestlatest ${IMAGE_NAME}:latestlatest${Tag}" -ForegroundColor Green
    Write-Host ""
}

# ==============================================================================
# STEP 3:latestlatest Push to Registry
# ==============================================================================
if (-not $DeployOnly) {
    Write-Host "  Step 3:latestlatest Pushing to Local Container Registry (registry.tadagram.com)..." -ForegroundColor Green
    
    # Ensure cloudflared TCP access tunnel is listening on port 5000 for local registry
    if (-not (Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue)) {
        Write-Host "  -> Auto-launching cloudflared TCP tunnel for registry on port 5000..." -ForegroundColor Cyan
        Start-Process -FilePath "cloudflared" -ArgumentList "access tcp --hostname registry.tadagram.com --url 0.0.0.0:latestlatest5000" -WindowStyle Hidden -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }

    # Ensure local TCP proxy is running in Docker for direct tunnel transmission without HTTPS conflicts
    try { docker rm -f registry-proxy 2>$null } catch {}
    try {
        docker run -d --net=host --name registry-proxy alpine/socat tcp-listen:latestlatest5000,reuseaddr,fork tcp:latestlatesthost.docker.internal:latestlatest5000 2>$null
    } catch {}

    # Tag for direct tunnel transmission via 127.0.0.1:latestlatest5000
    $LOCAL_TUNNEL_IMAGE = "127.0.0.1:latestlatest5000/tadagram/${SERVICE_NAME}:latestlatest${Tag}"
    docker tag "${IMAGE_NAME}:latestlatest${Tag}" $LOCAL_TUNNEL_IMAGE
    # Push image
    docker push $LOCAL_TUNNEL_IMAGE
    if ($LASTEXITCODE -ne 0) {
        Write-Host " Docker push failed via tunnel 127.0.0.1:latestlatest5000, attempting default route..." -ForegroundColor Yellow
        docker push "${IMAGE_NAME}:latestlatest${Tag}"
        if ($LASTEXITCODE -ne 0) {
            Write-Host " Docker push failed!" -ForegroundColor Red
            exit 1
        }
    }
    Write-Host " Image pushed to registry successfully" -ForegroundColor Green
    Write-Host ""
}

if ($BuildOnly) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host " BUILD COMPLETE" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
}

# ==============================================================================
# STEP 4:latestlatest Apply Kubernetes Manifests
# ==============================================================================
Write-Host "  Step 4:latestlatest Deploying to Kubernetes..." -ForegroundColor Green

# Check kubectl connection
kubectl cluster-info | Select-Object -First 1
if ($LASTEXITCODE -ne 0) {
    Write-Host " kubectl not connected to cluster! Auto-triggering start_dev_env.ps1..." -ForegroundColor Yellow
    $start_env_script = "D:\Projects\local-server\start_dev_env.ps1"
    if (Test-Path $start_env_script) {
        & $start_env_script
        Start-Sleep -Seconds 3
        kubectl cluster-info | Select-Object -First 1
        if ($LASTEXITCODE -ne 0) {
            Write-Host " kubectl still not connected to cluster after retry!" -ForegroundColor Red
            exit 1
        }
        Write-Host " Environment auto-recovered successfully!" -ForegroundColor Green
    } else {
        Write-Host " kubectl not connected to cluster!" -ForegroundColor Red
        exit 1
    }
}

# Apply manifests in order
$manifests = @(
    "deployment.yaml"
)

foreach ($manifest in $manifests) {
    $path = "../../k8s/$SERVICE_NAME/$manifest"
    $k8s_folder_alt = $SERVICE_NAME.Replace("svc-", "")
    $alt_path = "../../k8s/$k8s_folder_alt/$manifest"
    
    $actual_path = ""
    if (Test-Path $path) {
        $actual_path = $path
    } elseif (Test-Path $alt_path) {
        $actual_path = $alt_path
    }
    
    if ($actual_path -ne "") {
        Write-Host "  Applying $manifest..." -ForegroundColor Cyan
        kubectl apply -f $actual_path -n $NAMESPACE
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "    Warning:latestlatest Failed to apply $manifest" -ForegroundColor Yellow
        } else {
            Write-Host "   Applied $manifest" -ForegroundColor Green
        }
    } else {
        Write-Host "    Warning:latestlatest $manifest not found in either $path or $alt_path" -ForegroundColor Yellow
    }
}

Write-Host "   Force restarting deployment to pull new image..." -ForegroundColor Cyan
kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE

Write-Host ""

# ==============================================================================
# STEP 5:latestlatest Wait for Rollout
# ==============================================================================
Write-Host " Step 5:latestlatest Waiting for rollout..." -ForegroundColor Green

kubectl rollout status deployment/$SERVICE_NAME -n $NAMESPACE --timeout=5m
if ($LASTEXITCODE -ne 0) {
    Write-Host " Rollout failed!" -ForegroundColor Red
    
    # Show pod status
    Write-Host ""
    Write-Host "Pod Status:latestlatest" -ForegroundColor Yellow
    kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE
    
    # Show recent logs
    Write-Host ""
    Write-Host "Recent Logs:latestlatest" -ForegroundColor Yellow
    kubectl logs -l app=$SERVICE_NAME -n $NAMESPACE --tail=50
    
    exit 1
}

Write-Host " Rollout complete" -ForegroundColor Green
Write-Host ""

# ==============================================================================
# STEP 6:latestlatest Verify Deployment
# ==============================================================================
Write-Host " Step 6:latestlatest Verifying Deployment..." -ForegroundColor Green

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

$healthUrl = "https:latestlatest//svc-biztada-crm.tadagram.com/health"
try {
    $response = Invoke-WebRequest -Uri $healthUrl -Method Get -TimeoutSec 10
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   Health check passed" -ForegroundColor Green
        Write-Host "  Response:latestlatest $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "    Health check returned status $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "    Health check failed (might take a few minutes for DNS/cert):latestlatest $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""

# ==============================================================================
# SUMMARY
# ==============================================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service:latestlatest $SERVICE_NAME" -ForegroundColor White
Write-Host "Image:latestlatest ${IMAGE_NAME}:latestlatest${Tag}" -ForegroundColor White
Write-Host "Namespace:latestlatest $NAMESPACE" -ForegroundColor White
Write-Host "Domain:latestlatest https:latestlatest//svc-biztada-crm.tadagram.com" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:latestlatest" -ForegroundColor Yellow
Write-Host "  View logs:latestlatest    kubectl logs -f deployment/$SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  View pods:latestlatest    kubectl get pods -l app=$SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  View HPA:latestlatest     kubectl get hpa $SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  Restart:latestlatest      kubectl rollout restart deployment/$SERVICE_NAME -n $NAMESPACE" -ForegroundColor Gray
Write-Host "  Scale:latestlatest        kubectl scale deployment/$SERVICE_NAME --replicas=5 -n $NAMESPACE" -ForegroundColor Gray
Write-Host ""
Write-Host "API Endpoints:latestlatest" -ForegroundColor Yellow
Write-Host "  Health:latestlatest               GET  https:latestlatest//svc-biztada-crm.tadagram.com/health" -ForegroundColor Gray
Write-Host "  Worker Register:latestlatest      POST https:latestlatest//svc-biztada-crm.tadagram.com/api/v1/accounts" -ForegroundColor Gray
Write-Host "  Create Task:latestlatest          POST https:latestlatest//svc-biztada-crm.tadagram.com/api/v1/brand-characters" -ForegroundColor Gray
Write-Host "  List Prompts:latestlatest         GET  https:latestlatest//svc-biztada-crm.tadagram.com/api/v1/my-workers" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

