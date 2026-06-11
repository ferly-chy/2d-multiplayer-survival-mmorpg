param(
    [string]$Branch = ""
)

$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

if ([string]::IsNullOrWhiteSpace($Branch)) {
    $Branch = (git branch --show-current).Trim()
}

if ([string]::IsNullOrWhiteSpace($Branch)) {
    throw "Could not determine current branch. Pass -Branch <name> explicitly."
}

$requiredRemotes = @("public", "origin")
$configuredRemotes = git remote

foreach ($remote in $requiredRemotes) {
    if ($configuredRemotes -notcontains $remote) {
        throw "Missing required git remote '$remote'."
    }
}

foreach ($remote in $requiredRemotes) {
    Write-Host "Pushing $Branch to $remote/$Branch..."
    git push $remote "${Branch}:${Branch}"
}

Write-Host "Pushed $Branch to public and origin."
