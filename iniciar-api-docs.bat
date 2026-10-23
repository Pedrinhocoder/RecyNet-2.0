@echo off
setlocal
REM Usar sempre a raiz do projeto, inclusive ao iniciar de outra pasta/unidade.
pushd "%~dp0" || exit /b 1
where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Instale Node.js 20 ou superior e execute novamente.
    popd
    exit /b 1
)
echo RecyNet - Documentacao da API planejada
echo O endereco da documentacao sera exibido pelo servidor.
echo Pressione Ctrl+C para parar o servidor.
node scripts\serve.cjs
set "recynet_exit_code=%errorlevel%"
popd
exit /b %recynet_exit_code%
