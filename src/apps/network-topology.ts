// Network Topology Mapper for pietrOS
// Vanilla TypeScript implementation using Canvas API
// Force-directed graph visualization for network devices

import { playClick, playNotification, isSoundEnabled } from '../audio';
import { LabLayoutController } from './lab-layout';

// ============ Types ============
interface NetworkDevice {
  id: string;
  type: 'router' | 'switch' | 'firewall' | 'host' | 'cloud' | 'server' | 'wireless' | 'unknown';
  name: string;
  ip?: string;
  platform?: string;
  interfaces: NetworkInterface[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale?: number;
}

interface NetworkInterface {
  name: string;
  ip?: string;
  vlan?: number;
  status?: 'up' | 'down';
  speed?: string;
  neighbor?: string;
}

interface NetworkLink {
  source: string;
  target: string;
  sourcePort: string;
  targetPort: string;
  type: 'trunk' | 'access' | 'routed' | 'unknown';
  vlan?: number;
}

interface ParsedTopology {
  devices: NetworkDevice[];
  links: NetworkLink[];
  format: 'lldp' | 'cdp' | 'routing' | 'config' | 'unknown';
  errors: string[];
}

// ============ Node Colors ============
const DEVICE_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  router: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', icon: '🌐' },
  switch: { bg: '#1a3d3d', border: '#14b8a6', text: '#5eead4', icon: '🔀' },
  firewall: { bg: '#4a2c2a', border: '#ef4444', text: '#fca5a5', icon: '🛡️' },
  host: { bg: '#3b2d4d', border: '#a855f7', text: '#d8b4fe', icon: '💻' },
  server: { bg: '#2d3b2d', border: '#22c55e', text: '#86efac', icon: '🖥️' },
  cloud: { bg: '#2a3d4d', border: '#06b6d4', text: '#67e8f9', icon: '☁️' },
  wireless: { bg: '#3d3d2a', border: '#eab308', text: '#fde047', icon: '📡' },
  unknown: { bg: '#2d2d2d', border: '#6b7280', text: '#d1d5db', icon: '❓' },
};

const LINK_COLORS: Record<string, string> = {
  trunk: '#f59e0b',
  access: '#3b82f6',
  routed: '#22c55e',
  unknown: '#6b7280',
};

// ============ HTML Escaping ============
function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

