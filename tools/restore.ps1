# Restores the simulator from versions\<Name>\ (page, app, data, engine, tests, exploration tool).
# Safety: the CURRENT state is first saved as versions\pre-restore-<timestamp>\, so a restore can itself be undone.
# Docs are not touched (they keep the full history; add a CHANGELOG / build-log entry about the revert).
# Usage: powershell -ExecutionPolicy Bypass -File tools\restore.ps1 -Name v34-before-eureka-rework
param([Parameter(Mandatory = $true)][string]$Name)
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$src = Join-Path $root "versions\$Name"
if (-not (Test-Path $src)) { throw "No snapshot named '$Name' in $root\versions" }
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
& (Join-Path $PSScriptRoot 'snapshot.ps1') -Name "pre-restore-$stamp"
$items = @('index.html', 'app', 'data', 'engine', 'tests', 'tools')
foreach ($i in $items) {
  $from = Join-Path $src $i; $to = Join-Path $root $i
  if (-not (Test-Path $from)) { continue }
  if (Test-Path $to) { Remove-Item $to -Recurse -Force }
  Copy-Item $from $to -Recurse -Force
}
"Restored '$Name'. The previous state is in versions\pre-restore-$stamp. Run the tests (tests/index.html) and republish the artifact."
