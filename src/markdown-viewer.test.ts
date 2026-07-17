// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openMarkdownViewer } from './markdown-viewer';
import { activeWindows } from './state';

describe('markdown viewer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    Object.keys(activeWindows).forEach(id => delete activeWindows[id]);
    vi.unstubAllGlobals();
  });

  it('fetches the file path and uses the supplied title', async () => {
    document.body.innerHTML = '<div id="windows-container"></div>';
    const container = document.getElementById('windows-container')!;
    Object.defineProperties(container, {
      clientWidth: { value: 1200 },
      clientHeight: { value: 800 },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response('# Evidence\n\nCase study body.'));
    vi.stubGlobal('fetch', fetchMock);

    await openMarkdownViewer('/vault/case-studies/example.md', 'Example case study');

    expect(fetchMock).toHaveBeenCalledWith('/vault/case-studies/example.md');
    expect(document.querySelector('.window-title')?.textContent).toBe('Example case study');
    expect(document.querySelector('.markdown-body')?.textContent).toContain('Evidence');
  });
});