function highlightNetworkData(data: string): string {
  const tokens = /(#.*|\b(?:Device ID|Local Intf|Hold-time|Capability|Port ID|Platform|Interface|Holdtime|Codes|Gateway|Network|Destination|Metric|Next Hop)\b|\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b|\b(?:[0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}\b|\b(?:Gi|GigabitEthernet|Fa|FastEthernet|Te|TenGigabitEthernet|Eth|Ethernet|Vlan|Po|Port-channel)[\w/.:-]*\b|\b\d+\b|[-:]+)/g;
  return data.split('\n').map(line => {
    let html = '';
    let cursor = 0;
    for (const match of line.matchAll(tokens)) {
      const token = match[0];
      const index = match.index ?? 0;
      html += escapeHtml(line.slice(cursor, index));
      let className = 'iac-token-punctuation';
      if (token.startsWith('#')) className = 'iac-token-comment';
      else if (/^(?:\d{1,3}\.){3}/.test(token) || /^(?:[0-9a-fA-F]{2}[:-]){5}/.test(token)) className = 'iac-token-string';
      else if (/^(?:Gi|GigabitEthernet|Fa|FastEthernet|Te|TenGigabitEthernet|Eth|Ethernet|Vlan|Po|Port-channel)/.test(token)) className = 'iac-token-key';
      else if (/^\d+$/.test(token)) className = 'iac-token-number';
      else if (/^[A-Za-z]/.test(token)) className = 'iac-token-keyword';
      html += `<span class="${className}">${escapeHtml(token)}</span>`;
      cursor = index + token.length;
    }
    return html + escapeHtml(line.slice(cursor));
  }).join('\n');
}

// ============ Sample Templates ============
const SAMPLE_LLDP = `# LLDP Neighbors - CORE-SW-01
Device ID           Local Intf     Hold-time  Capability      Port ID
CORE-RTR-01         Gi0/1          120        R               Gi0/0
DIST-SW-01          Gi0/2          120        B               Gi1/0/24
DIST-SW-02          Gi0/3          120        B               Gi1/0/24
ACCESS-SW-01        Gi0/4          120        B               Gi1/0/1
ACCESS-SW-02        Gi0/5          120        B               Gi1/0/1
FW-01               Gi0/6          120        R               eth0
WLC-01              Gi0/7          120        R               Gi0/0/0

# LLDP Neighbors - DIST-SW-01
Device ID           Local Intf     Hold-time  Capability      Port ID
CORE-SW-01          Gi1/0/24       120        B               Gi0/2
ACCESS-SW-03        Gi1/0/1        120        B               Gi1/0/48
ACCESS-SW-04        Gi1/0/2        120        B               Gi1/0/48
SERVER-01           Gi1/0/10       120        S               eth0
SERVER-02           Gi1/0/11       120        S               eth0`;

const SAMPLE_CDP = `-------------------------
Device ID: CORE-RTR-01
Entry address(es):
  IP address: 10.0.0.1
Platform: Cisco ISR4451-X,  Capabilities: Router
Interface: GigabitEthernet0/0/0,  Port ID (outgoing port): GigabitEthernet0/0
Holdtime : 157 sec

-------------------------
Device ID: DIST-SW-01
Entry address(es):
  IP address: 10.0.1.1
Platform: cisco WS-C3850-48T,  Capabilities: Switch IGMP
Interface: GigabitEthernet0/1,  Port ID (outgoing port): GigabitEthernet1/0/24
Holdtime : 165 sec

-------------------------
Device ID: DIST-SW-02
Entry address(es):
  IP address: 10.0.1.2
Platform: cisco WS-C3850-48T,  Capabilities: Switch IGMP
Interface: GigabitEthernet0/2,  Port ID (outgoing port): GigabitEthernet1/0/24
Holdtime : 162 sec

-------------------------
Device ID: FIREWALL-01
Entry address(es):
  IP address: 10.0.0.254
Platform: Cisco ASA5525,  Capabilities: Router
Interface: GigabitEthernet0/3,  Port ID (outgoing port): GigabitEthernet0/1
Holdtime : 120 sec`;

const SAMPLE_ROUTING = `Codes: C - connected, S - static, R - RIP, O - OSPF, B - BGP

Gateway of last resort is 10.0.0.254 to network 0.0.0.0

C    10.0.0.0/24 is directly connected, GigabitEthernet0/0
C    10.0.1.0/24 is directly connected, GigabitEthernet0/1
C    10.0.2.0/24 is directly connected, GigabitEthernet0/2
O    10.1.0.0/16 [110/20] via 10.0.0.1, 00:45:12, GigabitEthernet0/0
O    10.2.0.0/16 [110/30] via 10.0.0.1, 00:45:12, GigabitEthernet0/0
O    10.3.0.0/16 [110/20] via 10.0.1.1, 00:45:12, GigabitEthernet0/1
B    192.168.0.0/16 [20/0] via 10.0.0.254, 01:23:45
S*   0.0.0.0/0 [1/0] via 10.0.0.254`;

// ============ Parsers ============
function detectDeviceType(capabilities: string, platform: string, name: string): NetworkDevice['type'] {
  const capLower = capabilities.toLowerCase();
  const platLower = platform.toLowerCase();
  const nameLower = name.toLowerCase();
  
  if (capLower.includes('router') || platLower.includes('isr') || nameLower.includes('rtr')) return 'router';
  if (platLower.includes('asa') || nameLower.includes('fw') || nameLower.includes('firewall')) return 'firewall';
  // Match "ap" only as its own hostname segment (AP-01, floor2-ap) so names
  // like "api-server" don't classify as wireless
  if (platLower.includes('air') || platLower.includes('wlc') || nameLower.includes('wlc') || /(^|-)ap(\d|-|$)/.test(nameLower)) return 'wireless';
  if (capLower.includes('switch') || capLower === 'b' || platLower.includes('ws-c') || nameLower.includes('sw')) return 'switch';
  if (capLower === 's' || platLower.includes('server') || nameLower.includes('server') || nameLower.includes('srv')) return 'server';
  return 'unknown';
}

function parseLLDP(data: string): ParsedTopology {
  const devices: NetworkDevice[] = [];
  const links: NetworkLink[] = [];
  const errors: string[] = [];
  const deviceMap = new Map<string, NetworkDevice>();
  
  let currentLocalDevice = 'LOCAL-DEVICE';
  const lines = data.split('\n');
  const seenLinks = new Set<string>();

  for (const line of lines) {
    // Check for local device header comments; capture the full device name
    // after a spaced separator, e.g. "# LLDP Neighbors - CORE-SW-01"
    const headerMatch = line.match(/^#\s*(?:.*?\s[-:]\s+)?(\S.*)$/);
    if (headerMatch) {
      currentLocalDevice = headerMatch[1].trim().replace(/\s+/g, '-').toUpperCase();
      if (!deviceMap.has(currentLocalDevice)) {
        deviceMap.set(currentLocalDevice, {
          id: currentLocalDevice,
          type: 'switch',
          name: currentLocalDevice,
          interfaces: [],
          x: 0, y: 0, vx: 0, vy: 0,
        });
      }
      continue;
    }
    
    // Skip headers and empty lines
    if (line.startsWith('Device ID') || line.trim() === '' || line.startsWith('-')) continue;
    
    // Parse LLDP neighbor line
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 5) {
      const [deviceId, localIntf, , capability, portId] = parts;
      
      // Add remote device if not exists
      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          id: deviceId,
          type: detectDeviceType(capability, '', deviceId),
          name: deviceId,
          interfaces: [],
          x: 0, y: 0, vx: 0, vy: 0,
        });
      }

      // Infer link type from the neighbour's capability code
      const capUpper = capability.toUpperCase();
      const linkType: NetworkLink['type'] =
        capUpper.includes('R') ? 'routed' :
        capUpper.includes('S') || capUpper.includes('H') ? 'access' : 'trunk';

      // Skip the reverse entry of a link we already have (both ends of a
      // cable report each other in multi-device dumps)
      const key = `${currentLocalDevice}|${localIntf}|${deviceId}|${portId}`;
      const reverseKey = `${deviceId}|${portId}|${currentLocalDevice}|${localIntf}`;
      if (!seenLinks.has(key) && !seenLinks.has(reverseKey)) {
        seenLinks.add(key);
        links.push({
          source: currentLocalDevice,
          target: deviceId,
          sourcePort: localIntf,
          targetPort: portId || 'unknown',
          type: linkType,
        });
      }
    }
  }
  
  devices.push(...deviceMap.values());
  
  if (devices.length === 0) {
    errors.push('No LLDP neighbors found in the data');
  }
  
  return { devices, links, format: 'lldp', errors };
}

function parseCDP(data: string): ParsedTopology {
  const devices: NetworkDevice[] = [];
  const links: NetworkLink[] = [];
  const errors: string[] = [];
  const deviceMap = new Map<string, NetworkDevice>();
  
  // Add local device
  const localDevice: NetworkDevice = {
    id: 'LOCAL-DEVICE',
    type: 'switch',
    name: 'LOCAL-DEVICE',
    interfaces: [],
    x: 0, y: 0, vx: 0, vy: 0,
  };
  deviceMap.set('LOCAL-DEVICE', localDevice);
  
  // Parse CDP entries
  const entries = data.split(/^-+$/m).filter(e => e.trim());
  
  for (const entry of entries) {
    const deviceIdMatch = entry.match(/Device ID:\s*(\S+)/);
    const ipMatch = entry.match(/IP address:\s*(\S+)/);
    const platformMatch = entry.match(/Platform:\s*([^,]+)/);
    const capMatch = entry.match(/Capabilities:\s*(.+?)(?:\n|$)/);
    const intfMatch = entry.match(/Interface:\s*(\S+)/);
    const portMatch = entry.match(/Port ID[^:]*:\s*(\S+)/);
    
    if (deviceIdMatch) {
      const deviceId = deviceIdMatch[1];
      const platform = platformMatch ? platformMatch[1].trim() : '';
      const capabilities = capMatch ? capMatch[1].trim() : '';
      
      if (!deviceMap.has(deviceId)) {
        deviceMap.set(deviceId, {
          id: deviceId,
          type: detectDeviceType(capabilities, platform, deviceId),
          name: deviceId,
          ip: ipMatch ? ipMatch[1] : undefined,
          platform: platform,
          interfaces: [],
          x: 0, y: 0, vx: 0, vy: 0,
        });
      }
      
      if (intfMatch && portMatch) {
        links.push({
          source: 'LOCAL-DEVICE',
          target: deviceId,
          sourcePort: intfMatch[1],
          targetPort: portMatch[1],
          type: capabilities.toLowerCase().includes('router') ? 'routed' : 'trunk',
        });
      }
    }
  }
  
  devices.push(...deviceMap.values());
  
  if (devices.length <= 1) {
    errors.push('No CDP neighbors found in the data');
  }
  
  return { devices, links, format: 'cdp', errors };
}

