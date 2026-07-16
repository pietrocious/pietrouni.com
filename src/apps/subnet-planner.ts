// Subnet Planner (VLSM Studio) for pietrOS
// Vanilla TypeScript implementation using Canvas API
// Interactive icicle-chart visualizer for IPv4 address space: manual split/join
// or automatic VLSM allocation from a list of host requirements.

import { playClick, playNotification, isSoundEnabled } from '../audio';
import { LabLayoutController } from './lab-layout';

// ============ Types ============
export type SubnetTag = 'lan' | 'guest' | 'voice' | 'server' | 'dmz' | 'mgmt' | 'wan' | 'storage';

export interface PlannerNode {
  id: string;
  base: number;
  prefix: number;
  label: string | null;
  tag: SubnetTag | null;
  left: PlannerNode | null;
  right: PlannerNode | null;
}

export interface PlanRequest {
  name: string;
  hosts: number;
  tag: SubnetTag;
}

export interface ParsedPlanInput {
  base: { base: number; prefix: number } | null;
  requests: PlanRequest[];
  errors: string[];
}

export interface BlockStats {
  cidr: string;
  network: string;
  broadcast: string;
  netmask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  totalAddresses: number;
  usableHosts: number;
}

// ============ IPv4 Arithmetic ============
export function ipToInt(ip: string): number {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return NaN;
  let n = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return NaN;
    const v = Number(part);
    if (v < 0 || v > 255) return NaN;
    n = n * 256 + v;
  }
  return n;
}

export function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function isValidIp(ip: string): boolean {
  return !Number.isNaN(ipToInt(ip));
}

function maskForPrefix(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xFFFFFFFF >>> 0;
  return (0xFFFFFFFF << (32 - prefix)) >>> 0;
}

export function addressCount(prefix: number): number {
  return 2 ** (32 - Math.max(0, Math.min(32, prefix)));
}

export function netmaskFromPrefix(prefix: number): string {
  return intToIp(maskForPrefix(prefix));
}

export function wildcardFromPrefix(prefix: number): string {
  return intToIp((~maskForPrefix(prefix)) >>> 0);
}

export function cidrString(base: number, prefix: number): string {
  return `${intToIp(base)}/${prefix}`;
}

export function parseCIDR(text: string): { base: number; prefix: number } | null {
  const match = text.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!match) return null;
  const ip = ipToInt(match[1]);
  const prefix = Number(match[2]);
  if (Number.isNaN(ip) || prefix < 0 || prefix > 32) return null;
  return { base: (ip & maskForPrefix(prefix)) >>> 0, prefix };
}

export function blockStats(base: number, prefix: number): BlockStats {
  const total = addressCount(prefix);
  const broadcast = (base + total - 1) >>> 0;
  const isPointToPoint = prefix >= 31;
  const usable = isPointToPoint ? total : total - 2;
  const firstHost = isPointToPoint ? base : base + 1;
  const lastHost = isPointToPoint ? broadcast : broadcast - 1;
  return {
    cidr: cidrString(base, prefix),
    network: intToIp(base),
    broadcast: intToIp(broadcast),
    netmask: netmaskFromPrefix(prefix),
    wildcard: wildcardFromPrefix(prefix),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    totalAddresses: total,
    usableHosts: usable,
  };
}

export function prefixForHosts(hosts: number): number {
  const need = Math.max(1, Math.ceil(hosts));
  for (let p = 32; p >= 0; p--) {
    const size = addressCount(p);
    const usable = p >= 31 ? size : size - 2;
    if (usable >= need) return p;
  }
  return 0;
}

// ============ Planner Tree ============
export function createRoot(base: number, prefix: number): PlannerNode {
  return { id: cidrString(base, prefix), base, prefix, label: null, tag: null, left: null, right: null };
}

export function isLeaf(node: PlannerNode): boolean {
  return node.left === null && node.right === null;
}

export function splitNode(node: PlannerNode): boolean {
  if (!isLeaf(node) || node.prefix >= 32) return false;
  const childPrefix = node.prefix + 1;
  const half = addressCount(childPrefix);
  node.left = { id: cidrString(node.base, childPrefix), base: node.base, prefix: childPrefix, label: null, tag: null, left: null, right: null };
  node.right = { id: cidrString(node.base + half, childPrefix), base: node.base + half, prefix: childPrefix, label: null, tag: null, left: null, right: null };
  node.label = null;
  node.tag = null;
  return true;
}

