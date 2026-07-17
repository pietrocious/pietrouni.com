import { describe, expect, it } from 'vitest';
import { APP_REGISTRY } from '../app-registry';
import { windowConfigs } from './configs';

describe('window configuration registry', () => {
  it('defines a window for every registered application', () => {
    expect(Object.keys(windowConfigs).sort()).toEqual(Object.keys(APP_REGISTRY).sort());
  });

  it('provides usable titles, dimensions, and content', () => {
    for (const [id, config] of Object.entries(windowConfigs)) {
      expect(config.title, `${id} title`).toBeTruthy();
      expect(config.width, `${id} width`).toBeGreaterThan(0);
      expect(config.height, `${id} height`).toBeGreaterThan(0);
      expect(typeof config.content, `${id} content`).toBe('string');
      expect(config.content.length, `${id} content`).toBeGreaterThan(20);
      expect(config.content, `${id} extraction integrity`).not.toMatch(/tokens truncated|lines truncated/);
    }
  });

  it('keeps lifecycle cleanup paired for lazy interactive windows', () => {
    for (const id of ['tictactoe', 'snake', 'doom', 'gymroutine', 'tetris', 'threes', 'iacvisualizer', 'networktopology', 'subnetplanner']) {
      expect(windowConfigs[id].onOpen, `${id} onOpen`).toBeTypeOf('function');
      expect(windowConfigs[id].onClose, `${id} onClose`).toBeTypeOf('function');
    }
  });
});