function parseRouting(data: string): ParsedTopology {
  const devices: NetworkDevice[] = [];
  const links: NetworkLink[] = [];
  const errors: string[] = [];
  const deviceMap = new Map<string, NetworkDevice>();
  
  // Add local router
  const localDevice: NetworkDevice = {
    id: 'LOCAL-ROUTER',
    type: 'router',
    name: 'LOCAL-ROUTER',
    interfaces: [],
    x: 0, y: 0, vx: 0, vy: 0,
  };
  deviceMap.set('LOCAL-ROUTER', localDevice);
  
  const lines = data.split('\n');
  let networkCount = 0;
  
  for (const line of lines) {
    // Parse connected routes
    if (line.match(/^C\s+/)) {
      const match = line.match(/C\s+(\d+\.\d+\.\d+\.\d+\/\d+).*?(\S+)$/);
      if (match) {
        networkCount++;
        const network = `NET-${match[1].replace(/[./]/g, '-')}`;
        deviceMap.set(network, {
          id: network,
          type: 'cloud',
          name: match[1],
          interfaces: [],
          x: 0, y: 0, vx: 0, vy: 0,
        });
        links.push({
          source: 'LOCAL-ROUTER',
          target: network,
          sourcePort: match[2],
          targetPort: 'direct',
          type: 'routed',
        });
      }
    }
    
    // Parse routes via next-hop
    const viaMatch = line.match(/via\s+(\d+\.\d+\.\d+\.\d+)/);
    if (viaMatch) {
      const nextHop = `NH-${viaMatch[1].replace(/\./g, '-')}`;
      if (!deviceMap.has(nextHop)) {
        deviceMap.set(nextHop, {
          id: nextHop,
          type: 'router',
          name: viaMatch[1],
          ip: viaMatch[1],
          interfaces: [],
          x: 0, y: 0, vx: 0, vy: 0,
        });
        links.push({
          source: 'LOCAL-ROUTER',
          target: nextHop,
          sourcePort: 'routing',
          targetPort: 'routing',
          type: 'routed',
        });
      }
    }
  }
  
  devices.push(...deviceMap.values());
  
  if (networkCount === 0) {
    errors.push('No routes found in the data');
  }
  
  return { devices, links, format: 'routing', errors };
}

export function detectFormat(data: string): 'lldp' | 'cdp' | 'routing' | 'unknown' {
  if (data.includes('Device ID:') && data.includes('Platform:')) return 'cdp';
  if (data.match(/Device ID\s+Local Intf/i) || data.includes('LLDP')) return 'lldp';
  if (data.match(/^[CSORB]\s+\d+\.\d+\.\d+\.\d+/m) || data.includes('Gateway of last resort')) return 'routing';
  return 'unknown';
}

export function parseTopology(data: string): ParsedTopology {
  const format = detectFormat(data);
  switch (format) {
    case 'lldp': return parseLLDP(data);
    case 'cdp': return parseCDP(data);
    case 'routing': return parseRouting(data);
    default: return { devices: [], links: [], format: 'unknown', errors: ['Could not detect input format. Try LLDP, CDP, or routing table output.'] };
  }
}

