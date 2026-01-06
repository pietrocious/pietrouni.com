$lines = Get-Content 'c:\Users\pietrouni\OneDrive\DevOps\pietrouni.com\src\main.js'
# Keep lines 1-983 (0-982) and 2340+ (2339+)
$pre = $lines[0..982]
$post = $lines[2339..($lines.Count - 1)]
$comment = "        // terminal code has been extracted to src/terminal/*.js modules"
$combined = $pre + "" + $comment + "" + $post
$combined | Set-Content 'c:\Users\pietrouni\OneDrive\DevOps\pietrouni.com\src\main.js' -Encoding UTF8
Write-Output "Removed terminal code"
