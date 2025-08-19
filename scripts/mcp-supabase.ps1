# Carrega SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN do .env (se existir) e inicia o MCP do Supabase

param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Load-DotEnvVars {
	param(
		[string]$EnvFilePath,
		[string[]]$KeysToLoad
	)
	if (-not (Test-Path $EnvFilePath)) { return }
	$lines = Get-Content -Path $EnvFilePath -Encoding UTF8
	foreach ($line in $lines) {
		if ([string]::IsNullOrWhiteSpace($line)) { continue }
		if ($line.Trim().StartsWith('#')) { continue }
		$idx = $line.IndexOf('=')
		if ($idx -lt 1) { continue }
		$key = $line.Substring(0, $idx).Trim()
		$value = $line.Substring($idx + 1).Trim()
		# Remove aspas simples/duplas no início/fim se presentes
		if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Trim('"') }
		if ($value.StartsWith("'") -and $value.EndsWith("'")) { $value = $value.Trim("'") }
		if ($KeysToLoad -contains $key) {
			[Environment]::SetEnvironmentVariable($key, $value, 'Process')
		}
	}
}

$env:NPM_CONFIG_UPDATE_NOTIFIER = 'false'
$env:NPM_CONFIG_FUND = 'false'
$env:NPM_CONFIG_AUDIT = 'false'
$env:NPM_CONFIG_LOGLEVEL = 'silent'
$env:NO_UPDATE_NOTIFIER = '1'

function Resolve-NpxPath {
	$cmd = Get-Command npx -ErrorAction SilentlyContinue
	if ($cmd) { return $cmd.Source }
	$cmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
	if ($cmd) { return $cmd.Source }
	return $null
}

$scriptDir = $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$envPath = Join-Path $projectRoot '.env'
Load-DotEnvVars -EnvFilePath $envPath -KeysToLoad @('SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN')

function Require-EnvVars {
	param([string[]]$Names)
	foreach ($n in $Names) { if (-not ${env:$n} -or [string]::IsNullOrWhiteSpace(${env:$n})) { exit 1 } }
}

# Não emitir qualquer saída antes de iniciar o servidor MCP
Require-EnvVars -Names @('SUPABASE_PROJECT_REF','SUPABASE_ACCESS_TOKEN')

# Inicia o MCP do Supabase com read-only e project-ref do ambiente
$npxPath = Resolve-NpxPath
if (-not $npxPath) { exit 1 }

& $npxPath -y @supabase/mcp-server-supabase@latest --read-only --project-ref $env:SUPABASE_PROJECT_REF 2>$null


