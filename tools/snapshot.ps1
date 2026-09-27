# Saves a restorable copy of the simulator (page, app, data, engine, tests, exploration tool) to versions\<Name>\.
# Docs are NOT copied: they are the running history and stay current. Record every snapshot in VERSIONS.md.
# Usage: powershell -ExecutionPolicy Bypass -File tools\snapshot.ps1 -Name v34-before-eureka-rework
param([Parameter(Mandatory = $true)][string]$Name)
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
if ($Name -notmatch '^[A-Za-z0-9._-]+$') { throw "Name may only contain letters, digits, '.', '_' and '-'" }
$dest = Join-Path $root "versions\$Name"
if (Test-Path $dest) { throw "Snapshot '$Name' already exists: $dest" }
New-Item -ItemType Directory -Force $dest | Out-Null
$items = @('index.html', 'app', 'data', 'engine', 'tests', 'tools')
foreach ($i in $items) {
  $src = Join-Path $root $i
  if (Test-Path $src) { Copy-Item $src (Join-Path $dest $i) -Recurse -Force }
}
# the versions folder itself must never be copied into a snapshot
$files = Get-ChildItem $dest -Recurse -File
$bytes = ($files | Measure-Object Length -Sum).Sum
"Snapshot '$Name' saved: $($files.Count) files, $([math]::Round($bytes / 1KB)) KB -> $dest"
