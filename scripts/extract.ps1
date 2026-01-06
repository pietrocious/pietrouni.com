$lines = Get-Content 'c:\Users\pietrouni\OneDrive\DevOps\pietrouni.com\src\main.js'
$extracted = $lines[1106..2248]
$extracted | Set-Content 'c:\Users\pietrouni\OneDrive\DevOps\pietrouni.com\src\terminal\os93_raw.txt' -Encoding UTF8
Write-Output "Extracted lines 1107-2249 (0-indexed 1106-2248)"
