// PWA service worker registration
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[SW] Registration successful, scope:', registration.scope);
      })
      .catch((error) => {
        console.error('[SW] Registration failed:', error);
      });
  });
}
