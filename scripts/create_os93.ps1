$content = Get-Content 'c:\Users\pietrouni\OneDrive\DevOps\pietrouni.com\src\terminal\os93_raw.txt' -Raw

# Create header with imports
$header = @"
// terminal/os93.js - main os93 command handler
// this is the big one - all 50+ commands

import { getTerminalPromptHTML, resolvePath, TERMINAL_STATE, pushTerminalHistory, setTerminalHistoryIndex } from './core.js';
import { fileSystem, asciiAlpha } from '../config.js';
import { shuffledQuotes, quoteIndex, setQuoteIndex, shuffleArray, quotes } from '../state.js';

// sub-mode state - these are local to the terminal
const guessGame = { active: false, target: null, attempts: 0 };
const ciscoMode = { active: false };
const terraformMode = { active: false };

// filesystem state
let currentPath = '/home/guest';

// getter for current directory object
function getDirObj() {
  return resolvePath(currentPath);
}

// the main handler - takes windows reference for 'open' command
export function handleOS93Command(input, output, inputEl, windows) {

"@

# Fix the function declaration and remove window global
$body = $content -replace 'window\.handleOS93Command = function \(input, output, inputEl\)', ''
$body = $body -replace '^\s+// normal mode commands\r?\n', ''

# Fix dirObj references to use getter
$body = $body -replace '\bdirObj\b', 'getDirObj()'

# Fix quoteIndex setter
$body = $body -replace 'quoteIndex\+\+', 'setQuoteIndex(quoteIndex + 1)'
$body = $body -replace 'quoteIndex = 0', 'setQuoteIndex(0)'

# Add export at the end
$footer = @"

// export sub-mode state for potential external use
export { guessGame, ciscoMode, terraformMode };
"@

$header + $body + $footer | Set-Content 'c:\Users\pietrouni\OneDrive\DevOps\pietrouni.com\src\terminal\os93.js' -Encoding UTF8
Write-Output "Created os93.js"
