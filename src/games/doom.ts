// DOOM Game for pietrOS
// Uses Cloudflare's doom-wasm (Chocolate Doom WebAssembly port)
// Runs in an iframe for full isolation (Emscripten requires its own global scope)
// Source: https://github.com/cloudflare/doom-wasm

let doomIframe: HTMLIFrameElement | null = null;

export function initDoom(container: HTMLElement): void {
  if (doomIframe) destroyDoom();

  container.innerHTML = '';
  container.style.backgroundColor = '#000';

  // Create iframe pointing to the standalone DOOM page
  const iframe = document.createElement('iframe');
  iframe.src = '/games/doom.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  iframe.allow = 'autoplay';
  iframe.title = 'DOOM';
  container.appendChild(iframe);
  doomIframe = iframe;

  // Focus the iframe for keyboard input
  iframe.addEventListener('load', () => {
    iframe.focus();
  });
}

export function destroyDoom(): void {
  if (doomIframe) {
    // Removing the iframe kills the entire JS runtime cleanly
    if (doomIframe.parentNode) {
      doomIframe.parentNode.removeChild(doomIframe);
    }
    doomIframe = null;
  }
}
