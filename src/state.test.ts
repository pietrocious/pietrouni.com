import { describe, it, expect, beforeEach } from 'vitest';
import {
  shuffleArray,
  incrementZIndex,
  setActiveWallpaperIndex,
  activeWallpaperIndex,
  zIndexCounter,
  wallpapers,
  quotes,
  TERMINAL_STATE,
} from './state';

describe('state module', () => {
  describe('shuffleArray', () => {
    it('should return an array of the same length', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray([...arr]);
      expect(shuffled.length).toBe(arr.length);
    });

    it('should contain all original elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const shuffled = shuffleArray([...arr]);
      expect(shuffled.sort()).toEqual(arr.sort());
    });

    it('should handle empty array', () => {
      const arr: number[] = [];
      const shuffled = shuffleArray([...arr]);
      expect(shuffled).toEqual([]);
    });

    it('should handle single element array', () => {
      const arr = [42];
      const shuffled = shuffleArray([...arr]);
      expect(shuffled).toEqual([42]);
    });
  });

  describe('incrementZIndex', () => {
    it('should increment and return the new z-index', () => {
      const initial = zIndexCounter;
      const result = incrementZIndex();
      expect(result).toBe(initial + 1);
    });
  });

  describe('wallpapers', () => {
    it('should have at least one wallpaper', () => {
      expect(wallpapers.length).toBeGreaterThan(0);
    });

    it('should have type property for each wallpaper', () => {
      wallpapers.forEach((wp) => {
        expect(wp.type).toBeDefined();
        expect(['class', 'gradient', 'vanta']).toContain(wp.type);
      });
    });

    it('should have light and dark variants', () => {
      wallpapers.forEach((wp) => {
        expect(wp.light).toBeDefined();
        expect(wp.dark).toBeDefined();
      });
    });
  });

  describe('quotes', () => {
    it('should have multiple quotes', () => {
      expect(quotes.length).toBeGreaterThan(0);
    });

    it('should have non-empty strings', () => {
      quotes.forEach((quote) => {
        expect(typeof quote).toBe('string');
        expect(quote.length).toBeGreaterThan(0);
      });
    });
  });

  describe('TERMINAL_STATE', () => {
    it('should have default mode as pietros', () => {
      expect(TERMINAL_STATE.mode).toBe('pietros');
    });

    it('should have user and host properties', () => {
      expect(TERMINAL_STATE.user).toBeDefined();
      expect(TERMINAL_STATE.host).toBeDefined();
    });
  });
});
