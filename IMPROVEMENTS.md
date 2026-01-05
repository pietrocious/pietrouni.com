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

## Next Steps

### High Priority

1. **Split main.js into ES6 modules**

   ```
   src/
   ├── main.js           (entry point)
   ├── state.js          (centralized state)
   ├── windows/
   │   ├── manager.js
   │   └── config.js
   ├── terminal/
   │   ├── core.js
   │   ├── os93.js
   │   ├── cyberpunk.js
   │   └── fallout.js
   ├── vault.js
   └── spotlight.js
   ```

2. **Add TypeScript**

   ```bash
   npm install -D typescript
   ```

3. **Add Vitest for testing**
   ```bash
   npm install -D vitest
   ```

### Medium Priority

5. **Add Service Worker for PWA**

   - Enable offline functionality
   - Add to home screen support

6. **Improve accessibility**
   - Complete ARIA labels
   - Keyboard navigation
   - Screen reader support

### Low Priority

7. **Add SEO files**

   - `robots.txt`
   - `sitemap.xml`
   - JSON-LD structured data

8. **Performance optimization**
   - Lazy load non-critical resources
   - Image optimization
   - Code splitting

## Commands

```bash
npm run dev      # Development server with HMR
npm run build    # Production build to dist/
npm run preview  # Preview production build
```
