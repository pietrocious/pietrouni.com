import { describe, it, expect, beforeEach } from 'vitest';
import { resolvePath, getTerminalPromptHTML, TERMINAL_STATE } from './core';

describe('terminal/core module', () => {
  describe('resolvePath', () => {
    it('should resolve root path', () => {
      const result = resolvePath('/');
      expect(result).toBeDefined();
    });

    it('should resolve home directory', () => {
      const result = resolvePath('/home');
      expect(result).toBeDefined();
    });

    it('should resolve home/guest directory', () => {
      const result = resolvePath('/home/guest');
      expect(result).toBeDefined();
    });

    it('should return null for non-existent path', () => {
      const result = resolvePath('/nonexistent/path');
      expect(result).toBeNull();
    });

    it('should handle paths without leading slash', () => {
      const result = resolvePath('home/guest');
      expect(result).toBeDefined();
    });
  });

  describe('getTerminalPromptHTML', () => {
    beforeEach(() => {
      // Reset to default state
      TERMINAL_STATE.mode = 'pietros';
      TERMINAL_STATE.user = 'guest';
      TERMINAL_STATE.host = 'pietrOS';
    });

    it('should return pietrOS prompt by default', () => {
      const prompt = getTerminalPromptHTML();
      expect(prompt).toContain('guest');
      expect(prompt).toContain('pietrOS');
    });

    it('should return cyberpunk prompt when in cyberpunk mode', () => {
      TERMINAL_STATE.mode = 'cyberpunk';
      const prompt = getTerminalPromptHTML();
      expect(prompt).toContain('NET_ARCH');
    });

    it('should return fallout prompt when in fallout mode', () => {
      TERMINAL_STATE.mode = 'fallout';
      const prompt = getTerminalPromptHTML();
      expect(prompt).toContain('VAULT_DWELLER');
      expect(prompt).toContain('PIPBOY');
    });
  });

  describe('TERMINAL_STATE', () => {
    it('should allow mode changes', () => {
      TERMINAL_STATE.mode = 'cyberpunk';
      expect(TERMINAL_STATE.mode).toBe('cyberpunk');

      TERMINAL_STATE.mode = 'fallout';
      expect(TERMINAL_STATE.mode).toBe('fallout');

      TERMINAL_STATE.mode = 'pietros';
      expect(TERMINAL_STATE.mode).toBe('pietros');
    });

    it('should allow user changes', () => {
      const originalUser = TERMINAL_STATE.user;
      TERMINAL_STATE.user = 'testuser';
      expect(TERMINAL_STATE.user).toBe('testuser');
      TERMINAL_STATE.user = originalUser;
    });
  });
});
