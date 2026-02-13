// windows/manager.ts - handles all window operations
// dragging, resizing, minimize/maximize, z-index stuff

import { activeWindows, incrementZIndex, setMonitorInterval, monitorInterval } from '../state';
import { playWindowClose } from '../audio';

// drag state - keep these local since they're only used here
let isDragging = false;
let dragOffset = { x: 0, y: 0 };
let dragId: string | null = null;

// drag velocity tracking for momentum
let dragVelocity = { x: 0, y: 0 };
let lastDragPos = { x: 0, y: 0 };
let lastDragTime = 0;

// resize state
let resizeDir: string | null = null;
let isResizing = false;
let resizeWin: HTMLElement | null = null;
let startResizeRect: { left: number; top: number; width: number; height: number } | null = null;
let startResizePos: { x: number; y: number } | null = null;

// bring a window to front and mark it as active
export function bringToFront(id: string): void {
  if (activeWindows[id]) {
    activeWindows[id].element.style.zIndex = String(incrementZIndex());
    // update styling for all windows - active gets enhanced shadow
    document.querySelectorAll('.window').forEach(w => {
      w.classList.remove('active-window');
    });
    activeWindows[id].element.classList.add('active-window');
  }
}

// close window with animation
export function closeWindow(id: string): void {
  const win = document.getElementById(`win-${id}`);
  if (!win) return;

  // play close sound
  playWindowClose();

  // add closing animation
  win.classList.add('window-closing');

  // remove after animation completes
  setTimeout(() => {
    if (win) win.remove();
    delete activeWindows[id];
  }, 250);

  // update dock state
  const dockItem = document.getElementById(`dock-${id}`);
  if (dockItem) dockItem.classList.remove('active');
  // Call onClose callback from window config if defined
  if (activeWindows[id]?.config?.onClose) {
    activeWindows[id].config.onClose();
  }

  // cleanup monitor interval if we're closing that window
  if (id === 'monitor' && monitorInterval) {
    clearInterval(monitorInterval);
    setMonitorInterval(null);
  }
}

// minimize window with fancy scale animation towards dock
export function minimizeWindow(id: string): void {
  const winObj = activeWindows[id];
  if (!winObj) return;

  const el = winObj.element;
  const dockItem = document.getElementById(`dock-${id}`);

  // calculate transform origin for scale effect towards dock
  let originX = '50%';
  let originY = '100%';

  if (dockItem) {
    const dockRect = dockItem.getBoundingClientRect();
    const winRect = el.getBoundingClientRect();

    // destination is center of dock icon
    const destX = dockRect.left + dockRect.width / 2;
    const destY = dockRect.top + dockRect.height / 2;

    // origin relative to window top-left
    const relX = destX - winRect.left;
    const relY = destY - winRect.top;

    originX = `${relX}px`;
    originY = `${relY}px`;
  } else {
    // fallback to center bottom if theres no dock item
    const winRect = el.getBoundingClientRect();
    const destX = window.innerWidth / 2;
    const destY = window.innerHeight;
    originX = `${destX - winRect.left}px`;
    originY = `${destY - winRect.top}px`;
  }

  // smooth transition
  el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease';
  el.style.transformOrigin = `${originX} ${originY}`;

  // trigger reflow - magic line that makes it work
  el.offsetHeight;

  el.classList.add('minimized');
  el.classList.remove('active-window');
}

// restore window from minimized state
export function restoreWindow(id: string, openWindowFn: (id: string) => void): void {
  if (!activeWindows[id]) {
    // window doesnt exist yet, open it
    openWindowFn(id);
    return;
  }

  const winObj = activeWindows[id];
  const el = winObj.element;

  // restore transition
  el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease';

  el.classList.remove('minimized');
  bringToFront(id);

  // cleanup inline styles after animation finishes
  setTimeout(() => {
    if (!el.classList.contains('minimized')) {
      el.style.transition = '';
      el.style.transformOrigin = '';
    }
  }, 450);
}

// toggle maximize/restore window
export function toggleMaximize(id: string): void {
  const winObj = activeWindows[id];
  if (!winObj) return;

  const el = winObj.element;

  if (!winObj.maximized) {
    // save current state before maximizing
    winObj.prevRect = {
      left: el.style.left,
      top: el.style.top,
      width: el.style.width,
      height: el.style.height,
    };

    // maximize - top 0 relative to windows-container
    el.classList.add('maximized');
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.width = '100%';

    const isMobile = window.innerWidth < 768;
    // on mobile maximize full height, on desktop leave room for dock
    el.style.height = isMobile ? 'calc(100vh - 85px)' : 'calc(100% - 90px)';

    winObj.maximized = true;
  } else {
    // restore from maximized
    el.classList.remove('maximized');
    const prev = winObj.prevRect;
    if (prev) {
      el.style.left = prev.left;
      el.style.top = prev.top;
      el.style.width = prev.width;
      el.style.height = prev.height;
    }
    winObj.maximized = false;
  }
}

