export const INTRO_STORAGE_KEY = "pietros:intro:v1";

export function shouldOpenFirstVisitIntro(
  storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage,
): boolean {
  try {
    if (storage.getItem(INTRO_STORAGE_KEY)) return false;
    storage.setItem(INTRO_STORAGE_KEY, "seen");
    return true;
  } catch {
    // Storage can be unavailable in strict privacy contexts. Showing the intro
    // is the safer fallback because the visitor has no persisted history.
    return true;
  }
}
