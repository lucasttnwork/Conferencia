# Inicia o servidor MCP do Trello via stdio, sem emitir saída antes da conexão

param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Minimiza ruído de ferramentas Node/NPM
$env:NPM_CONFIG_UPDATE_NOTIFIER = 'false'
$env:NPM_CONFIG_FUND = 'false'
$env:NPM_CONFIG_AUDIT = 'false'
$env:NPM_CONFIG_LOGLEVEL = 'silent'
$env:NO_UPDATE_NOTIFIER = '1'

function Resolve-NodePath {
	$cmd = Get-Command node -ErrorAction SilentlyContinue
	if ($cmd) { return $cmd.Source }
	$cmd = Get-Command node.exe -ErrorAction SilentlyContinue
	if ($cmd) { return $cmd.Source }
	return $null
}

$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir

# Não imprimir nada antes de iniciar o processo stdio do MCP
$nodePath = Resolve-NodePath
if (-not $nodePath) { exit 1 }

& $nodePath "$projectRoot/scripts/mcp-trello.mjs" 2>$null



