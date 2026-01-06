import { describe, it, expect } from 'vitest';
import {
  vaultData,
  fileSystem,
  asciiAlpha,
  OS93_COMMANDS,
  CYBERPUNK_COMMANDS,
  FALLOUT_COMMANDS,
} from './config';

describe('config module', () => {
  describe('vaultData', () => {
    it('should have vault items', () => {
      expect(vaultData.length).toBeGreaterThan(0);
    });

    it('should have required properties for each item', () => {
      vaultData.forEach((item) => {
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.desc).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.category).toBeDefined();
        expect(item.status).toBeDefined();
        expect(['ready', 'soon']).toContain(item.status);
      });
    });
  });

  describe('fileSystem', () => {
    it('should have root directory', () => {
      expect(fileSystem.root).toBeDefined();
    });

    it('should have home/guest directory', () => {
      expect(fileSystem.root.home).toBeDefined();
      expect((fileSystem.root.home as Record<string, unknown>).guest).toBeDefined();
    });
  });

  describe('asciiAlpha', () => {
    it('should have alphabet letters', () => {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      letters.split('').forEach((letter) => {
        expect(asciiAlpha[letter]).toBeDefined();
        expect(asciiAlpha[letter].length).toBe(5);
      });
    });

    it('should have numbers', () => {
      const numbers = '0123456789';
      numbers.split('').forEach((num) => {
        expect(asciiAlpha[num]).toBeDefined();
        expect(asciiAlpha[num].length).toBe(5);
      });
    });

    it('should have space character', () => {
      expect(asciiAlpha[' ']).toBeDefined();
    });
  });

  describe('command lists', () => {
    it('should have OS93 commands', () => {
      expect(OS93_COMMANDS.length).toBeGreaterThan(0);
      expect(OS93_COMMANDS).toContain('help');
      expect(OS93_COMMANDS).toContain('clear');
      expect(OS93_COMMANDS).toContain('ls');
    });

    it('should have cyberpunk commands', () => {
      expect(CYBERPUNK_COMMANDS.length).toBeGreaterThan(0);
      expect(CYBERPUNK_COMMANDS).toContain('help');
      expect(CYBERPUNK_COMMANDS).toContain('scan');
    });

    it('should have fallout commands', () => {
      expect(FALLOUT_COMMANDS.length).toBeGreaterThan(0);
      expect(FALLOUT_COMMANDS).toContain('help');
      expect(FALLOUT_COMMANDS).toContain('stats');
    });
  });
});
