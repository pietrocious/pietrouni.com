export class LabLayoutController {
  private rail: HTMLElement;
  private inspector: HTMLElement;
  private railResizer: HTMLElement;
  private inspectorResizer: HTMLElement;
  private sidebarToggle: HTMLButtonElement;
  private inspectorToggle: HTMLButtonElement;
  private dragMode: 'rail' | 'inspector' | null = null;

  constructor(private root: HTMLElement) {
    this.rail = root.querySelector('.lab-rail')!;
    this.inspector = root.querySelector('.lab-inspector')!;
    this.railResizer = root.querySelector('.lab-rail-resizer')!;
    this.inspectorResizer = root.querySelector('.lab-inspector-resizer')!;
    this.sidebarToggle = root.querySelector('.lab-sidebar-toggle')!;
    this.inspectorToggle = root.querySelector('.lab-inspector-toggle')!;

    this.sidebarToggle.addEventListener('click', this.toggleSidebar);
    this.inspectorToggle.addEventListener('click', this.toggleInspector);
    this.railResizer.addEventListener('pointerdown', this.startRailResize);
    this.inspectorResizer.addEventListener('pointerdown', this.startInspectorResize);
    this.railResizer.addEventListener('keydown', this.resizeRailWithKeyboard);
    this.inspectorResizer.addEventListener('keydown', this.resizeInspectorWithKeyboard);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.stopResize);
  }

  private toggleSidebar = (): void => {
    const collapsed = this.root.classList.toggle('lab-sidebar-collapsed');
    this.sidebarToggle.setAttribute('aria-expanded', String(!collapsed));
    this.sidebarToggle.title = collapsed ? 'Show source editor' : 'Hide source editor';
    this.rail.inert = collapsed;
  };

  private toggleInspector = (): void => {
    const collapsed = this.root.classList.toggle('lab-inspector-collapsed');
    this.inspectorToggle.setAttribute('aria-expanded', String(!collapsed));
    this.inspectorToggle.title = collapsed ? 'Show inspector' : 'Hide inspector';
    this.inspector.inert = collapsed;
  };

  private startRailResize = (event: PointerEvent): void => {
    if (window.innerWidth <= 760) return;
    event.preventDefault();
    this.dragMode = 'rail';
    this.root.classList.add('lab-is-resizing');
    this.railResizer.setPointerCapture(event.pointerId);
  };

  private startInspectorResize = (event: PointerEvent): void => {
    event.preventDefault();
    this.dragMode = 'inspector';
    this.root.classList.add('lab-is-resizing');
    this.inspectorResizer.setPointerCapture(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragMode) return;
    const rootRect = this.root.getBoundingClientRect();
    if (this.dragMode === 'rail') {
      const width = Math.max(260, Math.min(rootRect.width * 0.58, event.clientX - rootRect.left));
      this.root.style.setProperty('--lab-rail-width', `${Math.round(width)}px`);
    } else {
      const workspace = this.root.querySelector('.lab-workspace')!.getBoundingClientRect();
      const height = Math.max(96, Math.min(workspace.height * 0.56, workspace.bottom - event.clientY));
      this.root.style.setProperty('--lab-inspector-height', `${Math.round(height)}px`);
    }
  };

  private stopResize = (): void => {
    this.dragMode = null;
    this.root.classList.remove('lab-is-resizing');
  };

  private resizeRailWithKeyboard = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' ? -20 : 20;
    const max = this.root.getBoundingClientRect().width * 0.58;
    const width = Math.max(260, Math.min(max, this.rail.getBoundingClientRect().width + delta));
    this.root.style.setProperty('--lab-rail-width', `${Math.round(width)}px`);
  };

  private resizeInspectorWithKeyboard = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const delta = event.key === 'ArrowUp' ? 20 : -20;
    const workspace = this.root.querySelector('.lab-workspace')!.getBoundingClientRect();
    const height = Math.max(96, Math.min(workspace.height * 0.56, this.inspector.getBoundingClientRect().height + delta));
    this.root.style.setProperty('--lab-inspector-height', `${Math.round(height)}px`);
  };

  destroy(): void {
    this.sidebarToggle.removeEventListener('click', this.toggleSidebar);
    this.inspectorToggle.removeEventListener('click', this.toggleInspector);
    this.railResizer.removeEventListener('pointerdown', this.startRailResize);
    this.inspectorResizer.removeEventListener('pointerdown', this.startInspectorResize);
    this.railResizer.removeEventListener('keydown', this.resizeRailWithKeyboard);
    this.inspectorResizer.removeEventListener('keydown', this.resizeInspectorWithKeyboard);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.stopResize);
  }
}
