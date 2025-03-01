# Git Auto LFS für PowerShell
$maxSizeMB = 50
Write-Host "🔍 Scanne nach großen Dateien (> $maxSizeMB MB)..."

# Finde Dateien, die größer als $maxSizeMB MB sind
$largeFiles = Get-ChildItem -Recurse | Where-Object { $_.Length -gt ($maxSizeMB * 1MB) -and $_.FullName -notmatch '\\.git\\' -and $_.FullName -notmatch '\\node_modules\\' }

if ($largeFiles.Count -eq 0) {
    Write-Host "✅ Keine großen Dateien gefunden."
    exit 0
}

Write-Host "🚀 Folgende große Dateien werden zu Git LFS hinzugefügt:"
$largeFiles | ForEach-Object { Write-Host $_.FullName }

# Git LFS aktivieren
git lfs install

# Große Dateien zu LFS hinzufügen
$largeFiles | ForEach-Object {
    git lfs track $_.FullName
    git add $_.FullName
}

# .gitattributes hinzufügen
git add .gitattributes

Write-Host "✅ Alle großen Dateien wurden zu Git LFS verschoben!"
