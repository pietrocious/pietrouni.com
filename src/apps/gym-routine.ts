import gymRoutineHtml from '../experiments/gym-routine.html?raw';

let gymRoutineFrame: HTMLIFrameElement | null = null;

export function initGymRoutine(container: HTMLElement): void {
  if (gymRoutineFrame) destroyGymRoutine();

  container.innerHTML = '';
  container.style.backgroundColor = 'transparent';

  const iframe = document.createElement('iframe');
  iframe.srcdoc = gymRoutineHtml;
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
