@echo off
echo ========================================
echo   RecyNet API - Iniciando Servidor Local
echo ========================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Python encontrado! Iniciando servidor...
    echo.
    echo Acesse: http://localhost:8080/api-docs.html
    echo.
    echo Pressione Ctrl+C para parar o servidor.
    echo ========================================
    echo.
    python -m http.server 8080
    goto :end
)

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% == 0 (
    echo [OK] Node.js encontrado! Verificando http-server...
    echo.
    
    REM Tentar usar http-server
    call npx http-server --version >nul 2>&1
    if %errorlevel% == 0 (
        echo [OK] http-server encontrado! Iniciando servidor...
        echo.
        echo Acesse: http://localhost:8080/api-docs.html
        echo.
        echo Pressione Ctrl+C para parar o servidor.
        echo ========================================
        echo.
        npx http-server -p 8080
        goto :end
    ) else (
        echo [AVISO] http-server nao encontrado. Instalando...
        npm install -g http-server
        echo.
        echo [OK] Iniciando servidor...
        echo.
        echo Acesse: http://localhost:8080/api-docs.html
        echo.
        echo Pressione Ctrl+C para parar o servidor.
        echo ========================================
        echo.
        http-server -p 8080
        goto :end
    )
)

REM Nenhum servidor disponível
echo [ERRO] Nem Python nem Node.js foram encontrados!
echo.
echo Por favor, instale um dos seguintes:
echo   1. Python (https://www.python.org/downloads/)
echo   2. Node.js (https://nodejs.org/)
echo.
echo Apos a instalacao, execute este script novamente.
echo.
pause

:end