// ============ Network Topology Visualizer Class ============
export class NetworkTopologyVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textarea: HTMLTextAreaElement;
  private formatEl: HTMLElement;
  private countEl: HTMLElement;
  private errorEl: HTMLElement;
  private detailsEl: HTMLElement;
  private highlightEl: HTMLElement;
  private lineNumbersEl: HTMLElement;
  private filenameEl: HTMLElement;
  private layoutController: LabLayoutController;

  private devices: NetworkDevice[] = [];
  private deviceMap: Map<string, NetworkDevice> = new Map();
  private links: NetworkLink[] = [];
  private format: ParsedTopology['format'] = 'unknown';
  private selectedDevice: NetworkDevice | null = null;
  private hoveredDevice: NetworkDevice | null = null;
  private isDragging = false;
  private dragDevice: NetworkDevice | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private animationId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Bound event handlers
  private handlers: { [key: string]: (e: any) => void } = {};

  // Zoom/pan state
  private zoomLevel = 1;
  private panX = 0;
  private panY = 0;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private zoomEl: HTMLElement | null = null;

  // Touch state
  private lastTouchX = 0;
  private lastTouchY = 0;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private lineDashOffset = 0;
  private reducedMotion = false;
  private motionQuery: MediaQueryList | null = null;
  private motionHandler: ((e: MediaQueryListEvent) => void) | null = null;

  // Minimap hit area (screen space), refreshed each frame it is drawn
  private minimapRect: { x: number; y: number; size: number; pad: number; minX: number; minY: number; scale: number } | null = null;
  private isMinimapDrag = false;

  // True once the pointer moved while dragging/panning, so the click that
  // follows mouseup doesn't change the selection.
  private didMove = false;

  constructor(container: HTMLElement) {
    this.canvas = container.querySelector('#netmap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.textarea = container.querySelector('#netmap-code') as HTMLTextAreaElement;
    this.formatEl = container.querySelector('#netmap-format')!;
    this.countEl = container.querySelector('#netmap-count')!;
    this.errorEl = container.querySelector('#netmap-errors')!;
    this.detailsEl = container.querySelector('#netmap-details')!;
    this.highlightEl = container.querySelector('#netmap-highlight code')!;
    this.lineNumbersEl = container.querySelector('#netmap-line-numbers')!;
    this.filenameEl = container.querySelector('#netmap-filename')!;
    this.layoutController = new LabLayoutController(container);

    this.zoomEl = container.querySelector('#netmap-zoom') as HTMLElement;

    // Bind handlers
    this.handlers = {
      click: this.handleClick.bind(this),
      mousedown: this.handleMouseDown.bind(this),
      mousemove: this.handleMouseMove.bind(this),
      mouseup: this.handleMouseUp.bind(this),
      mouseleave: this.handleMouseUp.bind(this),
      wheel: this.handleWheel.bind(this),
      touchstart: this.handleTouchStart.bind(this),
      touchmove: this.handleTouchMove.bind(this),
      touchend: this.handleTouchEnd.bind(this),
      input: this.handleInput.bind(this),
      editorscroll: this.syncEditorScroll.bind(this),
      editorkeydown: this.handleEditorKeyDown.bind(this),
      lldp: () => this.loadTemplate('lldp'),
      cdp: () => this.loadTemplate('cdp'),
      routing: () => this.loadTemplate('routing'),
      export: () => this.exportPNG(),
      fit: () => this.fitToView(),
      zoomreset: () => this.resetZoom(),
      keydown: this.handleKeyDown.bind(this),
    };

    // Template buttons
    container.querySelector('#netmap-lldp')?.addEventListener('click', this.handlers.lldp);
    container.querySelector('#netmap-cdp')?.addEventListener('click', this.handlers.cdp);
    container.querySelector('#netmap-routing')?.addEventListener('click', this.handlers.routing);

    // Toolbar buttons
    container.querySelector('#netmap-export')?.addEventListener('click', this.handlers.export);
    container.querySelector('#netmap-fit')?.addEventListener('click', this.handlers.fit);
    this.zoomEl?.addEventListener('click', this.handlers.zoomreset);

    // Code input
    this.textarea.addEventListener('input', this.handlers.input);
    this.textarea.addEventListener('scroll', this.handlers.editorscroll);
    this.textarea.addEventListener('keydown', this.handlers.editorkeydown);

    // Canvas interactions
    this.canvas.addEventListener('mousedown', this.handlers.mousedown);
    this.canvas.addEventListener('mousemove', this.handlers.mousemove);
    this.canvas.addEventListener('mouseup', this.handlers.mouseup);
    this.canvas.addEventListener('mouseleave', this.handlers.mouseleave);
    this.canvas.addEventListener('click', this.handlers.click);
    this.canvas.addEventListener('wheel', this.handlers.wheel, { passive: false });
    
    // Touch interactions
    this.canvas.addEventListener('touchstart', this.handlers.touchstart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handlers.touchmove, { passive: false });
    this.canvas.addEventListener('touchend', this.handlers.touchend);

    // Keyboard
    window.addEventListener('keydown', this.handlers.keydown);

    // Reduced motion
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = this.motionQuery.matches;
    this.motionHandler = (e) => { this.reducedMotion = e.matches; };
    this.motionQuery.addEventListener('change', this.motionHandler);

    // Responsive Canvas
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container.parentElement || container);
    this.resize();

    // Initialize
    this.textarea.value = SAMPLE_LLDP;
    this.setTemplateActive('lldp');
    this.updateEditorPresentation();
    this.parseAndRender();
    this.startAnimation();
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = parent.getBoundingClientRect();

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Assigning width/height resets the transform to identity; render()
    // applies the DPR scale explicitly, so no persistent scale here.
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.render();
  }

  private handleInput(): void {
    this.updateEditorPresentation();
    this.parseAndRender();
  }

  private updateEditorPresentation(): void {
    const data = this.textarea.value;
    this.highlightEl.innerHTML = highlightNetworkData(data) + (data.endsWith('\n') ? '\n ' : '');
    const lineCount = Math.max(1, data.split('\n').length);
    this.lineNumbersEl.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    this.syncEditorScroll();
  }

  private syncEditorScroll(): void {
    const pre = this.highlightEl.parentElement as HTMLElement | null;
    if (pre) {
      pre.scrollTop = this.textarea.scrollTop;
      pre.scrollLeft = this.textarea.scrollLeft;
    }
    this.lineNumbersEl.scrollTop = this.textarea.scrollTop;
  }

  private handleEditorKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    event.preventDefault();
    this.textarea.setRangeText('  ', this.textarea.selectionStart, this.textarea.selectionEnd, 'end');
    this.handleInput();
  }

  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.panX) / this.zoomLevel, y: (sy - this.panY) / this.zoomLevel };
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(4, this.zoomLevel * factor));
    // Zoom towards mouse
    this.panX = mx - (mx - this.panX) * (newZoom / this.zoomLevel);
    this.panY = my - (my - this.panY) * (newZoom / this.zoomLevel);
    this.zoomLevel = newZoom;
    if (this.zoomEl) this.zoomEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.lastTouchX = touch.clientX - rect.left;
      this.lastTouchY = touch.clientY - rect.top;
      
      const { x, y } = this.screenToWorld(this.lastTouchX, this.lastTouchY);
      const device = this.getDeviceAt(x, y);
      
      if (device) {
        this.isDragging = true;
        this.dragDevice = device;
        this.dragOffsetX = x - device.x;
        this.dragOffsetY = y - device.y;
      } else {
        this.isPanning = true;
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      this.pinchStartDist = dist;
      this.pinchStartZoom = this.zoomLevel;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const sx = touch.clientX - rect.left;
      const sy = touch.clientY - rect.top;
      
      if (this.isDragging && this.dragDevice) {
        const { x, y } = this.screenToWorld(sx, sy);
        this.dragDevice.x = x - this.dragOffsetX;
        this.dragDevice.y = y - this.dragOffsetY;
        this.dragDevice.vx = 0;
        this.dragDevice.vy = 0;
      } else if (this.isPanning) {
        const dx = sx - this.lastTouchX;
        const dy = sy - this.lastTouchY;
        this.panX += dx;
        this.panY += dy;
        this.lastTouchX = sx;
        this.lastTouchY = sy;
      }
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = dist / this.pinchStartDist;
      
      const newZoom = Math.max(0.2, Math.min(4, this.pinchStartZoom * scale));

      // Zoom towards the pinch midpoint
      const rect = this.canvas.getBoundingClientRect();
      const mx = (t1.clientX + t2.clientX) / 2 - rect.left;
      const my = (t1.clientY + t2.clientY) / 2 - rect.top;
      this.panX = mx - (mx - this.panX) * (newZoom / this.zoomLevel);
      this.panY = my - (my - this.panY) * (newZoom / this.zoomLevel);
      this.zoomLevel = newZoom;
      if (this.zoomEl) this.zoomEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      this.isDragging = false;
      this.dragDevice = null;
      this.isPanning = false;
    }
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    const active = document.activeElement;
    const isTyping = active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      (active instanceof HTMLElement && active.isContentEditable);

    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      this.exportPNG();
    }
    if (isTyping) return;
    if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
      this.fitToView();
    }
    if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
      this.resetZoom();
    }
    if (e.key === 'Escape' && this.selectedDevice) {
      this.selectedDevice = null;
      this.updateDetails();
    }
  }

  private resetZoom(): void {
    // Return to 100% while keeping the canvas centre fixed
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cx = this.canvas.width / dpr / 2;
    const cy = this.canvas.height / dpr / 2;
    this.panX = cx - (cx - this.panX) / this.zoomLevel;
    this.panY = cy - (cy - this.panY) / this.zoomLevel;
    this.zoomLevel = 1;
    if (this.zoomEl) this.zoomEl.textContent = '100%';
  }

  private fitToView(): void {
    if (this.devices.length === 0) return;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.devices.forEach(d => {
      minX = Math.min(minX, d.x - 50); // 50 = half width
      minY = Math.min(minY, d.y - 25); // 25 = half height
      maxX = Math.max(maxX, d.x + 50);
      maxY = Math.max(maxY, d.y + 25);
    });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasW = this.canvas.width / dpr;
    const canvasH = this.canvas.height / dpr;
    
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    
    const scaleX = (canvasW - 100) / contentW;
    const scaleY = (canvasH - 100) / contentH;
    this.zoomLevel = Math.max(0.2, Math.min(1.5, Math.min(scaleX, scaleY)));

    this.panX = (canvasW / 2) - ((minX + contentW / 2) * this.zoomLevel);
    this.panY = (canvasH / 2) - ((minY + contentH / 2) * this.zoomLevel);
    
    if (this.zoomEl) this.zoomEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
  }

  private exportPNG(): void {
    const link = document.createElement('a');
    link.download = 'network-topology.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    if (isSoundEnabled()) playNotification();
  }

  private loadTemplate(type: 'lldp' | 'cdp' | 'routing'): void {
    switch (type) {
      case 'lldp': this.textarea.value = SAMPLE_LLDP; break;
      case 'cdp': this.textarea.value = SAMPLE_CDP; break;
      case 'routing': this.textarea.value = SAMPLE_ROUTING; break;
    }
    this.setTemplateActive(type);
    this.updateEditorPresentation();
    this.selectedDevice = null;
    this.hoveredDevice = null;
    // Force a fresh layout for the new template (no position carry-over)
    this.devices = [];
    this.deviceMap.clear();
    this.parseAndRender();
    if (isSoundEnabled()) playClick();
  }

  private setTemplateActive(type: 'lldp' | 'cdp' | 'routing'): void {
    const root = this.textarea.closest('#netmap-app');
    for (const option of ['lldp', 'cdp', 'routing'] as const) {
      const button = root?.querySelector<HTMLElement>(`#netmap-${option}`);
      button?.setAttribute('data-active', String(option === type));
      button?.setAttribute('aria-pressed', String(option === type));
    }
    this.filenameEl.textContent = type === 'lldp'
      ? 'lldp-neighbors.log'
      : type === 'cdp' ? 'cdp-neighbors.log' : 'routing-table.txt';
  }

  private parseAndRender(): void {
    const data = this.textarea.value;
    const parsed = parseTopology(data);
    const previous = this.deviceMap;
    this.format = parsed.format;
    this.devices = parsed.devices;
    this.links = parsed.links;

    // Update UI
    const formatLabels: Record<string, string> = {
      lldp: 'LLDP Neighbors',
      cdp: 'CDP Neighbors',
      routing: 'Routing Table',
      unknown: 'Unknown Format',
    };
    this.formatEl.textContent = formatLabels[parsed.format];
    this.countEl.textContent = `${parsed.devices.length} devices, ${parsed.links.length} links`;

    if (parsed.errors.length > 0) {
      this.errorEl.textContent = parsed.errors.join(', ');
      this.errorEl.classList.remove('hidden');
    } else {
      this.errorEl.classList.add('hidden');
    }

    // Keep positions of devices that survive the re-parse so live edits
    // don't scatter the layout; only new devices enter on the circle.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;

    this.devices.forEach((device, i) => {
      const prev = previous.get(device.id);
      if (prev) {
        device.x = prev.x;
        device.y = prev.y;
        device.vx = prev.vx;
        device.vy = prev.vy;
        device.scale = prev.scale ?? 1;
      } else {
        const angle = (i / this.devices.length) * Math.PI * 2;
        const radius = 120 + Math.random() * 60;
        device.x = centerX + Math.cos(angle) * radius;
        device.y = centerY + Math.sin(angle) * radius;
        device.scale = 0; // Start invisible
      }
    });

    this.deviceMap = new Map(this.devices.map(d => [d.id, d]));

    // Re-point selection/hover at the fresh device objects
    this.selectedDevice = this.selectedDevice ? this.deviceMap.get(this.selectedDevice.id) ?? null : null;
    this.hoveredDevice = this.hoveredDevice ? this.deviceMap.get(this.hoveredDevice.id) ?? null : null;
    this.updateDetails();
  }

  private startAnimation(): void {
    const animate = () => {
      this.applyForces();
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private applyForces(): void {
    const damping = 0.92;
    const repulsion = 8000;
    const attraction = 0.006;
    const centerForce = 0.001;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    const worldW = width / this.zoomLevel;
    const worldH = height / this.zoomLevel;
    const worldOriginX = -this.panX / this.zoomLevel;
    const worldOriginY = -this.panY / this.zoomLevel;
    const centerX = worldOriginX + worldW / 2;
    const centerY = worldOriginY + worldH / 2;

    // Repulsion between devices
    for (let i = 0; i < this.devices.length; i++) {
      for (let j = i + 1; j < this.devices.length; j++) {
        const dx = this.devices[j].x - this.devices[i].x;
        const dy = this.devices[j].y - this.devices[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        this.devices[i].vx -= fx;
        this.devices[i].vy -= fy;
        this.devices[j].vx += fx;
        this.devices[j].vy += fy;
      }
    }

    // Attraction for linked devices
    for (const link of this.links) {
      const source = this.deviceMap.get(link.source);
      const target = this.deviceMap.get(link.target);
      if (source && target) {
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        source.vx += dx * attraction;
        source.vy += dy * attraction;
        target.vx -= dx * attraction;
        target.vy -= dy * attraction;
      }
    }

    // Center gravity
    for (const device of this.devices) {
      device.vx += (centerX - device.x) * centerForce;
      device.vy += (centerY - device.y) * centerForce;
    }

    // Apply velocity and damping
    for (const device of this.devices) {
      if (device !== this.dragDevice) {
        device.vx *= damping;
        device.vy *= damping;
        device.x += device.vx;
        device.y += device.vy;
      }
      
      // Entrance animation
      if (device.scale === undefined) device.scale = 0;
      if (this.reducedMotion) {
        device.scale = 1;
      } else if (device.scale < 1) {
        device.scale += (1 - device.scale) * 0.1;
        if (device.scale > 0.99) device.scale = 1;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const reducedMotion = this.reducedMotion;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    // Clear canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#0b1016';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();

    // World-space transform: DPR -> Pan -> Zoom
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoomLevel, this.zoomLevel);

    // Grid (world space)
    const gridStep = 40;
    const worldX0 = -this.panX / this.zoomLevel;
    const worldY0 = -this.panY / this.zoomLevel;
    const worldX1 = worldX0 + width / this.zoomLevel;
    const worldY1 = worldY0 + height / this.zoomLevel;
    ctx.strokeStyle = '#202a33';
    ctx.lineWidth = 1 / this.zoomLevel;
    for (let x = Math.floor(worldX0 / gridStep) * gridStep; x < worldX1; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, worldY0); ctx.lineTo(x, worldY1); ctx.stroke();
    }
    for (let y = Math.floor(worldY0 / gridStep) * gridStep; y < worldY1; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(worldX0, y); ctx.lineTo(worldX1, y); ctx.stroke();
    }

    // Focus mode: when a device is selected (or hovered), spotlight it and
    // its direct neighbours by dimming everything else.
    const focus = this.selectedDevice || this.hoveredDevice;
    let focusIds: Set<string> | null = null;
    if (focus) {
      focusIds = new Set([focus.id]);
      for (const link of this.links) {
        if (link.source === focus.id) focusIds.add(link.target);
        if (link.target === focus.id) focusIds.add(link.source);
      }
    }

    // Links
    if (!reducedMotion) this.lineDashOffset = (this.lineDashOffset - 0.2) % 100;
    ctx.lineDashOffset = this.lineDashOffset;
    ctx.lineWidth = 2 / this.zoomLevel;
    // Port labels get unreadable and cluttered when zoomed out
    const showPortLabels = this.zoomLevel >= 0.6;
    for (const link of this.links) {
      const source = this.deviceMap.get(link.source);
      const target = this.deviceMap.get(link.target);
      if (source && target) {
        const color = LINK_COLORS[link.type] || LINK_COLORS.unknown;
        ctx.globalAlpha = !focus || link.source === focus.id || link.target === focus.id ? 1 : 0.12;
        ctx.strokeStyle = color + '80';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();

        if (showPortLabels) {
          ctx.save();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;

          // Midpoint label for ports
          const midX = (source.x + target.x) / 2;
          const midY = (source.y + target.y) / 2;
          ctx.fillStyle = color;
          ctx.font = '9px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(`${link.sourcePort}↔${link.targetPort}`, midX, midY - 5);
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Devices
    for (const device of this.devices) {
      const colors = DEVICE_COLORS[device.type] || DEVICE_COLORS.unknown;
      const isSelected = device === this.selectedDevice;
      const isHovered = device === this.hoveredDevice;
      const nodeWidth = 100;
      const nodeHeight = 50;
      const scale = device.scale || 0;

      if (scale < 0.01) continue;

      ctx.save();
      ctx.globalAlpha = !focusIds || focusIds.has(device.id) ? 1 : 0.25;
      ctx.translate(device.x, device.y);
      ctx.scale(scale, scale);

      // Glow
      if (isSelected || isHovered) {
        const pulse = (isSelected && !reducedMotion) ? Math.sin(Date.now() / 200) * 5 + 5 : 0;
        ctx.shadowColor = colors.border;
        ctx.shadowBlur = (isSelected ? 25 : 15) + pulse;
      }

      // Background
      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = isSelected ? '#ffffff' : colors.border;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(-nodeWidth / 2, -nodeHeight / 2, nodeWidth, nodeHeight, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Icon
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(colors.icon, 0, -8);

      // Name
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 10px system-ui';
      ctx.fillText(device.name.slice(0, 14), 0, 12);

      // IP if available
      if (device.ip) {
        ctx.fillStyle = colors.text + '99';
        ctx.font = '8px system-ui';
        ctx.fillText(device.ip, 0, 22);
      }
      
      ctx.restore();
    }

    ctx.restore();

    // Tooltip (screen space)
    if (this.hoveredDevice) {
      ctx.save();
      ctx.scale(dpr, dpr);
      
      const screenX = this.hoveredDevice.x * this.zoomLevel + this.panX;
      const screenY = this.hoveredDevice.y * this.zoomLevel + this.panY;
      
      const text = `${this.hoveredDevice.type.toUpperCase()}: ${this.hoveredDevice.name}`;

      ctx.font = '12px system-ui';
      const metrics = ctx.measureText(text);
      const padding = 8;
      const boxW = metrics.width + padding * 2;
      const boxH = 26;

      // Clamp inside the canvas, flipping below the device if there is no room above
      let boxX = screenX - boxW / 2;
      let boxY = screenY - 45;
      boxX = Math.max(4, Math.min(width - boxW - 4, boxX));
      if (boxY < 4) boxY = screenY + 40;
      boxY = Math.max(4, Math.min(height - boxH - 4, boxY));

      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(text, boxX + boxW / 2, boxY + 17);

      ctx.restore();
    }

    // Legend & minimap (screen space)
    this.drawLegend();
    this.drawMinimap();

    // Empty state
    if (this.devices.length === 0) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No network topology to visualize', width / 2, height / 2);
      ctx.font = '12px system-ui';
      ctx.fillText('Paste LLDP, CDP, or routing table output', width / 2, height / 2 + 20);
      ctx.restore();
    }
  }

  private drawLegend(): void {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const height = this.canvas.height / dpr;

    // Build legend from actually-present device types + link types
    const presentTypes = new Set(this.devices.map(d => d.type));
    const deviceItems = [...presentTypes].map(type => {
      const c = DEVICE_COLORS[type] || DEVICE_COLORS.unknown;
      return { color: c.border, label: type.charAt(0).toUpperCase() + type.slice(1), icon: c.icon };
    });

    const presentLinks = new Set(this.links.map(l => l.type));
    const linkItems = [...presentLinks].map(type => ({
      color: LINK_COLORS[type] || LINK_COLORS.unknown,
      label: type.charAt(0).toUpperCase() + type.slice(1),
    }));

    if (deviceItems.length === 0) return;

    const cols = 2;
    const deviceRows = Math.ceil(deviceItems.length / cols);
    const linkRows = Math.ceil(linkItems.length / cols);
    const legendH = 20 + deviceRows * 14 + (linkItems.length > 0 ? 14 + linkRows * 14 : 0) + 8;
    const legendW = 200;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172acc';
    ctx.beginPath();
    ctx.roundRect(10, height - legendH - 8, legendW, legendH, 6);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '9px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('DEVICES', 18, height - legendH + 4);

    deviceItems.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 18 + col * 95;
      const y = height - legendH + 22 + row * 14;
      ctx.font = '12px system-ui';
      ctx.fillText(item.icon, x, y);
      ctx.fillStyle = item.color;
      ctx.font = '10px system-ui';
      ctx.fillText(item.label, x + 18, y);
      ctx.fillStyle = '#64748b';
    });

    if (linkItems.length > 0) {
      const linkStartY = height - legendH + 22 + deviceRows * 14;
      ctx.font = '9px system-ui';
      ctx.fillStyle = '#64748b';
      ctx.fillText('LINKS', 18, linkStartY + 2);

      linkItems.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 18 + col * 95;
        const y = linkStartY + 16 + row * 14;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.roundRect(x, y - 8, 10, 10, 2);
        ctx.fill();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui';
        ctx.fillText(item.label, x + 14, y);
      });
    }

    ctx.restore();
  }

  private drawMinimap(): void {
    if (this.devices.length < 5) {
      this.minimapRect = null;
      return;
    }
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this.canvas.width / dpr;
    const cssH = this.canvas.height / dpr;
    const mapSize = 120;
    const mapPad = 8;
    const mapX = cssW - mapSize - 12;
    const mapY = 12;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const d of this.devices) {
      minX = Math.min(minX, d.x);
      maxX = Math.max(maxX, d.x);
      minY = Math.min(minY, d.y);
      maxY = Math.max(maxY, d.y);
    }
    const graphW = (maxX - minX) || 1;
    const graphH = (maxY - minY) || 1;
    const scale = Math.min((mapSize - mapPad * 2) / graphW, (mapSize - mapPad * 2) / graphH);

    // Remember geometry so mouse handlers can hit-test the minimap
    this.minimapRect = { x: mapX, y: mapY, size: mapSize, pad: mapPad, minX, minY, scale };

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172ae0';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, 6);
    ctx.fill();
    ctx.stroke();

    // Mini links
    for (const link of this.links) {
      const source = this.deviceMap.get(link.source);
      const target = this.deviceMap.get(link.target);
      if (!source || !target) continue;
      const x1 = mapX + mapPad + (source.x - minX) * scale;
      const y1 = mapY + mapPad + (source.y - minY) * scale;
      const x2 = mapX + mapPad + (target.x - minX) * scale;
      const y2 = mapY + mapPad + (target.y - minY) * scale;
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Mini devices
    for (const d of this.devices) {
      const nx = mapX + mapPad + (d.x - minX) * scale;
      const ny = mapY + mapPad + (d.y - minY) * scale;
      const colors = DEVICE_COLORS[d.type] || DEVICE_COLORS.unknown;
      ctx.fillStyle = d === this.selectedDevice ? '#ffffff' : colors.border;
      ctx.beginPath();
      ctx.arc(nx, ny, d === this.selectedDevice ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Viewport rectangle (clipped so it never spills outside the minimap)
    const vpX = (-this.panX / this.zoomLevel - minX) * scale + mapX + mapPad;
    const vpY = (-this.panY / this.zoomLevel - minY) * scale + mapY + mapPad;
    const vpW = (cssW / this.zoomLevel) * scale;
    const vpH = (cssH / this.zoomLevel) * scale;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(mapX, mapY, mapSize, mapSize, 6);
    ctx.clip();
    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 1;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
    ctx.restore();

    ctx.restore();
  }

  private getDeviceAt(x: number, y: number): NetworkDevice | null {
    for (let i = this.devices.length - 1; i >= 0; i--) {
      const device = this.devices[i];
      if (Math.abs(x - device.x) < 50 && Math.abs(y - device.y) < 25) return device;
    }
    return null;
  }

  private isInMinimap(sx: number, sy: number): boolean {
    const m = this.minimapRect;
    return !!m && sx >= m.x && sx <= m.x + m.size && sy >= m.y && sy <= m.y + m.size;
  }

  private navigateMinimap(sx: number, sy: number): void {
    const m = this.minimapRect;
    if (!m) return;
    // Centre the viewport on the clicked world position
    const wx = (sx - m.x - m.pad) / m.scale + m.minX;
    const wy = (sy - m.y - m.pad) / m.scale + m.minY;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.panX = this.canvas.width / dpr / 2 - wx * this.zoomLevel;
    this.panY = this.canvas.height / dpr / 2 - wy * this.zoomLevel;
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    this.didMove = false;

    if (this.isInMinimap(sx, sy)) {
      this.isMinimapDrag = true;
      this.navigateMinimap(sx, sy);
      return;
    }

    const { x, y } = this.screenToWorld(sx, sy);
    const device = this.getDeviceAt(x, y);

    if (device) {
      this.isDragging = true;
      this.dragDevice = device;
      this.dragOffsetX = x - device.x;
      this.dragOffsetY = y - device.y;
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.isPanning = true;
      this.panStartX = sx - this.panX;
      this.panStartY = sy - this.panY;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (this.isMinimapDrag) {
      this.didMove = true;
      this.navigateMinimap(sx, sy);
      return;
    }

    const { x, y } = this.screenToWorld(sx, sy);
    if (this.isDragging || this.isPanning) this.didMove = true;

    if (this.isDragging && this.dragDevice) {
      this.dragDevice.x = x - this.dragOffsetX;
      this.dragDevice.y = y - this.dragOffsetY;
      this.dragDevice.vx = 0;
      this.dragDevice.vy = 0;
    } else if (this.isPanning) {
      this.panX = sx - this.panStartX;
      this.panY = sy - this.panStartY;
    } else if (this.isInMinimap(sx, sy)) {
      this.hoveredDevice = null;
      this.canvas.style.cursor = 'pointer';
    } else {
      this.hoveredDevice = this.getDeviceAt(x, y);
      this.canvas.style.cursor = this.hoveredDevice ? 'grab' : 'default';
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.dragDevice = null;
    this.isPanning = false;
    this.isMinimapDrag = false;
    this.canvas.style.cursor = 'default';
  }

  private handleClick(e: MouseEvent): void {
    if (this.didMove) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    if (this.isInMinimap(sx, sy)) return;
    const { x, y } = this.screenToWorld(sx, sy);
    this.selectedDevice = this.getDeviceAt(x, y);
    this.updateDetails();
    if (this.selectedDevice && isSoundEnabled()) playClick();
  }

  private updateDetails(): void {
    const device = this.selectedDevice;
    if (!device) {
      this.detailsEl.innerHTML = '<div class="lab-eyebrow mb-2">Inspector</div><div class="lab-muted text-xs">Select a device to inspect its interfaces and connections.</div>';
      return;
    }

    const colors = DEVICE_COLORS[device.type] || DEVICE_COLORS.unknown;
    
    // Find connections
    const connections = this.links.filter(l => l.source === device.id || l.target === device.id);
    
    const connectionsHtml = connections.length > 0
      ? `<div class="mt-2"><div class="text-xs uppercase font-bold opacity-50">Connections</div>
         <div class="text-xs opacity-70 mt-1">${connections.map(c => {
           const other = c.source === device.id ? c.target : c.source;
           const port = c.source === device.id ? c.sourcePort : c.targetPort;
           return `${escapeHtml(port)} → ${escapeHtml(other)}`;
         }).join('<br>')}</div></div>`
      : '';

    const platformHtml = device.platform
      ? `<div class="mt-2"><div class="text-xs uppercase font-bold opacity-50">Platform</div>
         <div class="text-xs opacity-70 mt-1">${escapeHtml(device.platform)}</div></div>`
      : '';

    this.detailsEl.innerHTML = `
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Device</div>
        <div class="font-bold" style="color: ${colors.text}">${colors.icon} ${escapeHtml(device.name)}</div>
      </div>
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Type</div>
        <div class="capitalize">${escapeHtml(device.type)}</div>
      </div>
      ${device.ip ? `<div class="mb-2"><div class="text-xs uppercase font-bold opacity-50">IP Address</div><div class="font-mono text-xs">${escapeHtml(device.ip)}</div></div>` : ''}
      ${platformHtml}${connectionsHtml}
    `;
  }

  destroy(): void {
    this.layoutController.destroy();
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.motionQuery && this.motionHandler) {
      this.motionQuery.removeEventListener('change', this.motionHandler);
    }

    // Remove event listeners
    const container = this.canvas.parentElement?.parentElement;
    if (container) {
      container.querySelector('#netmap-lldp')?.removeEventListener('click', this.handlers.lldp);
      container.querySelector('#netmap-cdp')?.removeEventListener('click', this.handlers.cdp);
      container.querySelector('#netmap-routing')?.removeEventListener('click', this.handlers.routing);
      container.querySelector('#netmap-export')?.removeEventListener('click', this.handlers.export);
      container.querySelector('#netmap-fit')?.removeEventListener('click', this.handlers.fit);
    }
    this.zoomEl?.removeEventListener('click', this.handlers.zoomreset);
    
    this.textarea.removeEventListener('input', this.handlers.input);
    this.textarea.removeEventListener('scroll', this.handlers.editorscroll);
    this.textarea.removeEventListener('keydown', this.handlers.editorkeydown);

    this.canvas.removeEventListener('mousedown', this.handlers.mousedown);
    this.canvas.removeEventListener('mousemove', this.handlers.mousemove);
    this.canvas.removeEventListener('mouseup', this.handlers.mouseup);
    this.canvas.removeEventListener('mouseleave', this.handlers.mouseleave);
    this.canvas.removeEventListener('click', this.handlers.click);
    this.canvas.removeEventListener('wheel', this.handlers.wheel);

    this.canvas.removeEventListener('touchstart', this.handlers.touchstart);
    this.canvas.removeEventListener('touchmove', this.handlers.touchmove);
    this.canvas.removeEventListener('touchend', this.handlers.touchend);
    
    window.removeEventListener('keydown', this.handlers.keydown);
  }
}

// ============ Export Functions ============
let currentVisualizer: NetworkTopologyVisualizer | null = null;

export function initNetworkTopology(container: HTMLElement): void {
  if (currentVisualizer) currentVisualizer.destroy();
  currentVisualizer = new NetworkTopologyVisualizer(container);
}

export function destroyNetworkTopology(): void {
  if (currentVisualizer) {
    currentVisualizer.destroy();
    currentVisualizer = null;
  }
}
