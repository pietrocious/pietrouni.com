// animations.ts - content entrance animations and scroll-triggered reveals

// Apply staggered entrance animations to children of a window
export function animateWindowContent(winEl: HTMLElement): void {
  // Check reduced motion preference
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const content = winEl.querySelector('.window-content, .flex-1');
  if (!content) return;

  // Animate headings — start immediately with the window open
  const headings = content.querySelectorAll('h1, h2, h3');
  headings.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    htmlEl.classList.add('anim-fade-up');
    htmlEl.style.animationDelay = `${i * 50}ms`;
  });

  // Animate paragraphs — slight stagger after headings
  const paragraphs = content.querySelectorAll('p');
  paragraphs.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    htmlEl.classList.add('anim-fade-up');
    htmlEl.style.animationDelay = `${50 + i * 40}ms`;
  });

  // Animate list items with border-left (project items)
  const projectItems = content.querySelectorAll('li[class*="border-l"]');
  projectItems.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    htmlEl.classList.add('anim-slide-left');
    htmlEl.style.animationDelay = `${80 + i * 60}ms`;
  });

  // Animate cards (grid items with border)
  const cards = content.querySelectorAll('[class*="border"][class*="rounded"]');
  cards.forEach((el, i) => {
    const htmlEl = el as HTMLElement;
    // Don't re-animate vault cards (they have their own animation)
    if (htmlEl.classList.contains('vault-card-animate')) return;
    htmlEl.classList.add('anim-scale-in');
    htmlEl.style.animationDelay = `${60 + i * 50}ms`;
  });

  // Setup scroll-triggered reveals for content below the fold
  setupScrollReveals(content as HTMLElement);
}

// IntersectionObserver for scroll-based reveals within scrollable windows
function setupScrollReveals(container: HTMLElement): void {
  const scrollableParent = container.closest('.overflow-y-auto, .window-content') as HTMLElement;
  if (!scrollableParent) return;

  // Find elements that are likely below the fold
  const allSections = container.querySelectorAll('div > div, section');
  const containerRect = scrollableParent.getBoundingClientRect();

  allSections.forEach(el => {
    const rect = el.getBoundingClientRect();
    // Only add scroll-reveal to elements below the visible area
    if (rect.top > containerRect.bottom) {
      (el as HTMLElement).classList.add('scroll-reveal');
    }
  });

  // Create observer
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: scrollableParent,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1,
    }
  );

  container.querySelectorAll('.scroll-reveal').forEach(el => {
    observer.observe(el);
  });
}
