param(
    [Parameter(Mandatory = $true)]
    [string]$Message,

    [switch]$All,

    [string]$Branch = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

if ($All) {
    git add -A
}

$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace(($staged -join ""))) {
    throw "No staged changes to commit. Stage files first, or pass -All."
}

git commit -m $Message

& "$PSScriptRoot\git-push-both.ps1" -Branch $Branch
