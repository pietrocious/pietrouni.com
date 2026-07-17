import { describe, expect, it } from 'vitest';
import {
  APP_REGISTRY,
  buildAppUrl,
  getDeepLinkedApp,
  getLauncherApps,
  isDeepLinkableApp,
} from './app-registry';

describe('app registry', () => {
  it('contains the recruiter-facing applications', () => {
    for (const id of ['about', 'projects', 'resume', 'terminal', 'iacvisualizer', 'networktopology']) {
      expect(APP_REGISTRY[id as keyof typeof APP_REGISTRY]).toBeDefined();
      expect(isDeepLinkableApp(id)).toBe(true);
    }
  });

  it('drives launcher metadata from the same source', () => {
    const launcherIds = getLauncherApps().map(app => app.id);
    expect(launcherIds).toContain('resume');
    expect(launcherIds).toContain('projects');
    expect(launcherIds).not.toContain('doom');
  });
});

describe('app URL routing', () => {
  it('reads query links before legacy hash links', () => {
    expect(getDeepLinkedApp('https://pietrouni.com/?utm_source=cv&app=projects#app=terminal')).toBe('projects');
  });

  it('supports legacy hash links', () => {
    expect(getDeepLinkedApp('https://pietrouni.com/#app=resume')).toBe('resume');
  });

  it('preserves unrelated query and hash parameters', () => {
    expect(buildAppUrl('https://pietrouni.com/?utm_source=cv#section=work', 'resume'))
      .toBe('/?utm_source=cv&app=resume#section=work');
    expect(buildAppUrl('https://pietrouni.com/?utm_source=cv&app=resume#section=work', null))
      .toBe('/?utm_source=cv#section=work');
  });

  it('canonicalizes legacy app hashes without dropping other hash parameters', () => {
    expect(buildAppUrl('https://pietrouni.com/#app=terminal&panel=help', 'projects'))
      .toBe('/?app=projects#panel=help');
  });
});