export function joinNode(node: PlannerNode): boolean {
  if (!node.left || !node.right) return false;
  if (!isLeaf(node.left) || !isLeaf(node.right)) return false;
  node.left = null;
  node.right = null;
  node.label = null;
  node.tag = null;
  return true;
}

export function collectLeaves(node: PlannerNode, out: PlannerNode[] = []): PlannerNode[] {
  if (isLeaf(node)) {
    out.push(node);
    return out;
  }
  if (node.left) collectLeaves(node.left, out);
  if (node.right) collectLeaves(node.right, out);
  return out;
}

function findBestFitLeaf(root: PlannerNode, neededPrefix: number): PlannerNode | null {
  const candidates = collectLeaves(root).filter(n => !n.label && n.prefix <= neededPrefix);
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.prefix - a.prefix);
  return candidates[0];
}

export function planVLSM(base: { base: number; prefix: number }, requests: PlanRequest[]): { root: PlannerNode; errors: string[] } {
  const root = createRoot(base.base, base.prefix);
  const errors: string[] = [];
  const sorted = [...requests].sort((a, b) => b.hosts - a.hosts);
  for (const req of sorted) {
    const neededPrefix = prefixForHosts(req.hosts);
    if (neededPrefix < base.prefix) {
      errors.push(`"${req.name}" needs a /${neededPrefix}, larger than the entire ${cidrString(base.base, base.prefix)} plan`);
      continue;
    }
    let node = findBestFitLeaf(root, neededPrefix);
    if (!node) {
      errors.push(`"${req.name}" needs /${neededPrefix} but no free space is left for ${req.hosts} hosts`);
      continue;
    }
    while (node.prefix < neededPrefix) {
      splitNode(node);
      node = node.left!;
    }
    node.label = req.name;
    node.tag = req.tag;
  }
  return { root, errors };
}

// ============ Text Plan Parsing ============
const TAG_KEYWORDS: [RegExp, SubnetTag][] = [
  [/guest/i, 'guest'],
  [/voice|voip|phone/i, 'voice'],
  [/dmz|public/i, 'dmz'],
  [/mgmt|management|bastion|admin/i, 'mgmt'],
  [/wan|point-to-point|p2p|transit|uplink/i, 'wan'],
  [/storage|\bdata\b|\bdb\b|database|san|nas/i, 'storage'],
  [/server|compute/i, 'server'],
];

export function inferTag(name: string): SubnetTag {
  for (const [re, tag] of TAG_KEYWORDS) {
    if (re.test(name)) return tag;
  }
  return 'lan';
}

function meaningfulLines(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));
}

export function detectPlanMode(text: string): 'manual' | 'vlsm' | 'unknown' {
  const lines = meaningfulLines(text);
  if (lines.length === 0 || !parseCIDR(lines[0])) return 'unknown';
  return lines.length > 1 ? 'vlsm' : 'manual';
}

export function parsePlanInput(text: string): ParsedPlanInput {
  const lines = meaningfulLines(text);
  if (lines.length === 0) return { base: null, requests: [], errors: ['Enter a base network, e.g. 10.0.0.0/16'] };
  const base = parseCIDR(lines[0]);
  if (!base) return { base: null, requests: [], errors: [`"${lines[0]}" is not a valid CIDR block (expected e.g. 10.0.0.0/16)`] };

  const requests: PlanRequest[] = [];
  const errors: string[] = [];
  for (const line of lines.slice(1)) {
    const match = line.match(/^(.+?)\s+(\d+)\s*$/);
    if (!match) {
      errors.push(`Could not parse "${line}" — expected "name hosts"`);
      continue;
    }
    const name = match[1].trim();
    const hosts = Number(match[2]);
    if (hosts <= 0) {
      errors.push(`"${name}": host count must be greater than 0`);
      continue;
    }
    requests.push({ name, hosts, tag: inferTag(name) });
  }
  return { base, requests, errors };
}

// ============ Visual Palette ============
const TAG_COLORS: Record<SubnetTag, { bg: string; border: string; text: string }> = {
  lan: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  guest: { bg: '#3d2a1f', border: '#f97316', text: '#fdba74' },
  voice: { bg: '#3b2d4d', border: '#a855f7', text: '#d8b4fe' },
  server: { bg: '#2d3b2d', border: '#22c55e', text: '#86efac' },
  dmz: { bg: '#4a2c2a', border: '#ef4444', text: '#fca5a5' },
  mgmt: { bg: '#3d3d2a', border: '#eab308', text: '#fde047' },
  wan: { bg: '#2a3d4d', border: '#06b6d4', text: '#67e8f9' },
  storage: { bg: '#2a2a3d', border: '#818cf8', text: '#c7d2fe' },
};
const TAG_LABELS: Record<SubnetTag, string> = {
  lan: 'LAN', guest: 'Guest', voice: 'Voice', server: 'Server',
  dmz: 'DMZ / Public', mgmt: 'Management', wan: 'WAN / P2P', storage: 'Storage',
};
const FREE_COLORS = { bg: '#141c26', border: '#33465a', text: '#7d97ad' };
const MIN_LEAF_WIDTH = 64;