// start dragging a window
export function startDrag(e: MouseEvent | TouchEvent, id: string): void {
  if (activeWindows[id].maximized) return; // cant drag maximized windows

  const win = activeWindows[id].element;
  const rect = win.getBoundingClientRect();

  // normalize touch/mouse events
  const clientX = e.type.includes('touch') ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = e.type.includes('touch') ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

  // resize zone check - prevent drag if clicking near top edge for resize
  if (!e.type.includes('touch') && clientY - rect.top < 10) return;

  isDragging = true;
  dragId = id;
  dragOffset.x = clientX - rect.left;
  dragOffset.y = clientY - rect.top;

  // init velocity tracking
  dragVelocity = { x: 0, y: 0 };
  lastDragPos = { x: clientX, y: clientY };
  lastDragTime = performance.now();

  win.classList.add('dragging');
  bringToFront(id);
  if (e.stopPropagation) e.stopPropagation();
}

// handle drag movement, rAF state for smooth animation
let rafId: number | null = null;
let pendingMove: { clientX: number; clientY: number } | null = null;
let pendingResize: { clientX: number; clientY: number } | null = null;

// throttle for cursor updates
let cursorThrottleId: number | null = null;

// handle drag movement with rAF batching
function handleMove(e: MouseEvent | TouchEvent): void {
  if (!isDragging || !dragId) return;
  e.preventDefault();

  const clientX = e.type.includes('touch') ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
  const clientY = e.type.includes('touch') ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;

  // track velocity
  const now = performance.now();
  const dt = now - lastDragTime;
  if (dt > 0) {
    dragVelocity.x = (clientX - lastDragPos.x) / dt;
    dragVelocity.y = (clientY - lastDragPos.y) / dt;
  }
  lastDragPos = { x: clientX, y: clientY };
  lastDragTime = now;

  pendingMove = { clientX, clientY };

  if (rafId) return; // skip if rAF already scheduled

  rafId = requestAnimationFrame(() => {
    if (pendingMove && dragId && activeWindows[dragId]) {
      const win = activeWindows[dragId].element;
      const container = win.offsetParent || document.body;
      const containerRect = container.getBoundingClientRect();

      let newX = pendingMove.clientX - dragOffset.x - containerRect.left;
      let newY = pendingMove.clientY - dragOffset.y - containerRect.top;

      // keep header accessible - dont let it go above 0
      if (newY < 0) newY = 0;

      win.style.left = `${newX}px`;
      win.style.top = `${newY}px`;
    }
    rafId = null;
    pendingMove = null;
  });
}

// handle resize with rAF batching
function handleResize(e: MouseEvent): void {
  if (!isResizing || !resizeWin || !startResizeRect || !startResizePos) return;

  pendingResize = { clientX: e.clientX, clientY: e.clientY };

  if (rafId) return; // reuse same rAF guard

  rafId = requestAnimationFrame(() => {
    if (pendingResize && resizeWin && startResizeRect && startResizePos && resizeDir) {
      const dx = pendingResize.clientX - startResizePos.x;
      const dy = pendingResize.clientY - startResizePos.y;
      const rect = startResizeRect;

      const minW = 400;
      const minH = 200;

      if (resizeDir.includes('e')) {
        resizeWin.style.width = `${Math.max(minW, rect.width + dx)}px`;
      }
      if (resizeDir.includes('s')) {
        resizeWin.style.height = `${Math.max(minH, rect.height + dy)}px`;
      }
      if (resizeDir.includes('w')) {
        const newW = Math.max(minW, rect.width - dx);
        resizeWin.style.width = `${newW}px`;
        resizeWin.style.left = `${rect.left + (rect.width - newW)}px`;
      }
      if (resizeDir.includes('n')) {
        const newH = Math.max(minH, rect.height - dy);
        resizeWin.style.height = `${newH}px`;
        resizeWin.style.top = `${rect.top + (rect.height - newH)}px`;
      }
    }
    rafId = null;
    pendingResize = null;
  });
}

