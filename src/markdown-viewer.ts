// Markdown viewer window — fetches a .md file and renders sanitized HTML
import { marked } from "marked";
import DOMPurify from "dompurify";
import { activeWindows, incrementZIndex } from "./state";
import {
  bringToFront, restoreWindow, addTouchListeners,
  updateWindowCursor, handleResizeStart,
} from "./windows/manager";

export async function openMarkdownViewer(filePath: string, title: string): Promise<void> {
  const viewerId = "md-viewer-" + title.replace(/[^a-z0-9]/gi, "");

  if (activeWindows[viewerId]) {
    restoreWindow(viewerId);
    return;
  }

  let htmlContent = "";
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error("File not found");
    const markdown = await response.text();
    htmlContent = DOMPurify.sanitize(marked.parse(markdown) as string);
  } catch (error) {
    const isLocalFile = window.location.protocol === "file:";
    if (isLocalFile) {
      htmlContent = `
        <div class="text-center p-8">
          <div class="text-4xl mb-4">📁</div>
          <h3 class="text-lg font-bold mb-2 text-her-dark dark:text-her-textLight">Local Server Required</h3>
          <p class="text-sm opacity-70 mb-4">Markdown files can't be loaded directly from the file system.<br>Please run a local server or open the hosted site.</p>
          <code class="text-xs bg-black/10 dark:bg-white/10 px-3 py-2 rounded block">npx serve .</code>
        </div>
      `;
    } else {
      const message = error instanceof Error ? error.message : String(error);
      htmlContent = `<div class="text-red-500 p-4">Error loading file: ${message}</div>`;
    }
  }

  const viewerConfig = {
    title,
    content: `
      <div class="h-full overflow-y-auto p-6 md:p-8">
        <article class="markdown-body prose prose-sm dark:prose-invert max-w-none">
          ${htmlContent}
        </article>
      </div>
    `,
    width: 700,
    height: 600,
  };

  const container = document.getElementById("windows-container");
  if (!container) return;
  const containerW = container.clientWidth;
  const containerH = container.clientHeight;
  const isMobile = window.innerWidth < 768;
  const dockBuffer = isMobile ? 68 : 120;
  const maxAvailableHeight = containerH - dockBuffer;

  const finalW = isMobile ? containerW : viewerConfig.width;
  const finalH = isMobile
    ? maxAvailableHeight
    : Math.min(viewerConfig.height, maxAvailableHeight);
  const leftPos = isMobile
    ? 0
    : Math.max(0, (containerW - finalW) / 2) + Math.floor(Math.random() * 30);
  const topPos = isMobile
    ? 0
    : Math.max(10, (maxAvailableHeight - finalH) / 2) + Math.floor(Math.random() * 30);

  const winEl = document.createElement("div");
  winEl.className = "window absolute flex flex-col active-window window-opening";
  winEl.id = `win-${viewerId}`;
  winEl.setAttribute("role", "dialog");
  winEl.setAttribute("aria-labelledby", `win-title-${viewerId}`);
  winEl.style.width = `${finalW}px`;
  winEl.style.height = `${finalH}px`;
  winEl.style.left = `${leftPos}px`;
  winEl.style.top = `${topPos}px`;
  winEl.style.zIndex = incrementZIndex().toString();

  winEl.innerHTML = `
    <div class="window-header" onmousedown="window.startDrag(event, '${viewerId}')" ondblclick="window.toggleMaximize('${viewerId}')">
      <div class="controls-neon-flat" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()">
        <button class="btn-neon min" onclick="window.minimizeWindow('${viewerId}')" aria-label="Minimize window"></button>
        <button class="btn-neon max" onclick="window.toggleMaximize('${viewerId}')" aria-label="Maximize window"></button>
        <button class="btn-neon close" onclick="window.closeWindow('${viewerId}')" aria-label="Close window"></button>
      </div>
      <span class="window-title" id="win-title-${viewerId}">${viewerConfig.title}</span>
    </div>
    <div class="flex-1 relative overflow-hidden">
      ${viewerConfig.content}
    </div>
  `;

  winEl.addEventListener("mousedown", () => bringToFront(viewerId));
  winEl.addEventListener("touchstart", () => bringToFront(viewerId), { passive: true });
  winEl.onmousemove = (e) => updateWindowCursor(e, winEl);
  winEl.onmousedown = (e) => {
    bringToFront(viewerId);
    handleResizeStart(e, winEl, viewerId);
  };
  addTouchListeners(winEl, viewerId);

  container.appendChild(winEl);
  activeWindows[viewerId] = {
    element: winEl,
    config: viewerConfig,
    maximized: false,
  };
  setTimeout(() => winEl.classList.remove("window-opening"), 350);
}

export function initMarkdownViewer(): void {
  window.openMarkdownViewer = openMarkdownViewer;
}
