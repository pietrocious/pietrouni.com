# Future Improvements

This document tracks potential improvements for the pietrouni.com portfolio.

## Completed (This Session)

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

## Next Steps

### High Priority

1. **Add TypeScript**

   ```bash
   npm install -D typescript
   ```

2. **Add Vitest for testing**
   ```bash
   npm install -D vitest
   ```

### Medium Priority

3. **Add Service Worker for PWA**

   - Enable offline functionality
   - Add to home screen support

### Low Priority

4. **Performance optimization**
   - Lazy load non-critical resources
   - Image optimization
   - Code splitting

## Commands

```bash
npm run dev      # Development server with HMR
npm run build    # Production build to dist/
npm run preview  # Preview production build
```
