import { beforeEach, describe, expect, it, vi } from "vitest";

const vantaMocks = vi.hoisted(() => ({
  initVanta: vi.fn().mockResolvedValue(undefined),
  destroyVanta: vi.fn(),
  updateVantaTheme: vi.fn(),
  isVantaActive: vi.fn().mockReturnValue(false),
}));

vi.mock("./vanta", () => vantaMocks);

import { canAutoStartVanta, setWallpaper } from "./theme";

describe("automatic Vanta eligibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    document.body.innerHTML = '<div id="desktop"></div>';
  });

  it("allows motion-capable desktop viewports", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(canAutoStartVanta()).toBe(true);
  });

  it("opts out on small screens", () => {
    Object.defineProperty(window, "innerWidth", { value: 767, configurable: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
    expect(canAutoStartVanta()).toBe(false);
  });

  it("opts out when reduced motion is requested", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    expect(canAutoStartVanta()).toBe(false);
  });

  it("honors an explicit animated-wallpaper choice on small screens", () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    // Motion is fine — only the screen-size heuristic (which auto-start uses,
    // but an explicit pick overrides) would otherwise block this.
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    setWallpaper(0);

    expect(vantaMocks.initVanta).toHaveBeenCalledWith(
      "HALO",
      false,
      document.getElementById("desktop"),
    );
  });

  it("still respects reduced motion on an explicit choice", () => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    setWallpaper(0);

    expect(vantaMocks.initVanta).not.toHaveBeenCalled();
  });
});
