# Requires: PowerShell (Run as Administrator)

param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

function Write-Section {
	param(
		[string]$Title,
		[string]$Content
	)
	"== $Title" | Add-Content -Path $Output -Encoding UTF8
	$Content | Add-Content -Path $Output -Encoding UTF8
	"" | Add-Content -Path $Output -Encoding UTF8
}

function Capture {
	param(
		[string]$Title,
		[scriptblock]$Block
	)
	try {
		$txt = & $Block 2>&1 | Out-String
		Write-Section -Title $Title -Content $txt
	} catch {
		Write-Section -Title $Title -Content ("ERROR: " + ($_.Exception.Message))
	}
}

# Ensure running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
	Write-Error 'Este script precisa ser executado como Administrador (Run as Administrator).'
	exit 1
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Output = Join-Path $root 'verify-windows-admin-output.txt'
"== Verify started: $(Get-Date -Format s)" | Set-Content -Path $Output -Encoding UTF8

Capture 'systeminfo (Virtualization/Hyper-V lines)' { systeminfo | Select-String -Pattern 'Virtualization|Hyper-V' | Out-String }
Capture 'bcdedit /enum' { bcdedit /enum | Out-String }
Capture 'Windows Optional Features' { Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux,VirtualMachinePlatform,HypervisorPlatform,Microsoft-Hyper-V-All | Format-Table -Auto | Out-String }
Capture 'WSL --status' { wsl.exe --status | Out-String }
Capture 'WSL -l -v' { wsl.exe -l -v | Out-String }
Capture 'CPU Virtualization (WMIC)' { wmic cpu get virtualizationfirmwareenabled | Out-String }
Capture 'Hypervisor Present' { ((Get-CimInstance -ClassName Win32_ComputerSystem).HypervisorPresent | Out-String) }
Capture 'Docker version' { docker --version | Out-String }
Capture 'Docker compose version' { docker compose version | Out-String }

"== Verify completed: $(Get-Date -Format s)" | Add-Content -Path $Output -Encoding UTF8
Write-Host "Verificações concluídas. Veja: $Output"


