import gymRoutineHtml from './gym-routine.html?raw';
import alloCss from 'allo-font/allo.css?inline';

function gymRoutineDocument(): string {
  const fontStyle = `<style id="allo-font">${alloCss}</style>`;
  return gymRoutineHtml.includes('</head>')
    ? gymRoutineHtml.replace('</head>', `${fontStyle}</head>`)
    : `${fontStyle}${gymRoutineHtml}`;
}

let gymRoutineFrame: HTMLIFrameElement | null = null;

export function initGymRoutine(container: HTMLElement): void {
  if (gymRoutineFrame) destroyGymRoutine();

  container.innerHTML = '';
  container.style.backgroundColor = 'transparent';

  const iframe = document.createElement('iframe');
  iframe.srcdoc = gymRoutineDocument();
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  iframe.style.display = 'block';
  iframe.title = 'Gym Routine';

  iframe.addEventListener('load', () => {
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    iframe.contentWindow?.postMessage({ type: 'theme-change', theme }, '*');
  });

  container.appendChild(iframe);
  gymRoutineFrame = iframe;
}

export function destroyGymRoutine(): void {
  if (gymRoutineFrame?.parentNode) {
    gymRoutineFrame.parentNode.removeChild(gymRoutineFrame);
  }

  gymRoutineFrame = null;
}
