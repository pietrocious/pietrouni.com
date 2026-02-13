// DOOM Game for pietrOS
// Embeds classic DOOM (shareware) via js-dos WebAssembly DOS emulator

declare const Dos: any;

let activeDos: any = null;
let activeContainer: HTMLElement | null = null;

export function initDoom(container: HTMLElement): void {
  if (activeDos) destroyDoom();
  activeContainer = container;

  // Create the js-dos player div
  const playerDiv = document.createElement('div');
  playerDiv.id = 'doom-jsdos';
  playerDiv.style.width = '100%';
  playerDiv.style.height = '100%';
  container.innerHTML = '';
  container.appendChild(playerDiv);

  // Initialize js-dos with DOOM shareware bundle
  try {
    activeDos = Dos(playerDiv, {
      url: '/games/doom.jsdos',
      autoStart: true,
      kiosk: true,
    });
  } catch (err) {
    console.error('[DOOM] Failed to initialize js-dos:', err);
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-white text-center p-8">
        <div class="text-6xl mb-4">💀</div>
        <h2 class="text-xl font-bold mb-2">DOOM could not load</h2>
        <p class="text-sm opacity-70">The js-dos emulator failed to initialize.<br>Check the console for details.</p>
      </div>
    `;
  }
}

export function destroyDoom(): void {
  if (activeDos) {
    try {
      // js-dos v8 uses .stop() to tear down
      if (typeof activeDos.stop === 'function') {
        activeDos.stop();
      }
    } catch (err) {
      console.warn('[DOOM] Error during cleanup:', err);
    }
    activeDos = null;
  }

  // Clean up DOM
  if (activeContainer) {
    activeContainer.innerHTML = '';
    activeContainer = null;
  }

  // Remove any leftover js-dos iframes or canvases
  const leftover = document.getElementById('doom-jsdos');
  if (leftover) leftover.innerHTML = '';
}
