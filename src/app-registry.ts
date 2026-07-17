import snakeIcon from './assets/icons/lab/snake.webp';
import tictactoeIcon from './assets/icons/lab/tictactoe.webp';
import tetrisIcon from './assets/icons/lab/tetris.webp';
import threesIcon from './assets/icons/lab/threes.webp';
import doomIcon from './assets/icons/lab/doom.webp';

export interface AppMetadata {
  title: string;
  icon: string;
  deepLinkable?: boolean;
  launcher?: boolean;
  launcherIcon?: string;
  launcherColor?: string;
}

export const APP_REGISTRY = {
  about: { title: 'README.md', icon: 'assets/icons/org.gnome.Logs.svg', deepLinkable: true, launcherIcon: '📄', launcherColor: 'bg-blue-500' },
  projects: { title: 'Projects', icon: 'assets/icons/org.gnome.tweaks.svg', deepLinkable: true, launcherIcon: '📁', launcherColor: 'bg-purple-500' },
  resume: { title: 'Resume', icon: 'assets/icons/oasis-text.svg', deepLinkable: true, launcherIcon: '📋', launcherColor: 'bg-sky-600' },
  vault: { title: 'Vault', icon: 'assets/icons/org.gnome.FileRoller.svg', deepLinkable: true, launcherIcon: '🔒', launcherColor: 'bg-amber-500' },
  terminal: { title: 'Terminal', icon: 'assets/icons/org.gnome.Terminal.svg', deepLinkable: true, launcherIcon: '💻', launcherColor: 'bg-gray-700' },
  experiments: { title: 'Lab', icon: 'assets/icons/characters.svg', deepLinkable: true, launcherIcon: '🧪', launcherColor: 'bg-lime-600' },
  iacvisualizer: { title: 'IaC Visualizer', icon: 'assets/icons/org.gaphor.Gaphor.svg', deepLinkable: true, launcherIcon: '◈', launcherColor: 'bg-indigo-600' },
  networktopology: { title: 'Network Topology', icon: 'assets/icons/network-wired.svg', deepLinkable: true, launcherIcon: '⌘', launcherColor: 'bg-cyan-700' },
  subnetplanner: { title: 'Subnet Planner', icon: 'assets/icons/org.gnome.Calculator.svg', deepLinkable: true, launcherIcon: '⌗', launcherColor: 'bg-emerald-700' },
  sitearchitecture: { title: 'How this site runs', icon: 'assets/icons/network-wired.svg', deepLinkable: true, launcherIcon: '☁', launcherColor: 'bg-blue-700' },
  gymroutine: { title: 'Gym Routine', icon: 'assets/icons/text-x-generic.svg', deepLinkable: true, launcher: false },
  finder: { title: 'Finder', icon: 'assets/icons/org.gnome.Nautilus.svg', launcherIcon: '📂', launcherColor: 'bg-blue-400' },
  monitor: { title: 'Monitoring', icon: 'assets/icons/org.gnome.SystemMonitor.svg', launcherIcon: '📊', launcherColor: 'bg-teal-600' },
  settings: { title: 'Settings', icon: 'assets/icons/org.gnome.Settings.svg', launcherIcon: '⚙️', launcherColor: 'bg-gray-500' },
  sysinfo: { title: 'About pietrOS', icon: 'assets/icons/contacts.svg', launcherIcon: 'ℹ️', launcherColor: 'bg-rose-500' },
  launchpad: { title: 'Launchpad', icon: 'assets/icons/org.gnome.Extensions.svg', launcher: false },
  snake: { title: 'Snake', icon: snakeIcon, launcher: false },
  tictactoe: { title: 'Tic Tac Toe', icon: tictactoeIcon, launcher: false },
  tetris: { title: 'Tetris', icon: tetrisIcon, launcher: false },
  threes: { title: 'Threes!', icon: threesIcon, launcher: false },
  doom: { title: 'DOOM', icon: doomIcon, launcher: false },
} satisfies Record<string, AppMetadata>;

export type AppId = keyof typeof APP_REGISTRY;

export function getAppMetadata(id: string): AppMetadata | undefined {
  return APP_REGISTRY[id as AppId];
}

export function isDeepLinkableApp(id: string): id is AppId {
  return getAppMetadata(id)?.deepLinkable === true;
}

export function getLauncherApps(): Array<AppMetadata & { id: AppId }> {
  return (Object.entries(APP_REGISTRY) as Array<[AppId, AppMetadata]>)
    .filter(([, app]) => app.launcher !== false && app.launcherIcon && app.launcherColor)
    .map(([id, app]) => ({ id, ...app }));
}

export function getDeepLinkedApp(input: string | URL): string | null {
  const url = input instanceof URL ? input : new URL(input, 'https://pietrouni.com');
  const queryApp = url.searchParams.get('app')?.trim().toLowerCase();
  if (queryApp) return queryApp;

  const hash = url.hash.replace(/^#/, '');
  if (!hash) return null;
  return new URLSearchParams(hash).get('app')?.trim().toLowerCase() || null;
}

export function buildAppUrl(input: string | URL, appId: string | null): string {
  const url = input instanceof URL ? new URL(input.href) : new URL(input, 'https://pietrouni.com');
  if (appId) url.searchParams.set('app', appId);
  else url.searchParams.delete('app');

  const rawHash = url.hash.replace(/^#/, '');
  if (rawHash.includes('=') || rawHash.startsWith('app')) {
    const hashParams = new URLSearchParams(rawHash);
    hashParams.delete('app');
    const nextHash = hashParams.toString();
    url.hash = nextHash ? `#${nextHash}` : '';
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
