import { describe, expect, it, vi } from "vitest";
import { INTRO_STORAGE_KEY, shouldOpenFirstVisitIntro } from "./first-visit";

describe("first-visit intro", () => {
  it("opens once and records the visit", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };

    expect(shouldOpenFirstVisitIntro(storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(INTRO_STORAGE_KEY, "seen");
    expect(shouldOpenFirstVisitIntro(storage)).toBe(false);
  });

  it("does not overwrite an existing marker", () => {
    const storage = {
      getItem: vi.fn(() => "seen"),
      setItem: vi.fn(),
    };

    expect(shouldOpenFirstVisitIntro(storage)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("opens when storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error("blocked"); }),
      setItem: vi.fn(),
    };

    expect(shouldOpenFirstVisitIntro(storage)).toBe(true);
  });
});
