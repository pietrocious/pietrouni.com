// Network Topology Mapper for pietrOS
// Vanilla TypeScript implementation using Canvas API
// Force-directed graph visualization for network devices

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

// ============ Sample Templates ============
const SAMPLE_LLDP = `# LLDP Neighbors - Core Switch
Device ID           Local Intf     Hold-time  Capability      Port ID
CORE-RTR-01         Gi0/1          120        R               Gi0/0
DIST-SW-01          Gi0/2          120        B               Gi1/0/24
DIST-SW-02          Gi0/3          120        B               Gi1/0/24
ACCESS-SW-01        Gi0/4          120        B               Gi1/0/1
ACCESS-SW-02        Gi0/5          120        B               Gi1/0/1
FW-01               Gi0/6          120        R               eth0
WLC-01              Gi0/7          120        R               Gi0/0/0

# LLDP Neighbors - Distribution Switch 01
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
  if (platLower.includes('air') || platLower.includes('wlc') || nameLower.includes('wlc') || nameLower.includes('ap')) return 'wireless';
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
  
  for (const line of lines) {
    // Check for local device header comments
    const headerMatch = line.match(/^#.*?[:-]\s*(.+?)(?:\s+Switch|\s+Router)?$/i);
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
      
      // Add link
      links.push({
        source: currentLocalDevice,
        target: deviceId,
        sourcePort: localIntf,
        targetPort: portId || 'unknown',
        type: 'trunk',
      });
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

function detectFormat(data: string): 'lldp' | 'cdp' | 'routing' | 'unknown' {
  if (data.includes('Device ID:') && data.includes('Platform:')) return 'cdp';
  if (data.match(/Device ID\s+Local Intf/i) || data.includes('LLDP')) return 'lldp';
  if (data.match(/^[CSORB]\s+\d+\.\d+\.\d+\.\d+/m) || data.includes('Gateway of last resort')) return 'routing';
  return 'unknown';
}

function parseTopology(data: string): ParsedTopology {
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

  private devices: NetworkDevice[] = [];
  private links: NetworkLink[] = [];
  private format: ParsedTopology['format'] = 'unknown';
  private selectedDevice: NetworkDevice | null = null;
  private hoveredDevice: NetworkDevice | null = null;
  private isDragging = false;
  private dragDevice: NetworkDevice | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private animationId: number | null = null;

  // Zoom/pan state
  private zoomLevel = 1;
  private panX = 0;
  private panY = 0;
  private isPanning = false;
  private panStartX = 0;
  private panStartY = 0;
  private zoomEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.canvas = container.querySelector('#netmap-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.textarea = container.querySelector('#netmap-code') as HTMLTextAreaElement;
    this.formatEl = container.querySelector('#netmap-format')!;
    this.countEl = container.querySelector('#netmap-count')!;
    this.errorEl = container.querySelector('#netmap-errors')!;
    this.detailsEl = container.querySelector('#netmap-details')!;

    this.zoomEl = container.querySelector('#netmap-zoom') as HTMLElement;

    // Template buttons
    container.querySelector('#netmap-lldp')?.addEventListener('click', () => this.loadTemplate('lldp'));
    container.querySelector('#netmap-cdp')?.addEventListener('click', () => this.loadTemplate('cdp'));
    container.querySelector('#netmap-routing')?.addEventListener('click', () => this.loadTemplate('routing'));

    // Export PNG
    container.querySelector('#netmap-export')?.addEventListener('click', () => this.exportPNG());

    // Code input
    this.textarea.addEventListener('input', () => this.parseAndRender());

    // Canvas interactions
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Initialize
    this.textarea.value = SAMPLE_LLDP;
    this.parseAndRender();
    this.startAnimation();
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
    this.panX = mx - (mx - this.panX) * (newZoom / this.zoomLevel);
    this.panY = my - (my - this.panY) * (newZoom / this.zoomLevel);
    this.zoomLevel = newZoom;
    if (this.zoomEl) this.zoomEl.textContent = `${Math.round(this.zoomLevel * 100)}%`;
  }

  private exportPNG(): void {
    const link = document.createElement('a');
    link.download = 'network-topology.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
  }

  private loadTemplate(type: 'lldp' | 'cdp' | 'routing'): void {
    switch (type) {
      case 'lldp': this.textarea.value = SAMPLE_LLDP; break;
      case 'cdp': this.textarea.value = SAMPLE_CDP; break;
      case 'routing': this.textarea.value = SAMPLE_ROUTING; break;
    }
    this.selectedDevice = null;
    this.parseAndRender();
  }

  private parseAndRender(): void {
    const data = this.textarea.value;
    const parsed = parseTopology(data);
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

    // Initialize device positions in a circle
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    this.devices.forEach((device, i) => {
      const angle = (i / this.devices.length) * Math.PI * 2;
      const radius = 120 + Math.random() * 60;
      device.x = centerX + Math.cos(angle) * radius;
      device.y = centerY + Math.sin(angle) * radius;
    });

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
    const worldW = this.canvas.width / this.zoomLevel;
    const worldH = this.canvas.height / this.zoomLevel;
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
      const source = this.devices.find(d => d.id === link.source);
      const target = this.devices.find(d => d.id === link.target);
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
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoomLevel, this.zoomLevel);

    // Grid (world space)
    const gridStep = 40;
    const worldX0 = -this.panX / this.zoomLevel;
    const worldY0 = -this.panY / this.zoomLevel;
    const worldX1 = worldX0 + this.canvas.width / this.zoomLevel;
    const worldY1 = worldY0 + this.canvas.height / this.zoomLevel;
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1 / this.zoomLevel;
    for (let x = Math.floor(worldX0 / gridStep) * gridStep; x < worldX1; x += gridStep) {
      ctx.beginPath(); ctx.moveTo(x, worldY0); ctx.lineTo(x, worldY1); ctx.stroke();
    }
    for (let y = Math.floor(worldY0 / gridStep) * gridStep; y < worldY1; y += gridStep) {
      ctx.beginPath(); ctx.moveTo(worldX0, y); ctx.lineTo(worldX1, y); ctx.stroke();
    }

    // Links
    ctx.lineWidth = 2 / this.zoomLevel;
    for (const link of this.links) {
      const source = this.devices.find(d => d.id === link.source);
      const target = this.devices.find(d => d.id === link.target);
      if (source && target) {
        const color = LINK_COLORS[link.type] || LINK_COLORS.unknown;
        ctx.strokeStyle = color + '80';
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Midpoint label for ports
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        ctx.fillStyle = color;
        ctx.font = '9px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`${link.sourcePort}↔${link.targetPort}`, midX, midY - 5);
      }
    }

    // Devices
    for (const device of this.devices) {
      const colors = DEVICE_COLORS[device.type] || DEVICE_COLORS.unknown;
      const isSelected = device === this.selectedDevice;
      const isHovered = device === this.hoveredDevice;
      const nodeWidth = 100;
      const nodeHeight = 50;

      // Glow
      if (isSelected || isHovered) {
        ctx.shadowColor = colors.border;
        ctx.shadowBlur = isSelected ? 25 : 15;
      }

      // Background
      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = isSelected ? '#ffffff' : colors.border;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(device.x - nodeWidth / 2, device.y - nodeHeight / 2, nodeWidth, nodeHeight, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Icon
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(colors.icon, device.x, device.y - 8);

      // Name
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 10px system-ui';
      ctx.fillText(device.name.slice(0, 14), device.x, device.y + 12);

      // IP if available
      if (device.ip) {
        ctx.fillStyle = colors.text + '99';
        ctx.font = '8px system-ui';
        ctx.fillText(device.ip, device.x, device.y + 22);
      }
    }

    ctx.restore();

    // Legend (screen space)
    this.drawLegend();

    // Empty state
    if (this.devices.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No network topology to visualize', this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = '12px system-ui';
      ctx.fillText('Paste LLDP, CDP, or routing table output', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
  }

  private drawLegend(): void {
    const ctx = this.ctx;
    const items = [
      { color: DEVICE_COLORS.router.border, label: 'Router', icon: '🌐' },
      { color: DEVICE_COLORS.switch.border, label: 'Switch', icon: '🔀' },
      { color: DEVICE_COLORS.firewall.border, label: 'Firewall', icon: '🛡️' },
      { color: DEVICE_COLORS.server.border, label: 'Server', icon: '🖥️' },
    ];

    ctx.fillStyle = '#0f172acc';
    ctx.fillRect(10, this.canvas.height - 60, 200, 50);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, this.canvas.height - 60, 200, 50);

    ctx.font = '9px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('DEVICE TYPES', 18, this.canvas.height - 45);

    items.forEach((item, i) => {
      const x = 18 + (i % 2) * 95;
      const y = this.canvas.height - 28 + Math.floor(i / 2) * 14;
      ctx.font = '12px system-ui';
      ctx.fillText(item.icon, x, y);
      ctx.fillStyle = item.color;
      ctx.font = '10px system-ui';
      ctx.fillText(item.label, x + 18, y);
      ctx.fillStyle = '#64748b';
    });
  }

  private getDeviceAt(x: number, y: number): NetworkDevice | null {
    for (let i = this.devices.length - 1; i >= 0; i--) {
      const device = this.devices[i];
      if (Math.abs(x - device.x) < 50 && Math.abs(y - device.y) < 25) return device;
    }
    return null;
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
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
    const { x, y } = this.screenToWorld(sx, sy);

    if (this.isDragging && this.dragDevice) {
      this.dragDevice.x = x - this.dragOffsetX;
      this.dragDevice.y = y - this.dragOffsetY;
      this.dragDevice.vx = 0;
      this.dragDevice.vy = 0;
    } else if (this.isPanning) {
      this.panX = sx - this.panStartX;
      this.panY = sy - this.panStartY;
    } else {
      this.hoveredDevice = this.getDeviceAt(x, y);
      this.canvas.style.cursor = this.hoveredDevice ? 'grab' : 'default';
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.dragDevice = null;
    this.isPanning = false;
    this.canvas.style.cursor = 'default';
  }

  private handleClick(e: MouseEvent): void {
    if (this.isDragging || this.isPanning) return;
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x, y } = this.screenToWorld(sx, sy);
    this.selectedDevice = this.getDeviceAt(x, y);
    this.updateDetails();
  }

  private updateDetails(): void {
    const device = this.selectedDevice;
    if (!device) {
      this.detailsEl.innerHTML = '<div class="text-xs opacity-50">Click a device to view details</div>';
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
           return `${port} → ${other}`;
         }).join('<br>')}</div></div>`
      : '';

    const platformHtml = device.platform
      ? `<div class="mt-2"><div class="text-xs uppercase font-bold opacity-50">Platform</div>
         <div class="text-xs opacity-70 mt-1">${device.platform}</div></div>`
      : '';

    this.detailsEl.innerHTML = `
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Device</div>
        <div class="font-bold" style="color: ${colors.text}">${colors.icon} ${device.name}</div>
      </div>
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Type</div>
        <div class="capitalize">${device.type}</div>
      </div>
      ${device.ip ? `<div class="mb-2"><div class="text-xs uppercase font-bold opacity-50">IP Address</div><div class="font-mono text-xs">${device.ip}</div></div>` : ''}
      ${platformHtml}${connectionsHtml}
    `;
  }

  destroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
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
