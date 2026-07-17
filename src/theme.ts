// Theme + wallpaper management
import {
  wallpapers, allWallpaperClasses,
  activeWallpaperIndex, setActiveWallpaperIndex,
} from "./state";
import { initVanta, destroyVanta, updateVantaTheme, isVantaActive } from "./vanta";

type VantaStartMode = "auto" | "explicit";

let idleVantaRequest: number | null = null;
let idleVantaFallback: ReturnType<typeof setTimeout> | null = null;
let loadListener: (() => void) | null = null;

export function canAutoStartVanta(): boolean {
  return window.innerWidth >= 768
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function cancelScheduledVanta(): void {
  if (loadListener) {
    window.removeEventListener("load", loadListener);
    loadListener = null;
  }
  if (idleVantaRequest !== null && "cancelIdleCallback" in window) {
    window.cancelIdleCallback(idleVantaRequest);
  }
  if (idleVantaFallback !== null) clearTimeout(idleVantaFallback);
  idleVantaRequest = null;
  idleVantaFallback = null;
}

function scheduleVanta(effectName: string, isDark: boolean, desktop: HTMLElement): void {
  cancelScheduledVanta();
  if (!canAutoStartVanta()) return;

  const start = () => {
    idleVantaRequest = null;
    idleVantaFallback = null;
    const active = wallpapers[activeWallpaperIndex];
    if (active.type === "vanta" && active.vantaEffect === effectName) {
      void initVanta(effectName, isDark, desktop);
    }
  };
  const queueWhenIdle = () => {
    loadListener = null;
    if ("requestIdleCallback" in window) {
      idleVantaRequest = window.requestIdleCallback(start, { timeout: 3000 });
    } else {
      idleVantaFallback = setTimeout(start, 1500);
    }
  };

  if (document.readyState === "complete") queueWhenIdle();
  else {
    loadListener = queueWhenIdle;
    window.addEventListener("load", queueWhenIdle, { once: true });
  }
}

function applyWallpaperClasses(
  wp: (typeof wallpapers)[0],
  isDark: boolean,
  desktop: HTMLElement,
  vantaStartMode: VantaStartMode,
): void {
  desktop.style.background = "";
  allWallpaperClasses.forEach((cls) => desktop.classList.remove(cls));
  cancelScheduledVanta();
  if (wp.type === "class") {
    desktop.classList.add(isDark ? wp.dark : wp.light);
    destroyVanta();
  } else if (wp.type === "gradient") {
    desktop.style.background = isDark ? wp.dark : wp.light;
    destroyVanta();
  } else if (wp.type === "vanta" && wp.vantaEffect) {
    const effectName = wp.vantaEffect.toLowerCase();
    desktop.classList.add(`wallpaper-static-${effectName}`);
    destroyVanta();
    if (vantaStartMode === "explicit") {
      void initVanta(wp.vantaEffect, isDark, desktop);
    } else {
      scheduleVanta(wp.vantaEffect, isDark, desktop);
    }
  }
}

export function applyWallpaper(
  animate = false,
  vantaStartMode: VantaStartMode = "auto",
): void {
  const isDark = document.documentElement.classList.contains("dark");
  const wp = wallpapers[activeWallpaperIndex];
  const desktop = document.getElementById("desktop");
  if (!desktop) return;

  // If switching away from vanta, no cross-fade needed (canvas unmounts)
  const skipFade = wp.type === "vanta" || isVantaActive();

  if (animate && !skipFade) {
    desktop.classList.add("wallpaper-transitioning");
    requestAnimationFrame(() => {
      applyWallpaperClasses(wp, isDark, desktop, vantaStartMode);
      requestAnimationFrame(() => {
        desktop.classList.remove("wallpaper-transitioning");
      });
    });
  } else {
    applyWallpaperClasses(wp, isDark, desktop, vantaStartMode);
  }
}

export function setTheme(dark: boolean): void {
  const desktop = document.getElementById("desktop");
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  desktop?.classList.remove("her-bg", "her-bg-dark");

  if (isVantaActive()) {
    updateVantaTheme(dark);
  }
  applyWallpaper(false, isVantaActive() ? "explicit" : "auto");

  const newTheme = dark ? "dark" : "light";
  document.querySelectorAll("iframe").forEach((frame) => {
    frame.contentWindow?.postMessage(
      { type: "theme-change", theme: newTheme },
      "*",
    );
  });
}

export function updateThemeUI(): void {
  const mode = localStorage.theme || "system";
  const isDark = document.documentElement.classList.contains("dark");
  const label = document.getElementById("settings-theme-label");
  if (label) {
    const labels: Record<string, string> = {
      light: "Light Mode",
      dark: "Dark Mode",
      system: "System (" + (isDark ? "Dark" : "Light") + ")",
    };
    label.textContent = labels[mode] || labels.system;
  }
  document.querySelectorAll(".theme-seg-btn").forEach((btn) => {
    const el = btn as HTMLElement;
    const isActive = el.dataset.mode === mode;
    if (isActive) {
      el.classList.add("bg-her-red", "text-white");
      el.classList.remove("hover:bg-black/10", "dark:hover:bg-white/10");
    } else {
      el.classList.remove("bg-her-red", "text-white");
      el.classList.add("hover:bg-black/10", "dark:hover:bg-white/10");
    }
  });
}

export function setThemeMode(mode: string): void {
  if (mode === "system") {
    localStorage.removeItem("theme");
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  } else {
    localStorage.theme = mode;
    setTheme(mode === "dark");
  }
  updateThemeUI();
}

export function toggleTheme(): void {
  const goingDark = !document.documentElement.classList.contains("dark");
  setThemeMode(goingDark ? "dark" : "light");
}

export function cycleWallpaper(): void {
  setActiveWallpaperIndex((activeWallpaperIndex + 1) % wallpapers.length);
  applyWallpaper(true, "explicit");
}

export function setWallpaper(index: number): void {
  if (index >= 0 && index < wallpapers.length) {
    setActiveWallpaperIndex(index);
    applyWallpaper(true, "explicit");
  }
}

export function initTheme(): void {
  const prefersDark =
    localStorage.theme === "dark" ||
    (!("theme" in localStorage) &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  setTheme(prefersDark);
  updateThemeUI();

  // Live-sync with OS preference when user hasn't manually overridden
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!("theme" in localStorage)) {
      setTheme(e.matches);
      updateThemeUI();
    }
  });

  // Expose for HTML inline handlers
  window.setThemeMode = setThemeMode;
  window.toggleTheme = toggleTheme;
  window.cycleWallpaper = cycleWallpaper;
  window.setWallpaper = setWallpaper;
}
