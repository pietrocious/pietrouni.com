import { beforeEach, describe, expect, it, vi } from "vitest";
import { canAutoStartVanta } from "./theme";

describe("automatic Vanta eligibility", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
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
});
