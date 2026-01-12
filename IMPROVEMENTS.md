# Future Improvements

This document tracks potential improvements for the pietrouni.com portfolio.

## Completed

- [x] Set up Vite build system
- [x] Extract JavaScript to `src/main.js` (3,288 lines)
- [x] Install `marked` locally via npm
- [x] Fix calculator security vulnerability
- [x] Add global error handlers
- [x] HTML reduced from 3,731 to 463 lines
- [x] **Convert Tailwind to build-time** (was 300KB+ CDN → 48KB tree-shaken)
  - Created `tailwind.config.js` with custom theme
  - Created `postcss.config.js` for Vite integration
  - Added `@theme` directive in `styles.css` for Tailwind v4
  - Removed CDN script and inline config (~55 lines from HTML)
- [x] **Split main.js into ES6 modules**
  - Refactored monolithic `main.js` into modular components in `src/`
  - Created dynamic module loader and specialized modules (terminal, windows, etc.)
- [x] **Improve accessibility**
  - Added comprehensive ARIA labels to all interactive elements
  - Implemented `role` attributes (dialog, listbox, navigation, button)
  - Added `aria-modal` and `aria-hidden` for proper screen reader support
  - Keyboard navigation support via proper semantic markup
- [x] **Add SEO files**
  - Created `robots.txt` with sitemap reference and crawl-delay
  - Created `sitemap.xml` with proper schema
  - Added JSON-LD structured data in `index.html`
- [x] **Add TypeScript**
  - Created `tsconfig.json` with strict mode and ES2022 target
  - Added type definitions in `src/types.d.ts`
  - Converted all 9 JavaScript files to TypeScript (`.ts`)
  - Gradual typing approach allows incremental type safety improvements
- [x] **Add Vitest for testing**

  - Created `vitest.config.ts` with jsdom environment
  - Added test scripts to `package.json` (`test`, `test:run`, `test:coverage`)
  - Created initial test suites for `state`, `config`, and `terminal/core` modules
  - 32 tests passing across 3 test files

- [x] **Add Service Worker for PWA**
  - Created `public/sw.js` with cache-first strategy for offline support
  - Updated `site.webmanifest` with proper PWA fields (name, start_url, scope, icons)
  - Added service worker registration in `main.ts`
  - Caches shell assets, Google Fonts, and static assets
  - Version-based cache busting with automatic cleanup

## Next Steps

### Medium Priority

### Low Priority

2. **Performance optimization**

   - Lazy load non-critical resources
   - Image optimization
   - Code splitting

3. **Expand test coverage**
   - Add tests for window management
   - Add integration tests for terminal commands
   - Add E2E tests with Playwright

## Commands

```bash
npm run dev        # Development server with HMR
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
```
