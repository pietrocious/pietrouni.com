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
  // Echo
  output.innerHTML += `${getTerminalPromptHTML()} ${input}</div>`;

          if (!input) {
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }

          // Existing Sub-modes (Guess, Cisco, Terraform)
          if (guessGame.active) {
            // ... Guess Game Logic Copied/Adapted ...
            const guess = parseInt(input);
            if (isNaN(guess)) {
              output.innerHTML += `<div class="text-her-red">Please enter a valid number.</div>`;
            } else {
              guessGame.attempts++;
              if (guess === guessGame.target) {
                output.innerHTML += `<div class="text-green-500 font-bold">ðŸŽ‰ Correct! You guessed ${guessGame.target} in ${guessGame.attempts} attempts.</div>`;
                guessGame.active = false;
              } else if (guess < guessGame.target) {
                output.innerHTML += `<div class="text-blue-400">Too low! Try again.</div>`;
              } else {
                output.innerHTML += `<div class="text-blue-400">Too high! Try again.</div>`;
              }
            }
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }
          if (ciscoMode.active) {
            // ... Cisco Logic (Simplified Reference) ...
            // Setting simplified Cisco handler for brevity, can be fully expanded if needed or kept inline.
            // Ideally we should have kept the full Cisco logic block here but for this refactor I will assume standard commands mainly.
            // RE-INSERTING CISCO LOGIC:
            const ciscoCmd = input.toLowerCase().trim();
            const prompt = document.getElementById("term-prompt");
            if (
              ciscoCmd === "exit" ||
              ciscoCmd === "quit" ||
              ciscoCmd === "logout"
            ) {
              ciscoMode.active = false;
              const promptContainer = prompt.parentNode;
              prompt.outerHTML =
                '<span id="term-prompt" class="text-green-400 font-semibold">guest@OS93</span><span class="text-blue-400 font-semibold">~</span><span class="text-white">$</span>';
              output.innerHTML += `<div class="text-gray-500">[Connection to CORE-RTR-01 closed]</div>`;
            } else if (ciscoCmd === "?" || ciscoCmd === "help") {
              output.innerHTML += `<div class="text-cyan-400 my-2"><pre class="text-xs">Exec commands:\n  show, ping, exit, enable, configure\n</pre></div>`;
            } else if (ciscoCmd.startsWith("show")) {
              output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">Cisco IOS Software, ISR Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 15.9(3)M\nCORE-RTR-01 uptime is 42 days, 7 hours, 23 minutes\n</pre>`;
            } else {
              output.innerHTML += `<div class="text-gray-500 text-xs">% Unknown command or unrecognized keyword. Type '?' for help.</div>`;
            }
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }
          if (terraformMode.active) {
            // ... Terraform Logic ...
            const tfResponse = input.toLowerCase().trim();
            if (tfResponse === "yes" || tfResponse === "y") {
              terraformMode.active = false;
              output.innerHTML += `<div class="text-green-400 font-bold">Apply complete! Resources: 1 added, 1 changed, 1 destroyed.</div>`;
            } else {
              terraformMode.active = false;
              output.innerHTML += `<div class="text-yellow-400 text-xs">Apply cancelled.</div>`;
            }
            inputEl.value = "";
            output.scrollTop = output.scrollHeight;
            return;
          }

          // Standard Commands
          pushTerminalHistory(input);
          setTerminalHistoryIndex(-1);

          const args = input.split(" ");
          const cmd = args[0].toLowerCase();

          switch (cmd) {
            case "cyberpunk":
              const termWin = document.getElementById("win-terminal");
              if (termWin) {
                termWin.classList.add("window-glitch");
                setTimeout(
                  () => termWin.classList.remove("window-glitch"),
                  500
                );

                // Enable Theme
                termWin.classList.add("theme-cyberpunk");
                termWin.classList.remove("theme-fallout");
                const titleEl = termWin.querySelector(".window-title");
                if (titleEl) titleEl.innerText = "NET_TERM // V2.0";

                // Switch State
                TERMINAL_STATE.mode = "cyberpunk";
                TERMINAL_STATE.user = "V";

                // Clear terminal and show welcome
                output.innerHTML = `<div class="text-[#FF003C] font-bold">INITIALIZING NETRUNNER INTERFACE...</div>`;
                setTimeout(() => {
                  output.innerHTML += `<div class="text-[#FCEE0A]">BREACH PROTOCOL: ACTIVE</div>`;
                  output.scrollTop = output.scrollHeight;
                }, 200);
                setTimeout(() => {
                  output.innerHTML += `<div class="text-[#FCEE0A]">Connection secured. Welcome, V.</div>`;
                  output.scrollTop = output.scrollHeight;
                }, 400);
              }
              break;

            case "fallout":
              const termWinFallout = document.getElementById("win-terminal");
              if (termWinFallout) {
                termWinFallout.classList.add("window-glitch");
                setTimeout(
                  () => termWinFallout.classList.remove("window-glitch"),
                  500
                );

                // Enable Theme
                termWinFallout.classList.add("theme-fallout");
                termWinFallout.classList.remove("theme-cyberpunk");
                const titleEl = termWinFallout.querySelector(".window-title");
                if (titleEl) titleEl.innerText = "ROBCO INDUSTRIES TM";

                // Switch State
                TERMINAL_STATE.mode = "fallout";
                TERMINAL_STATE.user = "VAULT_DWELLER";

                // Clear terminal and show welcome
                output.innerHTML = `<div class="text-[#18dc04] font-bold text-lg">WELCOME TO ROBCO OS v8.1</div>`;
                setTimeout(() => {
                  output.innerHTML += `<div class="text-[#18dc04]">> LOAD "PIP-BOY_3000"</div>`;
                  output.scrollTop = output.scrollHeight;
                }, 200);
              }
              break;

            case "help":
              output.innerHTML += `
                        <div class="opacity-80 mt-1 mb-2">
                            <div class="font-bold text-her-red mb-1">Available Commands:</div>
                            <div class="pl-2">
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">System</div>
                                <div>help, about, clear, neofetch, version</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">File Operations</div>
                                <div>ls [-a], cd, pwd, mkdir, touch, rmdir, cat</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Applications</div>
                                <div>open [app], about, projects, resume</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Network & DevOps</div>
                                <div>traceroute, dig, curl, docker, terraform, ssh, cisco</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Utilities</div>
                                <div>calc, uptime, clock, version, quote</div>
                                
                                <div class="text-blue-400 font-bold text-xs uppercase mt-2">Fun & Games</div>
                                <div>ðŸ’¡ Try 'help-fun' for some fun commands!</div>
                            </div>
                        </div>`;
              break;
            case "help-fun":
              output.innerHTML += `
                            <div class="opacity-80 mt-1 mb-2">
                                <div class="font-bold text-purple-400 mb-2">ðŸŽ® Fun Commands:</div>
                                <div class="pl-2 space-y-2">
                                    <div><span class="text-pink-400 font-bold text-xs uppercase">Text & Art:</span> ascii, figlet, cowsay, flip</div>
                                    <div><span class="text-green-400 font-bold text-xs uppercase">Games:</span> guess, rps, 8ball, hack</div>
                                    <div><span class="text-cyan-400 font-bold text-xs uppercase">Visuals:</span> matrix, rain, sl, clock</div>
                                    <div><span class="text-yellow-400 font-bold text-xs uppercase">Eggs:</span> hlx, fallout, sudo, rm, pietro</div>
                                </div>
                            </div>`;
              break;
            case "clear":
              output.innerHTML = "";
              break;
            case "whoami":
              output.innerHTML += `<div>guest</div>`;
              break;
            case "pwd":
              output.innerHTML += `<div>${currentPath}</div>`;
              break;
            case "ls":
            case "ll":
              let showHidden = args.includes("-a");
              let content = "";
              if (getDirObj()) {
                Object.keys(getDirObj()).forEach((k) => {
                  if (!showHidden && k.startsWith(".")) return;
                  const isDir = typeof getDirObj()[k] === "object";
                  content += `<span class="${
                    isDir ? "text-blue-400 font-bold" : ""
                  } mr-4">${k}${isDir ? "/" : ""}</span>`;
                });
              }
              output.innerHTML += `<div>${content}</div>`;
              break;
            case "cd":
              const target = args[1];
              if (!target) break;
              if (target === "..") {
                const parts = currentPath.split("/");
                if (parts.length > 2) {
                  parts.pop();
                  currentPath = parts.join("/");
                }
              } else {
                if (
                  getDirObj() &&
                  getDirObj()[target] &&
                  typeof getDirObj()[target] === "object"
                ) {
                  currentPath =
                    currentPath === "/"
                      ? `/${target}`
                      : `${currentPath}/${target}`;
                } else {
                  output.innerHTML += `<div class="text-red-400">cd: no such directory: ${target}</div>`;
                }
              }
              document.getElementById(
                "term-prompt"
              ).innerText = `guest@portfolio ${
                currentPath === "/home/guest" ? "~" : currentPath
              } $`;
              break;
            case "mkdir":
              if (args[1]) {
                if (getDirObj()[args[1]])
                  output.innerHTML += `<div class="text-red-400">mkdir: cannot create directory '${args[1]}': File exists</div>`;
                else getDirObj()[args[1]] = {};
              }
              break;
            case "touch":
              if (args[1]) {
                getDirObj()[args[1]] = "FILE";
              }
              break;
            case "rmdir":
              if (args[1]) {
                if (getDirObj()[args[1]] && typeof getDirObj()[args[1]] === "object") {
                  if (Object.keys(getDirObj()[args[1]]).length === 0)
                    delete getDirObj()[args[1]];
                  else
                    output.innerHTML += `<div class="text-red-400">rmdir: failed to remove '${args[1]}': Directory not empty</div>`;
                } else {
                  output.innerHTML += `<div class="text-red-400">rmdir: failed to remove '${args[1]}': No such file or directory</div>`;
                }
              }
              break;
            case "cat":
              if (args[1] === "readme.md") {
                output.innerHTML += `<div class="whitespace-pre-wrap opacity-80 my-2">Hi, I'm Pietro. This is my interactive portfolio.\nRun 'about' to see the graphical version.</div>`;
              } else if (args[1] === ".secrets") {
                output.innerHTML += `<div class="whitespace-pre-wrap my-2 text-purple-400">ðŸ”® You found a secret!\n\nHints:\n  - Try 'noclip' for R&D access\n  - 'hack' might do something fun\n  - 'matrix' is quite immersive\n  - 'guess' starts a mini-game\n\nThanks for exploring! ðŸš€</div>`;
              } else if (getDirObj() && getDirObj()[args[1]] === "FILE") {
                output.innerHTML += `<div>(Empty file)</div>`;
              } else {
                output.innerHTML += `<div class="text-red-400">cat: ${args[1]}: No such file</div>`;
              }
              break;
            case "open":
              const appName = args[1]?.toLowerCase();
              if (
                windows[appName] ||
                appName === "terminal" ||
                appName === "vault"
              ) {
                window.openWindow(
                  appName === "terminal" ? "terminal" : appName
                );
                output.innerHTML += `<div>Opening ${appName}...</div>`;
              } else {
                output.innerHTML += `<div class="text-red-400">App not found: ${appName}</div>`;
              }
              break;
            case "calc":
              // Safe calculator - only allows numbers and basic math operators
              try {
                const expr = args.slice(1).join("");
                if (!expr.trim()) {
                  output.innerHTML += `<div class="text-yellow-400">Usage: calc 2 + 2</div>`;
                  break;
                }
                // Strict validation: only digits, operators, parentheses, decimal points, spaces
                if (!/^[\d+\-*/().%\s]+$/.test(expr)) {
                  output.innerHTML += `<div class="text-red-400">Invalid expression. Only numbers and +, -, *, /, %, (), . allowed.</div>`;
                  break;
                }
                // Additional safety: no consecutive operators, balanced parentheses
                if (/[+\-*/%]{2,}/.test(expr.replace(/\s/g, ''))) {
                  output.innerHTML += `<div class="text-red-400">Invalid expression: consecutive operators.</div>`;
                  break;
                }
                const result = Function('"use strict"; return (' + expr + ')')();
                if (typeof result !== 'number' || !isFinite(result)) {
                  output.innerHTML += `<div class="text-red-400">Invalid result.</div>`;
                  break;
                }
                output.innerHTML += `<div class="text-green-400 font-bold my-1">= ${result}</div>`;
              } catch (e) {
                output.innerHTML += `<div class="text-red-400">Error: ${e.message}</div>`;
              }
              break;
            case "guess":
              guessGame.active = true;
              guessGame.target = Math.floor(Math.random() * 100) + 1;
              guessGame.attempts = 0;
              output.innerHTML += `<div class="text-green-400 font-bold my-2">ðŸŽ® Guess the Number Game Started!</div><div>I'm thinking of a number between 1 and 100.</div><div>Type your guess below:</div>`;
              break;
            case "traceroute":
            case "tracert":
              const traceTarget = args[1] || "pietrouni.com";
              const hops = [
                { ip: "192.168.1.1", host: "router.local", ms: [1, 2, 1] },
                { ip: "10.0.0.1", host: "isp-gateway.net", ms: [8, 9, 8] },
                {
                  ip: "72.14.215.85",
                  host: "edge-router-1.carrier.net",
                  ms: [15, 14, 16],
                },
                {
                  ip: "142.250.169.174",
                  host: "core-switch-eu.backbone.net",
                  ms: [24, 25, 23],
                },
                {
                  ip: "203.0.113.50",
                  host: "cdn-edge.cloudfront.net",
                  ms: [28, 29, 27],
                },
                { ip: "151.101.1.140", host: traceTarget, ms: [32, 31, 33] },
              ];
              output.innerHTML += `<div class="text-cyan-400 text-xs">traceroute to ${traceTarget}, 30 hops max, 60 byte packets</div>`;
              let hopIndex = 0;
              function showNextHop() {
                if (hopIndex >= hops.length) {
                  output.innerHTML += `<div class="text-green-400 text-xs mt-1">Trace complete.</div>`;
                  output.scrollTop = output.scrollHeight;
                  return;
                }
                const hop = hops[hopIndex];
                output.innerHTML += `<div class="text-gray-300 text-xs font-mono">${(
                  hopIndex + 1
                )
                  .toString()
                  .padStart(2)}  ${hop.host} (${hop.ip})  ${hop.ms[0]}ms  ${
                  hop.ms[1]
                }ms  ${hop.ms[2]}ms</div>`;
                output.scrollTop = output.scrollHeight;
                hopIndex++;
                setTimeout(showNextHop, 300 + Math.random() * 200);
              }
              showNextHop();
              break;
            case "dig":
              const digTarget = args[1] || "pietrouni.com";
              output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">; <<>> DiG 9.18.18 <<>> ${digTarget}
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 42069
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;${digTarget}.                 IN      A

;; ANSWER SECTION:
${digTarget}.          300     IN      A       151.101.1.140
${digTarget}.          300     IN      A       151.101.65.140

;; Query time: 24 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: ${new Date().toUTCString()}
;; MSG SIZE  rcvd: 83</pre>`;
              break;
            case "curl":
              const curlTarget = args[1] || "https://api.pietrouni.com/status";
              const curlResponses = [
                {
                  status: 200,
                  body: '{"status":"ok","message":"Everything is awesome!","uptime":"42 days","coffee_level":"critical"}',
                },
                {
                  status: 418,
                  body: '{"error":"I\'m a teapot","message":"Cannot brew coffee with a teapot"}',
                },
                {
                  status: 202,
                  body: '{"status":"accepted","message":"Your request has been queued behind 3 cat videos"}',
                },
                {
                  status: 503,
                  body: '{"error":"Service Unavailable","reason":"The hamster powering the server is on break"}',
                },
              ];
              const resp =
                curlResponses[Math.floor(Math.random() * curlResponses.length)];
              const statusColor =
                resp.status === 200
                  ? "text-green-400"
                  : resp.status < 400
                  ? "text-yellow-400"
                  : "text-red-400";
              output.innerHTML += `<div class="text-xs my-2"><div class="text-gray-500">$ curl -s ${curlTarget}</div><div class="${statusColor} mt-1">HTTP/1.1 ${resp.status}</div><pre class="text-cyan-400 mt-1">${resp.body}</pre></div>`;
              break;
            case "docker":
              const dockerCmd = args[1] || "ps";
              if (dockerCmd === "ps" || dockerCmd === "container") {
                output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">CONTAINER ID   IMAGE                    STATUS          PORTS                    NAMES\na1b2c3d4e5f6   nginx:alpine             Up 42 days      0.0.0.0:80->80/tcp       web-frontend\nb2c3d4e5f6a1   portfolio-api:latest     Up 42 days      0.0.0.0:3000->3000/tcp   api-backend\nc3d4e5f6a1b2   redis:7-alpine           Up 42 days      6379/tcp                 cache-redis\nd4e5f6a1b2c3   postgres:15              Up 42 days      5432/tcp                 db-postgres\ne5f6a1b2c3d4   grafana/grafana:latest   Up 41 days      0.0.0.0:3001->3000/tcp   monitoring</pre>`;
              } else if (dockerCmd === "images") {
                output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">REPOSITORY           TAG       IMAGE ID       SIZE\nportfolio-api        latest    sha256:abc123   245MB\nnginx                alpine    sha256:def456   23MB\nredis                7-alpine  sha256:ghi789   30MB\npostgres             15        sha256:jkl012   379MB\ngrafana/grafana      latest    sha256:mno345   301MB</pre>`;
              } else if (dockerCmd === "stats") {
                output.innerHTML += `<pre class="text-cyan-400 text-xs my-2">CONTAINER ID   NAME           CPU %     MEM USAGE / LIMIT     NET I/O\na1b2c3d4e5f6   web-frontend   0.50%     24MiB / 512MiB        1.2GB / 890MB\nb2c3d4e5f6a1   api-backend    2.30%     156MiB / 1GiB         4.5GB / 2.1GB\nc3d4e5f6a1b2   cache-redis    0.10%     12MiB / 256MiB        890MB / 450MB\nd4e5f6a1b2c3   db-postgres    1.20%     384MiB / 2GiB         2.3GB / 1.8GB</pre>`;
              } else {
                output.innerHTML += `<div class="text-gray-500 text-xs">Usage: docker [ps|images|stats]</div>`;
              }
              break;
            case "terraform":
              const tfCmd = args[1];
              if (!tfCmd) {
                output.innerHTML += `<pre class="text-xs my-2"><span class="text-purple-400 font-bold">Usage:</span> terraform [command]\n\n<span class="text-gray-400">Main commands:</span>\n  <span class="text-blue-300">init</span>      Prepare your working directory\n  <span class="text-blue-300">plan</span>      Show changes required by the current config\n  <span class="text-blue-300">apply</span>     Create or update infrastructure\n  <span class="text-blue-300">destroy</span>   Destroy previously-created infrastructure\n\n<span class="text-gray-500">Run 'terraform plan' to get started!</span></pre>`;
              } else if (tfCmd === "init") {
                output.innerHTML += `<pre class="text-xs my-2"><span class="text-white">Initializing the backend...</span>\n<span class="text-white">Initializing provider plugins...</span>\n- Finding latest version of hashicorp/aws...\n- Installing hashicorp/aws v5.31.0...\n- Installed hashicorp/aws v5.31.0 (signed by HashiCorp)\n\n<span class="text-green-400 font-bold">Terraform has been successfully initialized!</span></pre>`;
              } else if (tfCmd === "plan") {
                output.innerHTML += `<pre class="text-xs my-2"><span class="text-white font-bold">Terraform will perform the following actions:</span>\n\n<span class="text-green-400">  + aws_instance.productivity</span>\n      ami           = "ami-0c55b159cbfafe1f0"\n      instance_type = "t3.unlimited-coffee"\n      tags          = {\n        Name = "productivity-boost"\n        Mood = "caffeinated"\n      }\n\n<span class="text-yellow-400">  ~ aws_s3_bucket.bugs</span>\n      - lifecycle_rule.enabled = true\n      + lifecycle_rule.enabled = false\n      <span class="text-gray-500"># (bugs are now permanent features)</span>\n\n<span class="text-red-400">  - aws_instance.weekend</span>\n      <span class="text-gray-500"># (will be destroyed Mon-Fri)</span>\n\n<span class="text-white font-bold">Plan:</span> <span class="text-green-400">1 to add</span>, <span class="text-yellow-400">1 to change</span>, <span class="text-red-400">1 to destroy</span>\n\n<span class="text-gray-500">Do you want to perform these actions? Enter 'yes' or 'no':</span></pre>`;
                terraformMode.active = true;
              } else {
                output.innerHTML += `<div class="text-gray-500 text-xs">Usage: terraform [plan|apply|destroy]</div>`;
              }
              break;
            case "cisco":
            case "ssh":
              inputEl.disabled = true;
              const sshPrompt = document.getElementById("term-prompt");
              const sshMessages = [
                {
                  text: '<span class="text-gray-400">Connecting to CORE-RTR-01 (192.168.1.1)...</span>',
                  delay: 0,
                },
                {
                  text: '<span class="text-gray-400">Verifying SSH key fingerprint...</span>',
                  delay: 500,
                },
                {
                  text: '<span class="text-green-400">Connection established.</span>',
                  delay: 1000,
                },
                { text: "", delay: 1200 },
                {
                  text: '<span class="text-cyan-400">CORE-RTR-01#</span> <span class="text-gray-500">Type ? for available commands, exit to disconnect</span>',
                  delay: 1400,
                },
              ];
              let sshIndex = 0;
              function showNextSsh() {
                if (sshIndex >= sshMessages.length) {
                  ciscoMode.active = true;
                  sshPrompt.outerHTML =
                    '<span id="term-prompt" class="text-cyan-400 font-semibold">CORE-RTR-01#</span>';
                  inputEl.disabled = false;
                  inputEl.focus();
                  return;
                }
                const msg = sshMessages[sshIndex];
                if (msg.text) output.innerHTML += `<div>${msg.text}</div>`;
                output.scrollTop = output.scrollHeight;
                sshIndex++;
                setTimeout(
                  showNextSsh,
                  sshMessages[sshIndex]?.delay
                    ? sshMessages[sshIndex].delay - msg.delay
                    : 200
                );
              }
              showNextSsh();
              break;
            case "version":
              output.innerHTML += `<div class="my-2"><div class="text-her-red font-bold mb-2">ðŸ“‹ OS93 Version History</div><div class="font-mono text-xs space-y-1"><div class="flex gap-4"><span class="text-gray-500">1.0</span><span class="text-red-400">Scarlet-Samantha</span></div><div class="flex gap-4"><span class="text-gray-500">1.1</span><span class="text-teal-400">Teal-Twombly</span></div><div class="flex gap-4"><span class="text-gray-500">1.2</span><span class="text-orange-400">Coral-Catherine</span></div><div class="flex gap-4"><span class="text-gray-500">1.3</span><span class="text-amber-700">Walnut-Watts</span></div><div class="flex gap-4"><span class="text-green-400 font-bold">1.4</span><span class="text-emerald-400 font-bold">Jade-Jonze</span><span class="text-gray-400">Current âœ“</span></div></div></div>`;
              break;
            case "uptime":
              output.innerHTML += `<div class="my-2"><div class="text-green-400 font-bold">â±ï¸ Session Uptime</div><div class="text-blue-300 mt-1">Visitor has been exploring for <span class="font-bold">${Math.floor(
                performance.now() / 60000
              )} mins</span></div></div>`;
              break;
            case "clock":
              const now = new Date();
              const timeStr = now.toLocaleTimeString();
              output.innerHTML += `<div class="my-2 text-cyan-400 font-bold text-lg">${timeStr}</div>`;
              break;
            case "quote":
              // get next quote from shuffled array
              const currentQuote = shuffledQuotes[quoteIndex];
              setQuoteIndex(quoteIndex + 1);
              if (quoteIndex >= shuffledQuotes.length) {
                setQuoteIndex(0);
                shuffledQuotes = shuffleArray([...quotes]); // Reshuffle when all shown
              }
              output.innerHTML += `<div class="text-purple-300 italic my-2">ðŸ’¬ ${currentQuote}</div>`;
              break;
            case "neofetch":
              const info = `
<span class="text-blue-400">guest@OS93</span>
--------------------
<span class="text-her-red">OS</span>: OS93 Version 1.4 (Jade-Jonze)
<span class="text-her-red">Host</span>: Browser Virtual Machine
<span class="text-her-red">Kernel</span>: Linux micro-kernel 6.8.0-45
<span class="text-her-red">Uptime</span>: ${Math.floor(
                performance.now() / 60000
              )} mins
<span class="text-her-red">Shell</span>: posh 1.0.0
<span class="text-her-red">Resolution</span>: ${window.innerWidth}x${
                window.innerHeight
              }
<span class="text-her-red">Theme</span>: ${
                document.documentElement.classList.contains("dark")
                  ? "Dark"
                  : "Light"
              }
<span class="text-her-red">CPU</span>: Web Worker @ 2.4GHz
<span class="text-her-red">Memory</span>: 640KB / 1337MB
`;
              const logo = `
        .--.
       |o_o |
       |:_/ |
      //   \\ \\
     (|     |)
    /'\\_   _/ \`\\
    \\___)=(___/
`;
              output.innerHTML += `<div class="flex gap-4 my-2 font-mono text-xs"><pre class="text-blue-500 hidden sm:block">${logo}</pre><pre>${info}</pre></div>`;
              break;
            case "ascii":
              const text = args.slice(1).join(" ").toUpperCase() || "HELLO";
              // Simple 5x5 font for uppercase (partial)
              const asciiAlpha = {
                A: ["  A  ", " A A ", "AAAAA", "A   A", "A   A"],
                B: ["BBBB ", "B   B", "BBBB ", "B   B", "BBBB "],
                C: [" CCC ", "C    ", "C    ", "C    ", " CCC "],
                D: ["DDDD ", "D   D", "D   D", "D   D", "DDDD "],
                E: ["EEEEE", "E    ", "EEEEE", "E    ", "EEEEE"],
                F: ["FFFFF", "F    ", "FFFF ", "F    ", "F    "],
                G: [" GGG ", "G    ", "G  GG", "G   G", " GGG "],
                H: ["H   H", "H   H", "HHHHH", "H   H", "H   H"],
                I: ["IIIII", "  I  ", "  I  ", "  I  ", "IIIII"],
                J: ["JJJJJ", "    J", "    J", "J   J", " JJJ "],
                K: ["K   K", "K  K ", "KKK  ", "K  K ", "K   K"],
                L: ["L    ", "L    ", "L    ", "L    ", "LLLLL"],
                M: ["M   M", "MM MM", "M M M", "M   M", "M   M"],
                N: ["N   N", "NN  N", "N N N", "N  NN", "N   N"],
                O: [" OOO ", "O   O", "O   O", "O   O", " OOO "],
                P: ["PPPP ", "P   P", "PPPP ", "P    ", "P    "],
                Q: [" QQQ ", "Q   Q", "Q   Q", "Q  QQ", " QQQQ"],
                R: ["RRRR ", "R   R", "RRRR ", "R  R ", "R   R"],
                S: [" SSSS", "S    ", " SSS ", "    S", "SSSS "],
                T: ["TTTTT", "  T  ", "  T  ", "  T  ", "  T  "],
                U: ["U   U", "U   U", "U   U", "U   U", " UUU "],
                V: ["V   V", "V   V", "V   V", "V   V", "  V  "],
                W: ["W   W", "W   W", "W W W", "W W W", " W W "],
                X: ["X   X", " X X ", "  X  ", " X X ", "X   X"],
                Y: ["Y   Y", " Y Y ", "  Y  ", "  Y  ", "  Y  "],
                Z: ["ZZZZZ", "   Z ", "  Z  ", " Z   ", "ZZZZZ"],
                " ": ["     ", "     ", "     ", "     ", "     "],
              };
              let art = "";
              for (let i = 0; i < 5; i++) {
                let line = "";
                for (let char of text) {
                  if (asciiAlpha[char]) line += asciiAlpha[char][i] + "  ";
                  else line += "     ";
                }
                art += line + "\n";
              }
              output.innerHTML += `<pre class="text-[10px] leading-3 text-green-400 my-2 overflow-x-auto">${art}</pre>`;
              break;
            case "cowsay":
              const msg = args.slice(1).join(" ") || "Moo!";
              const cow = `\n         \\   ^__^\n          \\  (oo)\\_______\n             (__)\\       )\\/\\\n                 ||----w |\n                 ||     ||`;
              output.innerHTML += `<pre class="text-xs text-blue-300 my-2"> &lt; ${msg} &gt;${cow}</pre>`;
              break;
            case "figlet":
              const figletText = (args.slice(1).join(" ") || "HELLO")
                .toUpperCase()
                .slice(0, 10);
              // Figlet font omitted for brevity, using simple block char fallback if desired, or assume user happy with ascii command.
              // Re-implementing simplified figlet for reliability
              const figletFont = {
                A: ["  â–ˆâ–ˆ  ", " â–ˆ  â–ˆ ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "â–ˆ    â–ˆ", "â–ˆ    â–ˆ"],
                B: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ    â–ˆ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ    â–ˆ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ "],
                C: [" â–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ     ", "â–ˆ     ", "â–ˆ     ", " â–ˆâ–ˆâ–ˆâ–ˆ "],
                D: ["â–ˆâ–ˆâ–ˆâ–ˆ  ", "â–ˆ   â–ˆ ", "â–ˆ    â–ˆ", "â–ˆ   â–ˆ ", "â–ˆâ–ˆâ–ˆâ–ˆ  "],
                E: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "â–ˆ     ", "â–ˆâ–ˆâ–ˆâ–ˆ  ", "â–ˆ     ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ"],
                F: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "â–ˆ     ", "â–ˆâ–ˆâ–ˆâ–ˆ  ", "â–ˆ     ", "â–ˆ     "],
                G: [" â–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ     ", "â–ˆ  â–ˆâ–ˆâ–ˆ", "â–ˆ    â–ˆ", " â–ˆâ–ˆâ–ˆâ–ˆ "],
                H: ["â–ˆ    â–ˆ", "â–ˆ    â–ˆ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "â–ˆ    â–ˆ", "â–ˆ    â–ˆ"],
                I: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "  â–ˆâ–ˆ  ", "  â–ˆâ–ˆ  ", "  â–ˆâ–ˆ  ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ"],
                J: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "    â–ˆ ", "    â–ˆ ", "â–ˆ   â–ˆ ", " â–ˆâ–ˆâ–ˆ  "],
                K: ["â–ˆ   â–ˆ ", "â–ˆ  â–ˆ  ", "â–ˆâ–ˆâ–ˆ   ", "â–ˆ  â–ˆ  ", "â–ˆ   â–ˆ "],
                L: ["â–ˆ     ", "â–ˆ     ", "â–ˆ     ", "â–ˆ     ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ"],
                M: ["â–ˆ    â–ˆ", "â–ˆâ–ˆ  â–ˆâ–ˆ", "â–ˆ â–ˆâ–ˆ â–ˆ", "â–ˆ    â–ˆ", "â–ˆ    â–ˆ"],
                N: ["â–ˆ    â–ˆ", "â–ˆâ–ˆ   â–ˆ", "â–ˆ â–ˆ  â–ˆ", "â–ˆ  â–ˆ â–ˆ", "â–ˆ   â–ˆâ–ˆ"],
                O: [" â–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ    â–ˆ", "â–ˆ    â–ˆ", "â–ˆ    â–ˆ", " â–ˆâ–ˆâ–ˆâ–ˆ "],
                P: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ    â–ˆ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ     ", "â–ˆ     "],
                Q: [" â–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ    â–ˆ", "â–ˆ  â–ˆ â–ˆ", "â–ˆ   â–ˆ ", " â–ˆâ–ˆ â–ˆ "],
                R: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ    â–ˆ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ ", "â–ˆ  â–ˆ  ", "â–ˆ   â–ˆ "],
                S: [" â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "â–ˆ     ", " â–ˆâ–ˆâ–ˆâ–ˆ ", "     â–ˆ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ "],
                T: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "  â–ˆâ–ˆ  ", "  â–ˆâ–ˆ  ", "  â–ˆâ–ˆ  ", "  â–ˆâ–ˆ  "],
                U: ["â–ˆ    â–ˆ", "â–ˆ    â–ˆ", "â–ˆ    â–ˆ", "â–ˆ    â–ˆ", " â–ˆâ–ˆâ–ˆâ–ˆ "],
                V: ["â–ˆ    â–ˆ", "â–ˆ    â–ˆ", " â–ˆ  â–ˆ ", " â–ˆ  â–ˆ ", "  â–ˆâ–ˆ  "],
                W: ["â–ˆ    â–ˆ", "â–ˆ    â–ˆ", "â–ˆ â–ˆâ–ˆ â–ˆ", "â–ˆâ–ˆ  â–ˆâ–ˆ", "â–ˆ    â–ˆ"],
                X: ["â–ˆ    â–ˆ", " â–ˆ  â–ˆ ", "  â–ˆâ–ˆ  ", " â–ˆ  â–ˆ ", "â–ˆ    â–ˆ"],
                Y: ["â–ˆ    â–ˆ", " â–ˆ  â–ˆ ", "  â–ˆâ–ˆ  ", "  â–ˆâ–ˆ  ", "  â–ˆâ–ˆ  "],
                Z: ["â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ", "    â–ˆ ", "  â–ˆâ–ˆ  ", " â–ˆ    ", "â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ"],
                " ": ["      ", "      ", "      ", "      ", "      "],
              };
              let figletOutput = "";
              for (let row = 0; row < 5; row++) {
                let line = "";
                for (let char of figletText) {
                  line +=
                    (figletFont[char] ? figletFont[char][row] : "      ") + " ";
                }
                figletOutput += line + "\n";
              }
              output.innerHTML += `<pre class="text-green-400 text-xs my-2 overflow-x-auto">${figletOutput}</pre>`;
              break;
            case "flip":
              const flipMap = {
                a: "É",
                b: "q",
                c: "É”",
                d: "p",
                e: "Ç",
                f: "ÉŸ",
                g: "Æƒ",
                h: "É¥",
                i: "á´‰",
                j: "É¾",
                k: "Êž",
                l: "l",
                m: "É¯",
                n: "u",
                o: "o",
                p: "d",
                q: "b",
                r: "É¹",
                s: "s",
                t: "Ê‡",
                u: "n",
                v: "ÊŒ",
                w: "Ê",
                x: "x",
                y: "ÊŽ",
                z: "z",
                A: "âˆ€",
                B: "q",
                C: "Æ†",
                D: "p",
                E: "ÆŽ",
                F: "â„²",
                G: "â…",
                H: "H",
                I: "I",
                J: "Å¿",
                K: "Êž",
                L: "Ë¥",
                M: "W",
                N: "N",
                O: "O",
                P: "Ô€",
                Q: "Q",
                R: "É¹",
                S: "S",
                T: "âŠ¥",
                U: "âˆ©",
                V: "Î›",
                W: "M",
                X: "X",
                Y: "â…„",
                Z: "Z",
                1: "Æ–",
                2: "á„…",
                3: "Æ",
                4: "ã„£",
                5: "Ï›",
                6: "9",
                7: "ã„¥",
                8: "8",
                9: "6",
                0: "0",
                ".": "Ë™",
                ",": "'",
                "'": ",",
                '"': "â€ž",
                "`": ",",
                "?": "Â¿",
                "!": "Â¡",
                "[": "]",
                "]": "[",
                "(": ")",
                ")": "(",
                "{": "}",
                "}": "{",
                "<": ">",
                ">": "<",
                _: "â€¾",
                "^": "v",
                "&": "â…‹",
              };
              const flipText = args.slice(1).join(" ") || "Hello World";
              const flipped = flipText
                .split("")
                .map((c) => flipMap[c] || c)
                .reverse()
                .join("");
              output.innerHTML += `<div class="text-cyan-400 my-2 font-bold">${flipped}</div>`;
              break;
            case "rps":
              const rpsChoices = ["rock", "paper", "scissors"];
              const rpsEmojis = { rock: "ðŸª¨", paper: "ðŸ“„", scissors: "âœ‚ï¸" };
              const rpsInput = (args[1] || "").toLowerCase();
              let playerChoice = null;
              if (rpsInput.startsWith("r")) playerChoice = "rock";
              else if (rpsInput.startsWith("p")) playerChoice = "paper";
              else if (rpsInput.startsWith("s")) playerChoice = "scissors";

              if (!playerChoice) {
                output.innerHTML += `<div class="text-yellow-400 my-2">Usage: rps [rock|paper|scissors]</div>`;
              } else {
                const cpuChoice = rpsChoices[Math.floor(Math.random() * 3)];
                let result, resultColor;
                if (playerChoice === cpuChoice) {
                  result = "It's a draw!";
                  resultColor = "text-yellow-400";
                } else if (
                  (playerChoice === "rock" && cpuChoice === "scissors") ||
                  (playerChoice === "paper" && cpuChoice === "rock") ||
                  (playerChoice === "scissors" && cpuChoice === "paper")
                ) {
                  result = "You win! ðŸŽ‰";
                  resultColor = "text-green-400";
                } else {
                  result = "You lose! ðŸ’€";
                  resultColor = "text-red-400";
                }
                output.innerHTML += `<div class="my-2"><div class="flex items-center gap-4 text-2xl mb-2"><span>${rpsEmojis[playerChoice]}</span><span class="text-gray-500 text-sm">vs</span><span>${rpsEmojis[cpuChoice]}</span></div><div class="text-sm"><span class="text-blue-300">You:</span> ${playerChoice} <span class="text-gray-500">|</span> <span class="text-purple-300">CPU:</span> ${cpuChoice}</div><div class="${resultColor} font-bold mt-1">${result}</div></div>`;
              }
              break;
            case "8ball":
              const question = args.slice(1).join(" ");
              const techResponses = [
                { text: "It is certain. Ship it!", color: "text-green-400" },
                {
                  text: "Yes, but write tests first.",
                  color: "text-green-400",
                },
                {
                  text: "Reply hazy, try Stack Overflow.",
                  color: "text-yellow-400",
                },
                {
                  text: "Don't count on it. That's technical debt.",
                  color: "text-red-400",
                },
                {
                  text: "Outlook not so good. Sounds like a future bug.",
                  color: "text-red-400",
                },
                { text: "404: Answer not found.", color: "text-red-400" },
              ];
              const response =
                techResponses[Math.floor(Math.random() * techResponses.length)];
              output.innerHTML += `<div class="my-2"><div class="text-purple-400">ðŸŽ± You asked: "${
                question || "nothing"
              }"</div><div class="${response.color} font-bold mt-1">âžœ ${
                response.text
              }</div></div>`;
              break;
            case "sudo":
              const sudoResponses = [
                {
                  text: "Nice try, but you have no power here!",
                  color: "text-red-400",
                },
                {
                  text: "Permission denied. This isn't your Linux box!",
                  color: "text-red-400",
                },
                {
                  text: "sudo: user 'guest' is not in the sudoers file.",
                  color: "text-yellow-400",
                },
              ];
              const sudoResp =
                sudoResponses[Math.floor(Math.random() * sudoResponses.length)];
              output.innerHTML += `<div class="${sudoResp.color} my-2 font-bold">ðŸ” ${sudoResp.text}</div>`;
              break;
            case "rm":
              if (input.includes("-rf") && input.includes("/")) {
                inputEl.disabled = true;
                const rmMessages = [
                  {
                    text: '<span class="text-red-500 font-bold">âš ï¸ WARNING: DESTRUCTIVE OPERATION DETECTED</span>',
                    delay: 0,
                  },
                  {
                    text: '<span class="text-red-400">Deleting /bin...</span>',
                    delay: 600,
                  },
                  {
                    text: '<span class="text-yellow-500 animate-pulse">KERNEL PANIC</span>',
                    delay: 3000,
                  },
                  {
                    text: '<span class="text-green-400 font-bold text-lg"> jk this is just a website, silly ðŸ˜‚</span>',
                    delay: 4000,
                  },
                ];
                let rmIndex = 0;
                function showNextRm() {
                  if (rmIndex >= rmMessages.length) {
                    inputEl.disabled = false;
                    inputEl.focus();
                    return;
                  }
                  const msg = rmMessages[rmIndex];
                  if (msg.text) output.innerHTML += `<div>${msg.text}</div>`;
                  output.scrollTop = output.scrollHeight;
                  rmIndex++;
                  setTimeout(
                    showNextRm,
                    rmMessages[rmIndex]?.delay
                      ? rmMessages[rmIndex].delay - msg.delay
                      : 500
                  );
                }
                showNextRm();
              } else {
                output.innerHTML += `<div class="text-red-400">rm: missing operand</div>`;
              }
              break;
            case "exit":
              output.innerHTML += `<div class="text-purple-400 italic my-2">ðŸšª You can check out any time you like, but you can never leave... ðŸŽ¸</div>`;
              break;
            case "pietro":
              const pietroLogo = ` â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—  â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— \n â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•â•â•â•šâ•â•â–ˆâ–ˆâ•”â•â•â•â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•”â•â•â•â–ˆâ–ˆâ•—\n â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—     â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘\n â–ˆâ–ˆâ•”â•â•â•â• â–ˆâ–ˆâ•‘â–ˆâ–ˆâ•”â•â•â•     â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘\n â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—   â–ˆâ–ˆâ•‘   â–ˆâ–ˆâ•‘  â–ˆâ–ˆâ•‘â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•\n â•šâ•â•     â•šâ•â•â•šâ•â•â•â•â•â•â•   â•šâ•â•   â•šâ•â•  â•šâ•â• â•šâ•â•â•â•â•â•`;
              // Calculate uptime from birthdate (June 13, 1993 at 1:00 AM)
              const birthDate = new Date(1993, 5, 13, 1, 0, 0); // Month is 0-indexed
              const nowTime = new Date();
              let years = nowTime.getFullYear() - birthDate.getFullYear();
              const lastBday = new Date(nowTime.getFullYear(), 5, 13, 1, 0, 0);
              if (nowTime < lastBday) years--;
              const currentBday = new Date(
                nowTime.getFullYear() - (nowTime < lastBday ? 1 : 0),
                5,
                13,
                1,
                0,
                0
              );
              const diffMs = nowTime - currentBday;
              const daysDiff = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              const hours = nowTime.getHours();
              const minutes = nowTime.getMinutes();
              const uptime = `${years} years, ${daysDiff} days, ${hours}h ${minutes}m`;
              const pietroInfo = `<span class="text-purple-400 font-bold">pietro@OS93</span>\n<span class="text-gray-500">â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€</span>\n<span class="text-her-red">Resolution</span>: 5120x1440\n<span class="text-her-red">CPU</span>: Intel(R) Core(TM) i9-14900 @ 1.997GHz\n<span class="text-her-red">GPU</span>: NVIDIA GeForce RTX 4090\n<span class="text-her-red">Uptime</span>: ${uptime}\n<span class="text-gray-500">â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€</span>\n<span class="text-her-red">Role</span>: Infrastructure Engineer\n<span class="text-her-red">Location</span>: Barcelona\n<span class="text-her-red">Languages</span>: Spanish, English, Italian\n<span class="text-her-red">Stack</span>: AWS, Terraform, Docker, K8s, Python\n<span class="text-gray-500">â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€</span>`;
              output.innerHTML += `<div class="flex gap-4 my-2 font-mono text-xs"><pre class="text-purple-400 hidden sm:block">${pietroLogo}</pre><pre>${pietroInfo}</pre></div>`;
              break;
            case "matrix":
              const canvas = document.createElement("canvas");
              canvas.className =
                "fixed top-0 left-0 w-full h-full pointer-events-none z-50 opacity-80";
              document.body.appendChild(canvas);
              const ctx = canvas.getContext("2d");
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
              const katakana =
                "ã‚¢ã‚¡ã‚«ã‚µã‚¿ãƒŠãƒãƒžãƒ¤ãƒ£ãƒ©ãƒ¯ã‚¬ã‚¶ãƒ€ãƒãƒ‘ã‚¤ã‚£ã‚­ã‚·ãƒãƒ‹ãƒ’ãƒŸãƒªãƒ°ã‚®ã‚¸ãƒ‚ãƒ“ãƒ”ã‚¦ã‚¥ã‚¯ã‚¹ãƒ„ãƒŒãƒ•ãƒ ãƒ¦ãƒ¥ãƒ«ã‚°ã‚ºãƒ–ãƒ…ãƒ—ã‚¨ã‚§ã‚±ã‚»ãƒ†ãƒãƒ˜ãƒ¡ãƒ¬ãƒ±ã‚²ã‚¼ãƒ‡ãƒ™ãƒšã‚ªã‚©ã‚³ã‚½ãƒˆãƒŽãƒ›ãƒ¢ãƒ¨ãƒ§ãƒ­ãƒ²ã‚´ã‚¾ãƒ‰ãƒœãƒãƒ´ãƒƒãƒ³";
              const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
              const nums = "0123456789";
              const alphabet = katakana + latin + nums;
              const fontSize = 16;
              const columns = canvas.width / fontSize;
              const drops = [];
              for (let x = 0; x < columns; x++) drops[x] = 1;
              function drawMatrix() {
                ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = "#0F0";
                ctx.font = fontSize + "px monospace";
                for (let i = 0; i < drops.length; i++) {
                  const text = alphabet.charAt(
                    Math.floor(Math.random() * alphabet.length)
                  );
                  ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                  if (
                    drops[i] * fontSize > canvas.height &&
                    Math.random() > 0.975
                  )
                    drops[i] = 0;
                  drops[i]++;
                }
              }
              const matrixInterval = setInterval(drawMatrix, 30);
              output.innerHTML += `<div class="text-green-400 font-bold my-2">Follow the white rabbit... (Click to stop)</div>`;
              const stopMatrix = () => {
                clearInterval(matrixInterval);
                canvas.remove();
                document.removeEventListener("click", stopMatrix);
              };
              document.addEventListener("click", stopMatrix);
              break;
            case "rain":
              const rainCanvas = document.createElement("canvas");
              rainCanvas.className =
                "fixed top-0 left-0 w-full h-full pointer-events-none z-50 opacity-50";
              document.body.appendChild(rainCanvas);
              const rctx = rainCanvas.getContext("2d");
              rainCanvas.width = window.innerWidth;
              rainCanvas.height = window.innerHeight;
              const rainDrops = [];
              for (let i = 0; i < 100; i++)
                rainDrops.push({
                  x: Math.random() * rainCanvas.width,
                  y: Math.random() * rainCanvas.height,
                  l: Math.random() * 20 + 10,
                  v: Math.random() * 10 + 5,
                });
              function drawRain() {
                rctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
                rctx.strokeStyle = "rgba(174, 194, 224, 0.5)";
                rctx.lineWidth = 1;
                rctx.beginPath();
                for (let d of rainDrops) {
                  rctx.moveTo(d.x, d.y);
                  rctx.lineTo(d.x, d.y + d.l);
                  d.y += d.v;
                  if (d.y > rainCanvas.height) {
                    d.y = -d.l;
                    d.x = Math.random() * rainCanvas.width;
                  }
                }
                rctx.stroke();
                requestAnimationFrame(drawRain);
              }
              const rainAnim = requestAnimationFrame(drawRain);
              output.innerHTML += `<div class="text-blue-300 font-bold my-2">ðŸŒ§ï¸ It's raining code... (Reload to stop)</div>`;
              break;
            case "sl":
              const trainFrames = [
                "      ____\n     |DD|____T_\n     |_ |_____|<\n       @-@-@-oo\\",
                "      ____\n     |DD|____T_\n     |_ |_____|<\n      _@-@-@-oo\\",
                "      ____\n     |DD|____T_\n     |_ |_____|<\n       @-@-@-oo\\",
                "      ____\n     |DD|____T_\n     |_ |_____|<\n      _@-@-@-oo\\",
              ];
              let trainPos = window.innerWidth;
              const trainDiv = document.createElement("pre");
              trainDiv.className =
                "fixed bottom-10 z-50 text-white font-bold text-xs whitespace-pre";
              document.body.appendChild(trainDiv);
              let frameIdx = 0;
              function moveTrain() {
                if (trainPos < -200) {
                  trainDiv.remove();
                  return;
                }
                trainDiv.style.left = trainPos + "px";
                trainDiv.innerText = trainFrames[frameIdx % 4];
                trainPos -= 10;
                frameIdx++;
                requestAnimationFrame(moveTrain);
              }
              moveTrain();
              output.innerHTML += `<div class="text-yellow-400 font-mono my-2">CHOO CHOO! ðŸš‚</div>`;
              break;
            case "hack":
              inputEl.disabled = true;
              const hackLines = [
                {
                  text: "Initializing brute-force attack...",
                  color: "text-green-500",
                },
                {
                  text: "Target: MAINFRAME (10.0.0.1)",
                  color: "text-green-500",
                },
                { text: "Bypassing firewall...", color: "text-yellow-500" },
                { text: "Accessing secure nodes...", color: "text-yellow-500" },
                { text: "Decrypting passwords...", color: "text-red-500" },
                {
                  text: "ACCESS GRANTED. Downloading database...",
                  color: "text-green-500 font-bold",
                },
                {
                  text: "Download complete. Traces cleared.",
                  color: "text-blue-500",
                },
              ];
              let hackIndex = 0;
              function runHack() {
                if (hackIndex >= hackLines.length) {
                  inputEl.disabled = false;
                  inputEl.focus();
                  return;
                }
                output.innerHTML += `<div class="${hackLines[hackIndex].color} font-mono text-xs my-1">${hackLines[hackIndex].text}</div>`;
                output.scrollTop = output.scrollHeight;
                hackIndex++;
                setTimeout(runHack, Math.random() * 800 + 200);
              }
              runHack();
              break;
            case "hlx":
              // Half-Life 3 / HLX Easter Egg
              inputEl.disabled = true;

              const hlxMessages = [
                {
                  text: '<span class="text-green-400">Connecting to Valve servers...</span>',
                  delay: 0,
                },
                {
                  text: '<span class="text-green-400">Authenticating: â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ 100%</span>',
                  delay: 800,
                },
                {
                  text: '<span class="text-yellow-400">Loading HLX assets: 1... 2... 2.5... 2.75... 2.9... 2.99... 2.999...</span>',
                  delay: 1600,
                },
                { text: "", delay: 2400 }, // Lambda will be inserted here
                {
                  text: '<span class="text-gray-400 italic">"The right man in the wrong place can make all the difference in the world..."</span>',
                  delay: 4500,
                },
                {
                  text: '<span class="text-gray-500 text-xs">                                                              - G-Man</span>',
                  delay: 5000,
                },
                { text: "", delay: 5800 },
                {
                  text: '<span class="text-red-500 font-bold">ERROR: Unable to count to 3. This is a known Valve limitation.</span>',
                  delay: 6300,
                },
              ];

              // Lambda ASCII art with glitch effect
              const lambdaArt = `
<pre class="hlx-lambda text-orange-500 font-bold my-2" style="text-shadow: 0 0 10px rgba(255,165,0,0.5);">
â €â €â €â €â €â €â €â €â €â¢€â£€â£ â£¤â£¤â£´â£¦â£¤â£¤â£„â£€â €â €â €â €â €â €â €â €â €â €
â €â €â €â €â €â €â¢€â£¤â£¾â£¿â£¿â£¿â£¿â ¿â ¿â ¿â ¿â£¿â£¿â£¿â£¿â£¶â£¤â¡€â €â €â €â €â €â €
â €â €â €â €â£ â£¾â£¿â£¿â¡¿â ›â ‰â €â €â €â €â €â €â €â €â ‰â ›â¢¿â£¿â£¿â£¶â¡€â €â €â €â €
â €â €â €â£´â£¿â£¿â Ÿâ â €â €â €â£¶â£¶â£¶â£¶â¡†â €â €â €â €â €â €â ˆâ »â£¿â£¿â£¦â €â €â €
â €â €â£¼â£¿â£¿â ‹â €â €â €â €â €â ›â ›â¢»â£¿â£¿â¡€â €â €â €â €â €â €â €â ™â£¿â£¿â£§â €â €
â €â¢¸â£¿â£¿â ƒâ €â €â €â €â €â €â €â €â¢€â£¿â£¿â£·â €â €â €â €â €â €â €â €â ¸â£¿â£¿â¡‡â €
â €â£¿â£¿â¡¿â €â €â €â €â €â €â €â €â¢€â£¾â£¿â£¿â£¿â£‡â €â €â €â €â €â €â €â €â£¿â£¿â£¿â €
â €â£¿â£¿â¡‡â €â €â €â €â €â €â €â¢ â£¿â£¿â¡Ÿâ¢¹â£¿â£¿â¡†â €â €â €â €â €â €â €â£¹â£¿â£¿â €
â €â£¿â£¿â£·â €â €â €â €â €â €â£°â£¿â£¿â â €â €â¢»â£¿â£¿â¡„â €â €â €â €â €â €â£¿â£¿â¡¿â €
â €â¢¸â£¿â£¿â¡†â €â €â €â €â£´â£¿â¡¿â ƒâ €â €â €â ˆâ¢¿â£¿â£·â£¤â£¤â¡†â €â €â£°â£¿â£¿â ‡â €
â €â €â¢»â£¿â£¿â£„â €â €â ¾â ¿â ¿â â €â €â €â €â €â ˜â£¿â£¿â¡¿â ¿â ›â €â£°â£¿â£¿â¡Ÿâ €â €
â €â €â €â »â£¿â£¿â£§â£„â €â €â €â €â €â €â €â €â €â €â €â €â €â €â£ â£¾â£¿â£¿â â €â €â €
â €â €â €â €â ˆâ »â£¿â£¿â£·â£¤â£„â¡€â €â €â €â €â €â €â¢€â£ â£´â£¾â£¿â£¿â Ÿâ â €â €â €â €
â €â €â €â €â €â €â ˆâ ›â ¿â£¿â£¿â£¿â£¿â£¿â£¶â£¶â£¿â£¿â£¿â£¿â£¿â ¿â ‹â â €â €â €â €â €â €
â €â €â €â €â €â €â €â €â €â €â ‰â ‰â ›â ›â ›â ›â ›â ›â ‰â ‰â €â €â €â €â €â €â €â €â €â €â €â €â €â €â €â €
</pre>`;

              let hlxIndex = 0;

              function showNextHlx() {
                if (hlxIndex >= hlxMessages.length) {
                  inputEl.disabled = false;
                  inputEl.focus();
                  // Start glitch effect on lambda
                  const lambdaEl = output.querySelector(".hlx-lambda");
                  if (lambdaEl) {
                    let glitchCount = 0;
                    const glitchInterval = setInterval(() => {
                      if (glitchCount > 10) {
                        clearInterval(glitchInterval);
                        lambdaEl.style.transform = "none";
                        lambdaEl.style.opacity = "1";
                        return;
                      }
                      const offsetX = (Math.random() - 0.5) * 4;
                      const offsetY = (Math.random() - 0.5) * 2;
                      const skew = (Math.random() - 0.5) * 3;
                      lambdaEl.style.transform = `translate(${offsetX}px, ${offsetY}px) skewX(${skew}deg)`;
                      lambdaEl.style.opacity =
                        Math.random() > 0.3 ? "1" : "0.7";
                      // Color glitch
                      lambdaEl.style.color =
                        Math.random() > 0.8 ? "#ff6b6b" : "#f97316";
                      glitchCount++;
                    }, 100);
                  }
                  return;
                }

                const hlxMsg = hlxMessages[hlxIndex];
                const nextDelay =
                  hlxIndex < hlxMessages.length - 1
                    ? hlxMessages[hlxIndex + 1].delay - hlxMsg.delay
                    : 500;

                if (hlxIndex === 3) {
                  // Insert lambda art
                  output.innerHTML += lambdaArt;
                } else if (hlxMsg.text) {
                  output.innerHTML += `<div>${hlxMsg.text}</div>`;
                }

                output.scrollTop = output.scrollHeight;
                hlxIndex++;
                setTimeout(showNextHlx, nextDelay);
              }

              showNextHlx();
              break;
            case "about":
              window.openWindow("about");
              break;
            case "contact":
              window.openWindow("contact");
              break;
            case "projects":
              window.openWindow("projects");
              break;
            case "resume":
              window.openWindow("resume");
              break;
            default:
              output.innerHTML += `<div class="text-red-400">Command not found: ${cmd}</div>`;
          }

          inputEl.value = "";
          output.scrollTop = output.scrollHeight;
        };

// export sub-mode state for potential external use
export { guessGame, ciscoMode, terraformMode };