// ============ HTML Escaping & Highlighting ============
function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

function highlightPlan(data: string): string {
  const tokens = /(#.*|\b(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}\b|\b(?:\d{1,3}\.){3}\d{1,3}\b|\b\d+\b)/g;
  return data.split('\n').map(line => {
    let html = '';
    let cursor = 0;
    for (const match of line.matchAll(tokens)) {
      const token = match[0];
      const index = match.index ?? 0;
      html += escapeHtml(line.slice(cursor, index));
      let className = 'iac-token-string';
      if (token.startsWith('#')) className = 'iac-token-comment';
      else if (/^\d+$/.test(token)) className = 'iac-token-number';
      html += `<span class="${className}">${escapeHtml(token)}</span>`;
      cursor = index + token.length;
    }
    return html + escapeHtml(line.slice(cursor));
  }).join('\n');
}

// ============ Sample Templates ============
const SAMPLE_MANUAL = `# Manual planning canvas — click the block below to split, name, and tag it.
10.0.0.0/16`;

const SAMPLE_VLSM = `# VLSM address plan — one line per subnet: "name" then host count.
# The planner sorts by size and best-fits each request (largest first).
10.0.0.0/16
Engineering            500
Sales                  220
Guest-WiFi               60
Voice                    40
Servers                  20
Point-to-Point-WAN        2`;

const SAMPLE_VPC = `# Cloud VPC carve-up — three-tier design across two availability zones.
10.20.0.0/16
Public-AZ1-Web          250
Public-AZ2-Web          250
Private-AZ1-App         500
Private-AZ2-App         500
Data-AZ1-DB             100
Data-AZ2-DB             100
Mgmt-Bastion              10`;

// ============ Layout ============
interface LayoutBox {
  node: PlannerNode;
  x: number;
  y: number;
  w: number;
  h: number;
  isLeafRow: boolean;
}

// ============ Subnet Planner Controller ============
export class SubnetPlannerController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private textarea: HTMLTextAreaElement;
  private modeEl: HTMLElement;
  private countEl: HTMLElement;
  private errorEl: HTMLElement;
  private detailsEl: HTMLElement;
  private highlightEl: HTMLElement;
  private lineNumbersEl: HTMLElement;
  private filenameEl: HTMLElement;
  private layoutController: LabLayoutController;

  private root: PlannerNode;
  private selected: PlannerNode | null = null;
  private hovered: PlannerNode | null = null;
  private layoutBoxes: LayoutBox[] = [];
  private resizeObserver: ResizeObserver | null = null;

  private handlers: { [key: string]: (e: any) => void } = {};

  constructor(container: HTMLElement) {
    this.canvas = container.querySelector('#subnet-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.textarea = container.querySelector('#subnet-code') as HTMLTextAreaElement;
    this.modeEl = container.querySelector('#subnet-mode')!;
    this.countEl = container.querySelector('#subnet-count')!;
    this.errorEl = container.querySelector('#subnet-errors')!;
    this.detailsEl = container.querySelector('#subnet-details')!;
    this.highlightEl = container.querySelector('#subnet-highlight code')!;
    this.lineNumbersEl = container.querySelector('#subnet-line-numbers')!;
    this.filenameEl = container.querySelector('#subnet-filename')!;
    this.layoutController = new LabLayoutController(container);

    this.root = createRoot(0x0A000000, 16);

    this.handlers = {
      input: this.handleInput.bind(this),
      editorscroll: this.syncEditorScroll.bind(this),
      editorkeydown: this.handleEditorKeyDown.bind(this),
      manual: () => this.loadTemplate('manual'),
      vlsm: () => this.loadTemplate('vlsm'),
      vpc: () => this.loadTemplate('vpc'),
      exportpng: () => this.exportPNG(),
      exportcsv: () => this.exportCSV(),
      click: this.handleClick.bind(this),
      mousemove: this.handleMouseMove.bind(this),
      mouseleave: this.handleMouseLeave.bind(this),
      keydown: this.handleKeyDown.bind(this),
    };

    container.querySelector('#subnet-manual')?.addEventListener('click', this.handlers.manual);
    container.querySelector('#subnet-vlsm')?.addEventListener('click', this.handlers.vlsm);
    container.querySelector('#subnet-vpc')?.addEventListener('click', this.handlers.vpc);
    container.querySelector('#subnet-export-png')?.addEventListener('click', this.handlers.exportpng);
    container.querySelector('#subnet-export-csv')?.addEventListener('click', this.handlers.exportcsv);

    this.textarea.addEventListener('input', this.handlers.input);
    this.textarea.addEventListener('scroll', this.handlers.editorscroll);
    this.textarea.addEventListener('keydown', this.handlers.editorkeydown);

    this.canvas.addEventListener('click', this.handlers.click);
    this.canvas.addEventListener('mousemove', this.handlers.mousemove);
    this.canvas.addEventListener('mouseleave', this.handlers.mouseleave);

    window.addEventListener('keydown', this.handlers.keydown);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container.parentElement || container);
    this.resize();

    this.textarea.value = SAMPLE_VLSM;
    this.setTemplateActive('vlsm');
    this.updateEditorPresentation();
    this.parseAndRender();
  }

  private dpr(): number {
    return Math.min(window.devicePixelRatio || 1, 2);
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const dpr = this.dpr();
    const rect = parent.getBoundingClientRect();
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.draw();
  }

  private handleInput(): void {
    this.updateEditorPresentation();
    this.parseAndRender();
  }

  private updateEditorPresentation(): void {
    const data = this.textarea.value;
    this.highlightEl.innerHTML = highlightPlan(data) + (data.endsWith('\n') ? '\n ' : '');
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

  private loadTemplate(type: 'manual' | 'vlsm' | 'vpc'): void {
    switch (type) {
      case 'manual': this.textarea.value = SAMPLE_MANUAL; break;
      case 'vlsm': this.textarea.value = SAMPLE_VLSM; break;
      case 'vpc': this.textarea.value = SAMPLE_VPC; break;
    }
    this.setTemplateActive(type);
    this.updateEditorPresentation();
    this.parseAndRender();
    if (isSoundEnabled()) playClick();
  }

  private setTemplateActive(type: 'manual' | 'vlsm' | 'vpc'): void {
    const root = this.textarea.closest('#subnet-app');
    for (const option of ['manual', 'vlsm', 'vpc'] as const) {
      const button = root?.querySelector<HTMLElement>(`#subnet-${option}`);
      button?.setAttribute('data-active', String(option === type));
      button?.setAttribute('aria-pressed', String(option === type));
    }
    this.filenameEl.textContent = type === 'manual' ? 'manual-plan.txt' : type === 'vlsm' ? 'vlsm-plan.txt' : 'vpc-plan.txt';
  }

  private parseAndRender(): void {
    const text = this.textarea.value;
    const mode = detectPlanMode(text);
    const parsed = parsePlanInput(text);
    const errors = [...parsed.errors];

    if (!parsed.base) {
      this.modeEl.textContent = 'Invalid input';
      this.countEl.textContent = '0 blocks';
      this.errorEl.textContent = errors.join(' · ') || 'Enter a base network.';
      this.errorEl.classList.remove('hidden');
      this.selected = null;
      this.hovered = null;
      this.updateInspector();
      return;
    }

    if (mode === 'vlsm') {
      const result = planVLSM(parsed.base, parsed.requests);
      this.root = result.root;
      errors.push(...result.errors);
      this.modeEl.textContent = `VLSM · ${parsed.requests.length} requested`;
    } else {
      this.root = createRoot(parsed.base.base, parsed.base.prefix);
      this.modeEl.textContent = 'Manual planning';
    }

    this.selected = null;
    this.hovered = null;

    if (errors.length > 0) {
      this.errorEl.textContent = errors.join(' · ');
      this.errorEl.classList.remove('hidden');
    } else {
      this.errorEl.classList.add('hidden');
    }

    const leaves = collectLeaves(this.root);
    const allocated = leaves.filter(l => l.label).length;
    this.countEl.textContent = `${leaves.length} block${leaves.length === 1 ? '' : 's'}, ${allocated} allocated`;

    this.updateInspector();
    this.draw();
  }

  // ============ Layout ============
  private allocateWidths(weights: number[], total: number, minWidth: number): number[] {
    const n = weights.length;
    if (n === 0) return [];
    const widths = new Array(n).fill(0);
    const active = new Set(weights.map((_, i) => i));
    let available = total;
    let changed = true;
    while (changed && active.size > 0) {
      changed = false;
      const activeWeight = [...active].reduce((s, i) => s + weights[i], 0) || 1;
      for (const i of [...active]) {
        const share = (weights[i] / activeWeight) * available;
        if (share < minWidth && active.size > 1) {
          widths[i] = minWidth;
          available -= minWidth;
          active.delete(i);
          changed = true;
        }
      }
    }
    const activeWeight = [...active].reduce((s, i) => s + weights[i], 0) || 1;
    for (const i of active) widths[i] = (weights[i] / activeWeight) * available;
    return widths;
  }

  private computeLayout(width: number, height: number): void {
    this.layoutBoxes = [];
    const leaves = collectLeaves(this.root);
    if (leaves.length === 0) return;

    const maxDepth = leaves.reduce((m, l) => Math.max(m, l.prefix - this.root.prefix), 0);
    const rowHeight = Math.max(28, Math.min(56, height / (maxDepth + 1)));

    const weights = leaves.map(l => addressCount(l.prefix));
    const minWidth = Math.min(MIN_LEAF_WIDTH, width / leaves.length);
    const widths = this.allocateWidths(weights, width, minWidth);

    const leafX = new Map<PlannerNode, number>();
    const leafW = new Map<PlannerNode, number>();
    let cursor = 0;
    leaves.forEach((leaf, i) => {
      leafX.set(leaf, cursor);
      leafW.set(leaf, widths[i]);
      cursor += widths[i];
    });

    const boxFor = (node: PlannerNode): { x: number; w: number } => {
      if (isLeaf(node)) return { x: leafX.get(node)!, w: leafW.get(node)! };
      const l = boxFor(node.left!);
      const r = boxFor(node.right!);
      return { x: l.x, w: l.w + r.w };
    };

    const place = (node: PlannerNode, depth: number) => {
      const y = depth * rowHeight;
      const { x, w } = boxFor(node);
      if (isLeaf(node)) {
        const h = Math.max(0, height - y);
        if (h > 0) this.layoutBoxes.push({ node, x, y, w, h, isLeafRow: true });
        return;
      }
      this.layoutBoxes.push({ node, x, y, w, h: rowHeight, isLeafRow: false });
      if (node.left) place(node.left, depth + 1);
      if (node.right) place(node.right, depth + 1);
    };
    place(this.root, 0);
  }

  private nodeAt(x: number, y: number): PlannerNode | null {
    for (const box of this.layoutBoxes) {
      if (x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h) return box.node;
    }
    return null;
  }

  // ============ Rendering ============
  private truncateText(text: string, maxWidth: number): string {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let result = text;
    while (result.length > 1 && ctx.measureText(result + '…').width > maxWidth) {
      result = result.slice(0, -1);
    }
    return result + '…';
  }

  private drawBox(box: LayoutBox): void {
    const ctx = this.ctx;
    const { node, x, y, w, h, isLeafRow } = box;
    const pad = 1.5;
    const rx = x + pad, ry = y + pad, rw = Math.max(0, w - pad * 2), rh = Math.max(0, h - pad * 2);
    if (rw <= 0 || rh <= 0) return;

    const isSelected = node === this.selected;
    const isHovered = node === this.hovered && !isSelected;

    if (!isLeafRow) {
      ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.12)' : isHovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.035)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.14)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      ctx.strokeRect(rx + 0.5, ry + 0.5, Math.max(0, rw - 1), Math.max(0, rh - 1));
      if (rw > 46) {
        ctx.fillStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.55)';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.truncateText(cidrString(node.base, node.prefix), rw - 12), rx + 8, ry + rh / 2);
      }
      return;
    }

    const allocated = !!node.label;
    const colors = allocated ? TAG_COLORS[node.tag || 'lan'] : FREE_COLORS;
    ctx.fillStyle = colors.bg;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = isSelected ? '#ffffff' : colors.border;
    ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.9 : 0.55;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(rx + 1, ry + 1, Math.max(0, rw - 2), Math.max(0, rh - 2));
    ctx.globalAlpha = 1;

    if (rw > 50 && rh > 22) {
      ctx.textBaseline = 'top';
      let ly = ry + 9;
      if (allocated) {
        ctx.font = '700 12px "DM Sans", sans-serif';
        ctx.fillStyle = colors.text;
        ctx.fillText(this.truncateText(node.label!, rw - 16), rx + 10, ly);
        ly += 17;
      }
      if (rh > ly - ry + 6) {
        ctx.font = '500 10.5px "JetBrains Mono", monospace';
        ctx.fillStyle = allocated ? 'rgba(255,255,255,0.65)' : colors.text;
        ctx.fillText(this.truncateText(cidrString(node.base, node.prefix), rw - 16), rx + 10, ly);
        ly += 15;
      }
      if (rh > ly - ry + 6) {
        const stats = blockStats(node.base, node.prefix);
        ctx.font = '400 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.fillText(`${stats.usableHosts} usable`, rx + 10, ly);
      }
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const dpr = this.dpr();
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    if (width <= 0 || height <= 0) return;

    this.computeLayout(width, height);
    // Internal (split) headers first, then leaves, so leaf borders read cleanly on top.
    for (const box of this.layoutBoxes) if (!box.isLeafRow) this.drawBox(box);
    for (const box of this.layoutBoxes) if (box.isLeafRow) this.drawBox(box);
  }

  // ============ Interaction ============
  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this.nodeAt(x, y);
    this.selected = node;
    this.updateInspector();
    this.draw();
    if (node && isSoundEnabled()) playClick();
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this.nodeAt(x, y);
    if (node !== this.hovered) {
      this.hovered = node;
      this.canvas.style.cursor = node ? 'pointer' : 'default';
      this.draw();
    }
  }

  private handleMouseLeave(): void {
    if (this.hovered) {
      this.hovered = null;
      this.draw();
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement | null;
    if (target === this.textarea) return;
    if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

    if (e.key === 'Escape') {
      this.selected = null;
      this.updateInspector();
      this.draw();
      return;
    }
    if (!this.selected) return;
    if ((e.key === 's' || e.key === 'S') && isLeaf(this.selected) && this.selected.prefix < 30) {
      this.doSplit(this.selected);
    } else if ((e.key === 'j' || e.key === 'J') && !isLeaf(this.selected)) {
      this.doJoin(this.selected);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && isLeaf(this.selected) && this.selected.label) {
      this.doClear(this.selected);
    }
  }

  // ============ Structural Actions ============
  private doSplit(node: PlannerNode): void {
    if (!splitNode(node)) return;
    this.updateInspector();
    this.refreshStatus();
    this.draw();
    if (isSoundEnabled()) playClick();
  }

  private doJoin(node: PlannerNode): void {
    if (!joinNode(node)) return;
    this.selected = node;
    this.updateInspector();
    this.refreshStatus();
    this.draw();
    if (isSoundEnabled()) playClick();
  }

  private doClear(node: PlannerNode): void {
    node.label = null;
    node.tag = null;
    this.updateInspector();
    this.refreshStatus();
    this.draw();
  }

  private doAllocate(node: PlannerNode): void {
    const nameInput = this.detailsEl.querySelector<HTMLInputElement>('#subnet-inp-name');
    const tagSelect = this.detailsEl.querySelector<HTMLSelectElement>('#subnet-sel-tag');
    const name = nameInput?.value.trim();
    if (!name) {
      nameInput?.focus();
      return;
    }
    node.label = name;
    node.tag = (tagSelect?.value as SubnetTag) || 'lan';
    this.updateInspector();
    this.refreshStatus();
    this.draw();
    if (isSoundEnabled()) playNotification();
  }

  private refreshStatus(): void {
    const leaves = collectLeaves(this.root);
    const allocated = leaves.filter(l => l.label).length;
    this.countEl.textContent = `${leaves.length} block${leaves.length === 1 ? '' : 's'}, ${allocated} allocated`;
  }

  // ============ Inspector ============
  private updateInspector(): void {
    const node = this.selected;
    if (!node) {
      this.renderSummaryInspector();
      return;
    }
    if (isLeaf(node)) {
      this.renderLeafInspector(node);
    } else {
      this.renderInternalInspector(node);
    }
  }

  private renderSummaryInspector(): void {
    const leaves = collectLeaves(this.root);
    const allocated = leaves.filter(l => l.label);
    const free = leaves.filter(l => !l.label);
    const usedAddresses = allocated.reduce((s, l) => s + addressCount(l.prefix), 0);
    const totalAddresses = addressCount(this.root.prefix);
    const utilization = totalAddresses > 0 ? ((usedAddresses / totalAddresses) * 100).toFixed(1) : '0.0';

    const legend = (Object.keys(TAG_COLORS) as SubnetTag[])
      .map(tag => `<span class="inline-flex items-center gap-1 text-[10px] opacity-70 mr-2 mb-1"><span class="w-2 h-2 rounded-full inline-block" style="background:${TAG_COLORS[tag].border}"></span>${TAG_LABELS[tag]}</span>`)
      .join('');

    const rows = allocated.length > 0
      ? `<div class="space-y-1 max-h-32 overflow-y-auto pr-1">${allocated.map(l => `
          <div class="flex items-center justify-between gap-2 text-xs">
            <span class="flex items-center gap-1.5 truncate"><span class="w-2 h-2 rounded-full inline-block flex-shrink-0" style="background:${TAG_COLORS[l.tag || 'lan'].border}"></span>${escapeHtml(l.label)}</span>
            <span class="font-mono opacity-60 flex-shrink-0">${cidrString(l.base, l.prefix)}</span>
          </div>`).join('')}</div>`
      : '<div class="lab-muted text-xs">Click a free block to split or allocate it.</div>';

    this.detailsEl.innerHTML = `
      <div class="mb-2">
        <div class="lab-eyebrow mb-1">Plan summary</div>
        <div class="text-xs opacity-70">${cidrString(this.root.base, this.root.prefix)} · ${allocated.length} allocated · ${free.length} free · ${utilization}% used</div>
      </div>
      <div class="mb-2">${rows}</div>
      <div class="flex flex-wrap">${legend}</div>
    `;
  }

  private renderLeafInspector(node: PlannerNode): void {
    const stats = blockStats(node.base, node.prefix);
    const allocated = !!node.label;
    const canSplit = node.prefix < 30;

    const statsHtml = `
      <div class="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3">
        <div><div class="text-[10px] uppercase font-bold opacity-50">Network</div><div class="font-mono">${stats.network}</div></div>
        <div><div class="text-[10px] uppercase font-bold opacity-50">Broadcast</div><div class="font-mono">${stats.broadcast}</div></div>
        <div><div class="text-[10px] uppercase font-bold opacity-50">Netmask</div><div class="font-mono">${stats.netmask}</div></div>
        <div><div class="text-[10px] uppercase font-bold opacity-50">Wildcard</div><div class="font-mono">${stats.wildcard}</div></div>
        <div><div class="text-[10px] uppercase font-bold opacity-50">Host range</div><div class="font-mono">${stats.firstHost} – ${stats.lastHost}</div></div>
        <div><div class="text-[10px] uppercase font-bold opacity-50">Usable / total</div><div class="font-mono">${stats.usableHosts} / ${stats.totalAddresses}</div></div>
      </div>`;

    const tagOptions = (Object.keys(TAG_LABELS) as SubnetTag[])
      .map(tag => `<option value="${tag}" ${node.tag === tag ? 'selected' : ''}>${TAG_LABELS[tag]}</option>`).join('');

    const editHtml = allocated
      ? `
        <div class="mb-2">
          <label class="text-[10px] uppercase font-bold opacity-50 block mb-1">Name</label>
          <input id="subnet-inp-name" type="text" value="${escapeHtml(node.label)}" class="lab-action w-full text-xs px-2 py-1.5 rounded-md" />
        </div>
        <div class="mb-3">
          <label class="text-[10px] uppercase font-bold opacity-50 block mb-1">Tag</label>
          <select id="subnet-sel-tag" class="lab-action w-full text-xs px-2 py-1.5 rounded-md">${tagOptions}</select>
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${canSplit ? `<button id="subnet-btn-split" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md">SPLIT (S)</button>` : ''}
          <button id="subnet-btn-clear" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md">CLEAR (Del)</button>
        </div>`
      : `
        <div class="mb-2">
          <label class="text-[10px] uppercase font-bold opacity-50 block mb-1">Allocate this block</label>
          <input id="subnet-inp-name" type="text" placeholder="e.g. Engineering LAN" class="lab-action w-full text-xs px-2 py-1.5 rounded-md mb-1.5" />
          <select id="subnet-sel-tag" class="lab-action w-full text-xs px-2 py-1.5 rounded-md">${tagOptions}</select>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button id="subnet-btn-allocate" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md">ALLOCATE</button>
          ${canSplit ? `<button id="subnet-btn-split" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md">SPLIT (S)</button>` : ''}
        </div>`;

    this.detailsEl.innerHTML = `
      <div class="mb-2">
        <div class="lab-eyebrow mb-1">${allocated ? 'Allocated block' : 'Free block'}</div>
        <div class="font-mono font-bold text-sm">${stats.cidr}</div>
      </div>
      ${statsHtml}
      ${editHtml}
    `;

    this.detailsEl.querySelector('#subnet-btn-split')?.addEventListener('click', () => this.doSplit(node));
    this.detailsEl.querySelector('#subnet-btn-clear')?.addEventListener('click', () => this.doClear(node));
    this.detailsEl.querySelector('#subnet-btn-allocate')?.addEventListener('click', () => this.doAllocate(node));

    const nameInput = this.detailsEl.querySelector<HTMLInputElement>('#subnet-inp-name');
    const tagSelect = this.detailsEl.querySelector<HTMLSelectElement>('#subnet-sel-tag');
    if (allocated) {
      nameInput?.addEventListener('change', () => {
        node.label = nameInput.value.trim() || node.label;
        this.refreshStatus();
        this.draw();
      });
      tagSelect?.addEventListener('change', () => {
        node.tag = (tagSelect.value as SubnetTag) || 'lan';
        this.draw();
      });
    }
    nameInput?.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !allocated) this.doAllocate(node);
    });
  }

  private renderInternalInspector(node: PlannerNode): void {
    const stats = blockStats(node.base, node.prefix);
    const childrenAreLeaves = !!node.left && !!node.right && isLeaf(node.left) && isLeaf(node.right);
    this.detailsEl.innerHTML = `
      <div class="mb-2">
        <div class="lab-eyebrow mb-1">Split block</div>
        <div class="font-mono font-bold text-sm">${stats.cidr}</div>
        <div class="text-xs opacity-60 mt-1">${stats.totalAddresses} addresses, divided into two /${node.prefix + 1} blocks below.</div>
      </div>
      ${childrenAreLeaves
        ? `<button id="subnet-btn-join" class="lab-action text-[10px] font-bold tracking-wide px-2.5 py-1.5 rounded-md">MERGE CHILDREN (J)</button>`
        : `<div class="lab-muted text-xs">One or both children are further split — merge those first.</div>`}
    `;
    this.detailsEl.querySelector('#subnet-btn-join')?.addEventListener('click', () => this.doJoin(node));
  }

  // ============ Export ============
  private exportPNG(): void {
    const link = document.createElement('a');
    link.download = 'subnet-plan.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    if (isSoundEnabled()) playNotification();
  }

  private exportCSV(): void {
    const leaves = collectLeaves(this.root).filter(l => l.label);
    const header = ['Name', 'CIDR', 'Tag', 'Network', 'Broadcast', 'First Host', 'Last Host', 'Usable Hosts'];
    const rows = leaves.map(l => {
      const s = blockStats(l.base, l.prefix);
      return [l.label, s.cidr, TAG_LABELS[l.tag || 'lan'], s.network, s.broadcast, s.firstHost, s.lastHost, String(s.usableHosts)];
    });
    const csv = [header, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'subnet-plan.csv';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    if (isSoundEnabled()) playNotification();
  }

  destroy(): void {
    this.layoutController.destroy();
    if (this.resizeObserver) this.resizeObserver.disconnect();

    const container = this.canvas.closest('#subnet-app');
    container?.querySelector('#subnet-manual')?.removeEventListener('click', this.handlers.manual);
    container?.querySelector('#subnet-vlsm')?.removeEventListener('click', this.handlers.vlsm);
    container?.querySelector('#subnet-vpc')?.removeEventListener('click', this.handlers.vpc);
    container?.querySelector('#subnet-export-png')?.removeEventListener('click', this.handlers.exportpng);
    container?.querySelector('#subnet-export-csv')?.removeEventListener('click', this.handlers.exportcsv);

    this.textarea.removeEventListener('input', this.handlers.input);
    this.textarea.removeEventListener('scroll', this.handlers.editorscroll);
    this.textarea.removeEventListener('keydown', this.handlers.editorkeydown);

    this.canvas.removeEventListener('click', this.handlers.click);
    this.canvas.removeEventListener('mousemove', this.handlers.mousemove);
    this.canvas.removeEventListener('mouseleave', this.handlers.mouseleave);

    window.removeEventListener('keydown', this.handlers.keydown);
  }
}

// ============ Export Functions ============
let currentPlanner: SubnetPlannerController | null = null;

export function initSubnetPlanner(container: HTMLElement): void {
  currentPlanner = new SubnetPlannerController(container);
}

export function destroySubnetPlanner(): void {
  currentPlanner?.destroy();
  currentPlanner = null;
}
