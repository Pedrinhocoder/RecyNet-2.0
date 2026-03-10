# ========================================
#   RecyNet API - Iniciando Servidor Local
# ========================================

Write-Host "========================================" -ForegroundColor Green
Write-Host "  RecyNet API - Servidor Local" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Verificar se Python está instalado
$pythonInstalled = $false
try {
    $pythonVersion = python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pythonInstalled = $true
        Write-Host "[OK] Python encontrado: $pythonVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "[AVISO] Python não encontrado" -ForegroundColor Yellow
}

# Verificar se Node.js está instalado
$nodeInstalled = $false
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $nodeInstalled = $true
        Write-Host "[OK] Node.js encontrado: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "[AVISO] Node.js não encontrado" -ForegroundColor Yellow
}

Write-Host ""

# Escolher servidor
if ($pythonInstalled) {
    Write-Host "Iniciando servidor Python..." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Acesse: http://localhost:8080/api-docs.html" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar o servidor." -ForegroundColor Gray
    Write-Host ""
    
    # Abrir navegador automaticamente após 2 segundos
    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 2
        Start-Process "http://localhost:8080/api-docs.html"
    } | Out-Null
    
    python -m http.server 8080
} elseif ($nodeInstalled) {
    Write-Host "Iniciando servidor Node.js (http-server)..." -ForegroundColor Cyan
    Write-Host ""
    
    # Verificar se http-server está instalado
    try {
        npx http-server --version 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[AVISO] http-server não encontrado. Instalando..." -ForegroundColor Yellow
            npm install -g http-server
        }
    } catch {
        Write-Host "[AVISO] Instalando http-server..." -ForegroundColor Yellow
        npm install -g http-server
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  Acesse: http://localhost:8080/api-docs.html" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar o servidor." -ForegroundColor Gray
    Write-Host ""
    
    # Abrir navegador automaticamente após 2 segundos
    Start-Job -ScriptBlock {
        Start-Sleep -Seconds 2
        Start-Process "http://localhost:8080/api-docs.html"
    } | Out-Null
    
    npx http-server -p 8080
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  ERRO: Nenhum servidor disponível!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale um dos seguintes:" -ForegroundColor Yellow
    Write-Host "  1. Python: https://www.python.org/downloads/" -ForegroundColor White
    Write-Host "  2. Node.js: https://nodejs.org/" -ForegroundColor White
    Write-Host ""
    Write-Host "Após a instalação, execute este script novamente." -ForegroundColor Gray
    Write-Host ""
    Pause
}