// apply momentum after drag release
function applyMomentum(win: HTMLElement): void {
  // Only apply if there's meaningful velocity
  const speed = Math.sqrt(dragVelocity.x ** 2 + dragVelocity.y ** 2);
  if (speed < 0.2) return;

  // Check reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const container = win.offsetParent || document.body;
  const containerRect = container.getBoundingClientRect();

  // Scale velocity to px displacement (capped)
  const momentumX = Math.max(-80, Math.min(80, dragVelocity.x * 120));
  const momentumY = Math.max(-80, Math.min(80, dragVelocity.y * 120));

  const currentLeft = win.offsetLeft;
  const currentTop = win.offsetTop;

  let targetX = currentLeft + momentumX;
  let targetY = currentTop + momentumY;

  // Boundary clamping
  const maxX = containerRect.width - 100;
  const maxY = containerRect.height - 100;
  targetX = Math.max(-win.offsetWidth + 100, Math.min(maxX, targetX));
  targetY = Math.max(0, Math.min(maxY, targetY));

  // Apply with spring-like transition
  win.style.transition = 'left 0.5s cubic-bezier(0.16, 1, 0.3, 1), top 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
  win.style.left = `${targetX}px`;
  win.style.top = `${targetY}px`;

  // Cleanup transition after animation
  setTimeout(() => {
    win.style.transition = '';
  }, 500);
}

// end drag operation
function handleEnd(): void {
  if (isDragging && dragId && activeWindows[dragId]) {
    const win = activeWindows[dragId].element;
    win.classList.remove('dragging');

    // Apply momentum effect
    applyMomentum(win);
  }
  isDragging = false;
  dragId = null;
  dragVelocity = { x: 0, y: 0 };

  // cancel any pending rAF
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  pendingMove = null;
  pendingResize = null;
}

// add touch listeners to window for mobile dragging
export function addTouchListeners(winEl: HTMLElement, id: string): void {
  const header = winEl.querySelector('.window-header');
  if (!header) return;

  header.addEventListener('touchstart', (e) => startDrag(e as TouchEvent, id), { passive: false });
  window.addEventListener('touchmove', (e) => handleMove(e as TouchEvent), { passive: false });
  window.addEventListener('touchend', () => handleEnd());
}

// update cursor based on position for resize hints (throttled)
export function updateWindowCursor(e: MouseEvent, win: HTMLElement): void {
  if (isResizing || isDragging) return;
  if (cursorThrottleId) return; // skip if throttled

  cursorThrottleId = window.setTimeout(() => { cursorThrottleId = null; }, 50);

  const rect = win.getBoundingClientRect();
  const border = 10; // detection area
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let cursor = '';
  if (y < border && x < border) cursor = 'nw-resize';
  else if (y < border && x > rect.width - border) cursor = 'ne-resize';
  else if (y > rect.height - border && x < border) cursor = 'sw-resize';
  else if (y > rect.height - border && x > rect.width - border) cursor = 'se-resize';
  else if (y < border) cursor = 'n-resize';
  else if (y > rect.height - border) cursor = 's-resize';
  else if (x < border) cursor = 'w-resize';
  else if (x > rect.width - border) cursor = 'e-resize';

  win.style.cursor = cursor || 'default';
}

// get resize direction based on mouse position
function getResizeDir(e: MouseEvent, win: HTMLElement): string {
  const rect = win.getBoundingClientRect();
  const border = 10;
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  let dir = '';
  if (y < border) dir += 'n';
  if (y > rect.height - border) dir += 's';
  if (x < border) dir += 'w';
  if (x > rect.width - border) dir += 'e';
  return dir;
}

// start resize operation
export function handleResizeStart(e: MouseEvent, win: HTMLElement, id: string): void {
  const dir = getResizeDir(e, win);
  if (!dir) return; // not on edge

  if (activeWindows[id].maximized) return;

  e.preventDefault();
  isResizing = true;
  resizeWin = win;
  resizeDir = dir;
  win.classList.add('resizing');

  startResizeRect = {
    left: win.offsetLeft,
    top: win.offsetTop,
    width: win.offsetWidth,
    height: win.offsetHeight,
  };
  startResizePos = { x: e.clientX, y: e.clientY };
}

// init event listeners for dragging and resizing
// call this once on app load
export function initWindowEventListeners(): void {
  // single consolidated mousemove handler for both drag and resize
  window.addEventListener('mousemove', (e) => {
    if (isDragging) {
      handleMove(e);
    } else if (isResizing) {
      handleResize(e);
    }
  });

  // single mouseup handler for both
  window.addEventListener('mouseup', () => {
    handleEnd();

    if (isResizing && resizeWin) {
      resizeWin.classList.remove('resizing');
    }
    isResizing = false;
    resizeWin = null;
  });
}
