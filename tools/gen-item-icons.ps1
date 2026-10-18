# Builds art/items/icons.jpg: every icon the gear builder's items use, in one image (36 px squares, 24 per row), in the
# order of research/raw/item-icons.txt (written by tools/gen-items.js; the same order as WL.ITEM_ICONS.names).
# Icons are downloaded once from https://wow.zamimg.com/images/wow/icons/medium/<name>.jpg into research/icons/items/.
# Usage: powershell -ExecutionPolicy Bypass -File tools\gen-item-icons.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$names = [IO.File]::ReadAllLines("$root\research\raw\item-icons.txt") | Where-Object { $_ -ne '' }
$dir = "$root\research\icons\items"; New-Item -ItemType Directory -Force $dir | Out-Null
$size = 36; $cols = 24; $rows = [Math]::Ceiling($names.Count / $cols)
$got = 0; $missing = @()
foreach ($n in $names) {
  $f = "$dir\$n.jpg"
  if (-not (Test-Path $f)) {
    try { Invoke-WebRequest -UseBasicParsing "https://wow.zamimg.com/images/wow/icons/medium/$n.jpg" -OutFile $f; $got++; Start-Sleep -Milliseconds 80 }
    catch { $missing += $n }
  }
}
$sheet = New-Object Drawing.Bitmap ($cols * $size), ($rows * $size)
$g = [Drawing.Graphics]::FromImage($sheet)
$g.Clear([Drawing.Color]::FromArgb(24, 24, 24))
$g.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
for ($i = 0; $i -lt $names.Count; $i++) {
  $f = "$dir\$($names[$i]).jpg"
  if (-not (Test-Path $f)) { continue }
  $img = [Drawing.Image]::FromFile($f)
  $g.DrawImage($img, ($i % $cols) * $size, [Math]::Floor($i / $cols) * $size, $size, $size)
  $img.Dispose()
}
$g.Dispose()
New-Item -ItemType Directory -Force "$root\art\items" | Out-Null
$enc = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$p = New-Object Drawing.Imaging.EncoderParameters 1
$p.Param[0] = New-Object Drawing.Imaging.EncoderParameter ([Drawing.Imaging.Encoder]::Quality), 88L
$sheet.Save("$root\art\items\icons.jpg", $enc, $p)
$sheet.Dispose()
$kb = [Math]::Round((Get-Item "$root\art\items\icons.jpg").Length / 1KB)
"art/items/icons.jpg: $($names.Count) icons ($cols x $rows), $kb KB; downloaded now: $got; missing: $($missing.Count) $($missing -join ', ')"
