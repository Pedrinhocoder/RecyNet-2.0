# O mesmo servidor de npm start, sem instalar ferramentas globais.
$ErrorActionPreference = 'Stop'
$recynetExitCode = 1
Push-Location -LiteralPath $PSScriptRoot
try {
    $recynetNode = Get-Command node -CommandType Application -ErrorAction Stop
    Write-Host 'RecyNet - Documentacao da API planejada'
    Write-Host 'O endereco da documentacao sera exibido pelo servidor.'
    Write-Host 'Pressione Ctrl+C para parar o servidor.'
    & $recynetNode.Source (Join-Path $PSScriptRoot 'scripts/serve.cjs')
    $recynetExitCode = $LASTEXITCODE
} catch {
    Write-Host "Nao foi possivel iniciar o servidor. Verifique Node.js 20 ou superior e a porta: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Pop-Location
}
exit $recynetExitCode
