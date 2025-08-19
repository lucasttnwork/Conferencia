Param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Read-JsonFile([string]$Path) {
	if (-not (Test-Path $Path)) { throw "Arquivo não encontrado: $Path" }
	Get-Content -Raw -Path $Path | ConvertFrom-Json
}

$root = Split-Path -Parent $PSScriptRoot
$mcpPath = Join-Path $root '.cursor/mcp.json'
$sqlPath = Join-Path $root 'dashboard_view.sql'

$cfg = Read-JsonFile $mcpPath
$supa = $cfg.mcpServers.supabase
if (-not $supa) { throw 'Config MCP Supabase não encontrada em .cursor/mcp.json' }

$token = $supa.env.SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($token)) { throw 'SUPABASE_ACCESS_TOKEN ausente em .cursor/mcp.json' }

$projectRef = $null
foreach ($a in $supa.args) {
	if ($a -like '--project-ref=*') { $projectRef = $a.Split('=')[1]; break }
}
if (-not $projectRef) { throw 'project-ref não encontrado nos args do MCP Supabase' }

$sql = Get-Content -Raw -Path $sqlPath -Encoding UTF8
$body = @{ query = $sql } | ConvertTo-Json -Depth 5

Write-Host "Aplicando views em $projectRef..."
$resp = Invoke-RestMethod -Method Post -Uri ("https://api.supabase.com/v1/projects/$projectRef/sql") -Headers @{ Authorization = "Bearer $token" } -ContentType 'application/json' -Body $body
Write-Host ("OK: " + ($resp | ConvertTo-Json -Depth 5))


