# Runs a fixed set of tickets one after another, unattended.
# Every ticket gets its own `claude -p` process, so each one starts with a clean context.
param(
  # Ticket numbers in dependency order (blockers first).
  [int[]]$Tickets = @(79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91),
  # Unattended means nothing may prompt; acceptEdits would stall on the first command outside the allowlist.
  [string]$PermissionMode = "bypassPermissions",
  [string]$Repo = "Jaffator/bikecheck-app",
  # Prompt template; {n} is replaced with the ticket number.
  [string]$PromptTemplate = "/implement #{n}",
  # A hung ticket must not block the whole queue.
  [int]$TimeoutMinutes = 90,
  # Dependency order means a failed blocker poisons the rest, so stop unless told otherwise.
  [switch]$ContinueOnFailure,
  # Off by default: closing is a separate review step, not part of implementing.
  [switch]$CloseIssues
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot "logs\tickets\$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Each ticket commits to whatever branch is checked out, so say which one that is.
$branch = (git rev-parse --abbrev-ref HEAD).Trim()
Write-Host ""
Write-Host "Branch:          $branch" -ForegroundColor Cyan
Write-Host "Tickets:         $($Tickets -join ', ')" -ForegroundColor Cyan
Write-Host "Permission mode: $PermissionMode" -ForegroundColor Cyan
Write-Host "Logs:            $logDir" -ForegroundColor Cyan
if ($branch -eq "main") {
  Write-Host "You are on main - every ticket will commit straight to it." -ForegroundColor Yellow
}
Write-Host ""

$done = @()
$skipped = @()
$failed = @()

foreach ($n in $Tickets) {
  # Reads the title fresh so a renamed or closed ticket is visible before it starts.
  $issue = gh issue view $n --repo $Repo --json number,title,state | ConvertFrom-Json
  Write-Host "------------------------------------------------------------"
  Write-Host "#$($issue.number) [$($issue.state)] $($issue.title)"
  Write-Host "------------------------------------------------------------"

  if ($issue.state -ne "OPEN") {
    Write-Host "Already closed, skipping." -ForegroundColor DarkGray
    $skipped += $n
    continue
  }

  $prompt = $PromptTemplate.Replace("{n}", "$n")
  $outLog = Join-Path $logDir "$n.out.log"
  $errLog = Join-Path $logDir "$n.err.log"
  $started = Get-Date
  Write-Host "Running: claude -p `"$prompt`"" -ForegroundColor DarkGray

  # A fresh process per ticket is what guarantees the clean context - never --continue/--resume.
  # -p keeps it headless, so the run ends on its own instead of waiting for a window to be closed.
  $proc = Start-Process -FilePath "claude" -ArgumentList @(
    "-p", $prompt,
    "--permission-mode", $PermissionMode
  ) -WorkingDirectory $repoRoot -NoNewWindow -PassThru `
    -RedirectStandardOutput $outLog -RedirectStandardError $errLog

  if (-not $proc.WaitForExit($TimeoutMinutes * 60 * 1000)) {
    Write-Host "Timed out after $TimeoutMinutes min, killing it." -ForegroundColor Red
    try { $proc.Kill() } catch {}
    $failed += $n
    if (-not $ContinueOnFailure) { break }
    continue
  }

  $elapsed = [int]((Get-Date) - $started).TotalMinutes
  if ($proc.ExitCode -ne 0) {
    Write-Host "#$n failed (exit $($proc.ExitCode), ${elapsed}m). Tail of $outLog:" -ForegroundColor Red
    if (Test-Path $outLog) {
      Get-Content $outLog -Tail 20 | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
    }
    $failed += $n
    if (-not $ContinueOnFailure) { break }
    continue
  }

  Write-Host "#$n done in ${elapsed}m." -ForegroundColor Green
  $done += $n

  if ($CloseIssues) {
    gh issue close $n --repo $Repo
    Write-Host "Closed #$n." -ForegroundColor Green
  }
  Write-Host ""
}

Write-Host "============================================================"
Write-Host "Ran:     $($done -join ', ')"
Write-Host "Skipped: $($skipped -join ', ')"
Write-Host "Failed:  $($failed -join ', ')"
Write-Host "Logs:    $logDir"
Write-Host "============================================================"
if ($failed.Count -gt 0) { exit 1 }
