// Downloaders for the large offline library. Sources checked 2026-11-14.
// Shell/PowerShell variables avoid brace syntax so they survive JS template strings.

export const LLM_URL = 'https://huggingface.co/mozilla-ai/Llama-3.2-1B-Instruct-llamafile/resolve/main/Llama-3.2-1B-Instruct-Q6_K.llamafile';

export const getLibrarySh = () => `#!/bin/sh
# ARK offline library downloader (Mac and Linux). Run once while you still have internet.
#   sh get-library.sh          essentials, about 3.5 GB
#   sh get-library.sh --full   adds all of English Wikipedia (about 13 GB more)
# Safe to run again: it resumes and skips finished files.
cd "$(dirname "$0")" && mkdir -p files && cd files || exit 1
K=https://download.kiwix.org
latest() { curl -sL "$K/zim/wikipedia/" | grep -oE "$1_[0-9]{4}-[0-9]{2}\\.zim" | sort -u | tail -1; }
get() { echo; echo "== $2"; curl -L -C - --fail --progress-bar -o "$1" "$3" || echo "!! Could not download $1. Run this script again later to resume."; }

Z=$(latest wikipedia_en_medicine_maxi); get "$Z" "Medical encyclopedia, WikiMed (about 1.7 GB)" "$K/zim/wikipedia/$Z"
Z=$(latest wikipedia_en_top_mini); get "$Z" "Most-read Wikipedia articles (about 0.3 GB)" "$K/zim/wikipedia/$Z"
if [ "$1" = "--full" ]; then Z=$(latest wikipedia_en_all_mini); get "$Z" "All of English Wikipedia, summaries (about 13 GB)" "$K/zim/wikipedia/$Z"; fi

A=$(curl -sL "$K/release/kiwix-android/" | grep -oE 'org\\.kiwix\\.kiwixmobile\\.standalone-v?[0-9.]+[0-9]\\.apk' | sort -u | tail -1)
get "Kiwix-Android.apk" "Kiwix Wikipedia reader for Android" "$K/release/kiwix-android/$A"
O=$(curl -sL https://api.github.com/repos/organicmaps/organicmaps/releases/latest | grep -oE 'https://[^"]+\\.apk' | head -1)
get "OrganicMaps-Android.apk" "Organic Maps offline maps for Android" "$O"
T=$(curl -sL "$K/release/kiwix-tools/" | grep -oE 'kiwix-tools_linux-x86_64-musl-[0-9.]+[0-9]\\.tar\\.gz' | sort -u | tail -1)
get "kiwix-tools-linux.tar.gz" "kiwix-serve, shares Wikipedia over a hotspot (Linux)" "$K/release/kiwix-tools/$T"
get "ARK-Offline-AI.llamafile" "Offline AI assistant, Llama 3.2 1B (about 1.3 GB)" "${LLM_URL}"
chmod +x ARK-Offline-AI.llamafile 2>/dev/null

echo; echo "Finished. Files are in: $(pwd)"; ls -lh
`;

export const getLibraryPs1 = () => `# ARK offline library downloader (Windows 10 or 11).
# Right-click this file > Run with PowerShell. Add -Full for all of English Wikipedia (about 13 GB more).
# Safe to run again: it resumes and skips finished files.
param([switch]$Full)
Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force files | Out-Null
Set-Location files
$K = 'https://download.kiwix.org'
function Latest($pattern, $url) { $html = (Invoke-WebRequest -UseBasicParsing $url).Content; [regex]::Matches($html, $pattern) | ForEach-Object { $_.Value } | Sort-Object -Unique | Select-Object -Last 1 }
function Get-ArkFile($name, $label, $url) { Write-Host ""; Write-Host "== $label"; curl.exe -L -C - --fail -o $name $url; if ($LASTEXITCODE -ne 0) { Write-Host "!! Could not download $name. Run this again later to resume." } }

$z = Latest 'wikipedia_en_medicine_maxi_\\d{4}-\\d{2}\\.zim' "$K/zim/wikipedia/"; Get-ArkFile $z 'Medical encyclopedia, WikiMed (about 1.7 GB)' "$K/zim/wikipedia/$z"
$z = Latest 'wikipedia_en_top_mini_\\d{4}-\\d{2}\\.zim' "$K/zim/wikipedia/"; Get-ArkFile $z 'Most-read Wikipedia articles (about 0.3 GB)' "$K/zim/wikipedia/$z"
if ($Full) { $z = Latest 'wikipedia_en_all_mini_\\d{4}-\\d{2}\\.zim' "$K/zim/wikipedia/"; Get-ArkFile $z 'All of English Wikipedia, summaries (about 13 GB)' "$K/zim/wikipedia/$z" }
$a = Latest 'org\\.kiwix\\.kiwixmobile\\.standalone-v?[0-9.]+[0-9]\\.apk' "$K/release/kiwix-android/"; Get-ArkFile 'Kiwix-Android.apk' 'Kiwix Wikipedia reader for Android' "$K/release/kiwix-android/$a"
$o = (Invoke-RestMethod 'https://api.github.com/repos/organicmaps/organicmaps/releases/latest').assets | Where-Object { $_.name -like '*.apk' } | Select-Object -First 1
Get-ArkFile 'OrganicMaps-Android.apk' 'Organic Maps offline maps for Android' $o.browser_download_url
Get-ArkFile 'ARK-Offline-AI.exe' 'Offline AI assistant, Llama 3.2 1B (about 1.3 GB)' '${LLM_URL}'

Write-Host ""; Write-Host "Finished. Files are in: $(Get-Location)"; Get-ChildItem | Format-Table Name, Length
Read-Host 'Press Enter to close'
`;