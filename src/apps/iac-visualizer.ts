// IaC Visualizer for pietrOS
// Vanilla TypeScript implementation using Canvas API
// Force-directed graph with documentation/learning features

import { playClick, playNotification, isSoundEnabled } from '../audio';
import { LabLayoutController } from './lab-layout';

// ============ Types ============
interface IaCNode {
  id: string;
  type: 'aws' | 'k8s' | 'network' | 'storage' | 'compute' | 'service' | 'ingress' | 'configmap' | 'secret' | 'pvc';
  name: string;
  resourceType: string;
  properties: Record<string, unknown>;
  connections: string[];
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale?: number;
}

interface ParsedIaC {
  nodes: IaCNode[];
  format: 'terraform' | 'kubernetes' | 'unknown';
  errors: string[];
}

const NODE_WIDTH = 148;
const NODE_HEIGHT = 64;
const COLUMN_GAP = 72;
const ROW_GAP = 30;

// ============ Node Colors ============
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  compute: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
  storage: { bg: '#3d2a1f', border: '#f97316', text: '#fdba74' },
  network: { bg: '#1a3d3d', border: '#14b8a6', text: '#5eead4' },
  service: { bg: '#3b2d4d', border: '#a855f7', text: '#d8b4fe' },
  ingress: { bg: '#4a2c2a', border: '#ef4444', text: '#fca5a5' },
  configmap: { bg: '#2d3b2d', border: '#22c55e', text: '#86efac' },
  secret: { bg: '#3d3d2a', border: '#eab308', text: '#fde047' },
  pvc: { bg: '#2a3d4d', border: '#06b6d4', text: '#67e8f9' },
  aws: { bg: '#2d2d1a', border: '#f59e0b', text: '#fcd34d' },
  k8s: { bg: '#1a2d4d', border: '#3b82f6', text: '#93c5fd' },
};

// ============ Resource Documentation ============
const RESOURCE_DOCS: Record<string, { url: string; description: string }> = {
  'aws_instance': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance', description: 'An EC2 instance is a virtual server in Amazon\'s Elastic Compute Cloud.' },
  'aws_vpc': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc', description: 'A Virtual Private Cloud (VPC) is a logically isolated section of AWS.' },
  'aws_subnet': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet', description: 'A subnet is a range of IP addresses in your VPC.' },
  'aws_security_group': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group', description: 'A security group acts as a virtual firewall for your instances.' },
  'aws_s3_bucket': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket', description: 'Amazon S3 bucket provides scalable object storage.' },
  'aws_internet_gateway': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway', description: 'An internet gateway enables internet access for your VPC.' },
  'aws_lb': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb', description: 'Elastic Load Balancing distributes incoming traffic across targets.' },
  'Deployment': { url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/', description: 'A Deployment provides declarative updates for Pods and ReplicaSets.' },
  'Service': { url: 'https://kubernetes.io/docs/concepts/services-networking/service/', description: 'A Service abstracts a logical set of Pods and access policies.' },
  'Ingress': { url: 'https://kubernetes.io/docs/concepts/services-networking/ingress/', description: 'Ingress exposes HTTP/HTTPS routes from outside the cluster.' },
  'ConfigMap': { url: 'https://kubernetes.io/docs/concepts/configuration/configmap/', description: 'A ConfigMap stores non-confidential configuration data.' },
  'Secret': { url: 'https://kubernetes.io/docs/concepts/configuration/secret/', description: 'A Secret stores sensitive data like passwords or tokens.' },
  'PersistentVolumeClaim': { url: 'https://kubernetes.io/docs/concepts/storage/persistent-volumes/', description: 'A PVC is a request for storage by a user.' },
  'aws_nat_gateway': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway', description: 'A NAT gateway lets private subnets reach the internet without inbound exposure.' },
  'aws_route_table': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table', description: 'A route table controls where network traffic from your subnets is directed.' },
  'aws_lambda_function': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function', description: 'Lambda runs code without provisioning or managing servers.' },
  'aws_dynamodb_table': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table', description: 'DynamoDB is a fully managed serverless NoSQL key-value database.' },
  'aws_db_instance': { url: 'https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance', description: 'An RDS instance is a managed relational database in the cloud.' },
  'StatefulSet': { url: 'https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/', description: 'A StatefulSet manages Pods with stable identities and persistent storage.' },
  'DaemonSet': { url: 'https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/', description: 'A DaemonSet ensures a copy of a Pod runs on every node.' },
};

// ============ HTML Escaping ============
function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!
  ));
}

function highlightIaC(code: string): string {
  const tokens = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[^\n]*|\b(?:terraform|required_providers|provider|resource|data|module|variable|output|locals|apiVersion|kind|metadata|spec|selector|template|containers|ports|env)\b|\b\d+(?:\.\d+)?\b|[A-Za-z_][\w-]*(?=\s*[:=])|[{}\[\]=])/g;

  return code.split('\n').map(line => {
    let html = '';
    let cursor = 0;
    for (const match of line.matchAll(tokens)) {
      const token = match[0];
      const index = match.index ?? 0;
      html += escapeHtml(line.slice(cursor, index));
      let className = 'iac-token-punctuation';
      if (token.startsWith('#')) className = 'iac-token-comment';
      else if (token.startsWith('"') || token.startsWith("'")) className = 'iac-token-string';
      else if (/^\d/.test(token)) className = 'iac-token-number';
      else if (/^[A-Za-z_]/.test(token)) {
        className = /^(terraform|required_providers|provider|resource|data|module|variable|output|locals|apiVersion|kind|metadata|spec|selector|template|containers|ports|env)$/.test(token)
          ? 'iac-token-keyword'
          : 'iac-token-key';
      }
      html += `<span class="${className}">${escapeHtml(token)}</span>`;
      cursor = index + token.length;
    }
    return html + escapeHtml(line.slice(cursor));
  }).join('\n');
}

const LEARNING_TIPS: Record<string, string[]> = {
  compute: ['Consider auto-scaling for variable traffic', 'Right-size instances to optimize costs'],
  network: ['Use private subnets for sensitive resources', 'Follow least-privilege for security groups'],
  storage: ['Plan backup and replication strategies', 'Choose storage class based on access patterns'],
  service: ['Use ClusterIP for internal communication', 'LoadBalancer creates external access points'],
};

// ============ Sample Templates ============
const SAMPLE_TERRAFORM = `# AWS VPC with EC2 Instance
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = { Name = "main-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true
  tags = { Name = "public-subnet" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "main-igw" }
}

resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id
}

resource "aws_instance" "web" {
  ami                    = "ami-0c55b159cbfafe1f0"
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]
  tags = { Name = "web-server" }
}

resource "aws_s3_bucket" "assets" {
  bucket = "my-app-assets"
  tags = { Name = "assets-bucket" }
}

resource "aws_lb" "web" {
  name               = "web-lb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.web.id]
  subnets            = [aws_subnet.public.id]
}`;

const SAMPLE_KUBERNETES = `# Kubernetes Web App Stack
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
---
apiVersion: v1
kind: Service
metadata:
  name: web-app-service
  namespace: production
spec:
  selector:
    app: web-app
  ports:
  - port: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app-ingress
spec:
  rules:
  - host: app.example.com
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-app-config
data:
  APP_ENV: production
---
apiVersion: v1
kind: Secret
metadata:
  name: web-app-secrets
type: Opaque`;

const SAMPLE_MICROSERVICES = `# Microservices Architecture
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
spec:
  replicas: 2
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 2
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 2
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-svc
spec:
  ports:
  - port: 80
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway-svc
spec:
  ports:
  - port: 8080
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: main-ingress
spec:
  rules:
  - host: app.example.com`;

// ============ Parser ============
function getNodeType(resourceType: string): IaCNode['type'] {
  const typeMap: Record<string, IaCNode['type']> = {
    'aws_instance': 'compute', 'aws_ec2_instance': 'compute', 'aws_lambda_function': 'compute',
    'aws_ecs_service': 'compute', 'aws_ecs_cluster': 'compute',
    'aws_s3_bucket': 'storage', 'aws_ebs_volume': 'storage', 'aws_rds_instance': 'storage',
    'aws_db_instance': 'storage', 'aws_dynamodb_table': 'storage',
    'aws_vpc': 'network', 'aws_subnet': 'network', 'aws_security_group': 'network',
    'aws_internet_gateway': 'network', 'aws_nat_gateway': 'network', 'aws_route_table': 'network',
    'aws_lb': 'network', 'aws_alb': 'network', 'aws_elb': 'network',
    'google_compute_instance': 'compute', 'google_storage_bucket': 'storage', 'google_compute_network': 'network',
    'azurerm_virtual_machine': 'compute', 'azurerm_storage_account': 'storage', 'azurerm_virtual_network': 'network',
  };
  return typeMap[resourceType] || 'aws';
}

function getK8sNodeType(kind: string): IaCNode['type'] {
  const typeMap: Record<string, IaCNode['type']> = {
    'Deployment': 'compute', 'Pod': 'compute', 'ReplicaSet': 'compute', 'StatefulSet': 'compute',
    'DaemonSet': 'compute', 'Job': 'compute', 'CronJob': 'compute',
    'Service': 'service', 'Ingress': 'ingress',
    'ConfigMap': 'configmap', 'Secret': 'secret',
    'PersistentVolumeClaim': 'pvc', 'PersistentVolume': 'storage',
    'Namespace': 'network', 'NetworkPolicy': 'network',
  };
  return typeMap[kind] || 'k8s';
}

function parseProperties(body: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  const kvRegex = /(\w+)\s*=\s*"([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = kvRegex.exec(body)) !== null) props[match[1]] = match[2];
  const refRegex = /(\w+)\s*=\s*(\w+\.\w+(?:\.\w+)*)/g;
  while ((match = refRegex.exec(body)) !== null) props[match[1]] = match[2];
  return props;
}

function findConnections(body: string): string[] {
  const connections: string[] = [];
  const refRegex = /(?:aws_|google_|azurerm_)\w+\.(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = refRegex.exec(body)) !== null) {
    const refType = match[0].split('.')[0];
    const refName = match[1];
    const fullRef = `${refType}.${refName}`;
    if (!connections.includes(fullRef)) connections.push(fullRef);
  }
  return connections;
}

function parseTerraform(code: string): ParsedIaC {
  const nodes: IaCNode[] = [];
  const errors: string[] = [];
  const resourceRegex = /resource\s+"([^"]+)"\s+"([^"]+)"\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = resourceRegex.exec(code)) !== null) {
    nodes.push({
      id: `${match[1]}.${match[2]}`,
      type: getNodeType(match[1]),
      name: match[2],
      resourceType: match[1],
      properties: parseProperties(match[3]),
      connections: findConnections(match[3]),
      x: 0, y: 0, vx: 0, vy: 0,
    });
  }

  if (nodes.length === 0 && code.trim().length > 0) {
    errors.push('No valid Terraform resources found.');
  }
  return { nodes, format: 'terraform', errors };
}

function parseKubernetes(code: string): ParsedIaC {
  const nodes: IaCNode[] = [];
  const errors: string[] = [];
  const documents = code.split(/^---$/m).filter(doc => doc.trim());

  for (const doc of documents) {
    const kindMatch = doc.match(/kind:\s*(\w+)/);
    const nameMatch = doc.match(/name:\s*(\S+)/);
    const replicasMatch = doc.match(/replicas:\s*(\d+)/);
    const namespaceMatch = doc.match(/namespace:\s*(\S+)/);

    if (kindMatch && nameMatch) {
      nodes.push({
        id: `${kindMatch[1]}/${nameMatch[1]}`,
        type: getK8sNodeType(kindMatch[1]),
        name: nameMatch[1],
        resourceType: kindMatch[1],
        properties: {
          ...(namespaceMatch && { namespace: namespaceMatch[1] }),
          ...(replicasMatch && { replicas: parseInt(replicasMatch[1]) }),
        },
        connections: [],
        x: 0, y: 0, vx: 0, vy: 0,
      });
    }
  }

  // Add K8s connections using name-prefix matching
  nodes.forEach(node => {
    if (node.resourceType === 'Service') {
      const svcBase = node.name.replace(/-svc$|-service$/, '');
      const matched = nodes.find(n =>
        n.resourceType === 'Deployment' &&
        (n.name === svcBase || n.name.startsWith(svcBase) || svcBase.startsWith(n.name))
      );
      if (matched) {
        node.connections.push(matched.id);
      } else {
        const fallback = nodes.find(n => n.resourceType === 'Deployment' &&
          n.properties.namespace === node.properties.namespace);
        if (fallback) node.connections.push(fallback.id);
      }
    }
    if (node.resourceType === 'Ingress') {
      nodes.filter(n => n.resourceType === 'Service').forEach(svc => {
        node.connections.push(svc.id);
      });
    }
    if (node.resourceType === 'ConfigMap' || node.resourceType === 'Secret') {
      nodes.filter(n => n.resourceType === 'Deployment' &&
        n.properties.namespace === node.properties.namespace).forEach(dep => {
        node.connections.push(dep.id);
      });
    }
  });

  if (nodes.length === 0 && code.trim().length > 0) {
    errors.push('No valid Kubernetes resources found.');
  }
  return { nodes, format: 'kubernetes', errors };
}

export function detectFormat(code: string): 'terraform' | 'kubernetes' | 'unknown' {
  const tfPatterns = [/resource\s+"/, /provider\s+"/, /variable\s+"/, /data\s+"/];
  const k8sPatterns = [/apiVersion:/, /kind:/, /metadata:/, /spec:/];
  const tfScore = tfPatterns.filter(p => p.test(code)).length;
  const k8sScore = k8sPatterns.filter(p => p.test(code)).length;
  if (tfScore > k8sScore) return 'terraform';
  if (k8sScore > tfScore) return 'kubernetes';
  return 'unknown';
}

export function parseIaC(code: string): ParsedIaC {
  const format = detectFormat(code);
  if (format === 'terraform') return parseTerraform(code);
  if (format === 'kubernetes') return parseKubernetes(code);
  return { nodes: [], format: 'unknown', errors: ['Could not detect format.'] };
}

// ============ IaC Visualizer Class ============
export class IaCVisualizer {
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

  private nodes: IaCNode[] = [];
  private nodeMap: Map<string, IaCNode> = new Map();
  private format: 'terraform' | 'kubernetes' | 'unknown' = 'unknown';
  private selectedNode: IaCNode | null = null;
  private hoveredNode: IaCNode | null = null;
  private isDragging = false;
  private dragNode: IaCNode | null = null;
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
  private layoutTargets = new Map<string, { x: number; y: number }>();
  private manuallyPlaced = new Set<string>();

  constructor(container: HTMLElement) {
    this.canvas = container.querySelector('#iac-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.textarea = container.querySelector('#iac-code') as HTMLTextAreaElement;
    this.formatEl = container.querySelector('#iac-format')!;
    this.countEl = container.querySelector('#iac-count')!;
    this.errorEl = container.querySelector('#iac-errors')!;
    this.detailsEl = container.querySelector('#iac-details')!;
    this.highlightEl = container.querySelector('#iac-highlight code')!;
    this.lineNumbersEl = container.querySelector('#iac-line-numbers')!;
    this.filenameEl = container.querySelector('#iac-filename')!;
    this.layoutController = new LabLayoutController(container);

    this.zoomEl = container.querySelector('#iac-zoom') as HTMLElement;

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
      terraform: () => this.loadTemplate('terraform'),
      kubernetes: () => this.loadTemplate('kubernetes'),
      microservices: () => this.loadTemplate('microservices'),
      export: () => this.exportPNG(),
      fit: () => this.fitToView(),
      zoomreset: () => this.resetZoom(),
      keydown: this.handleKeyDown.bind(this),
    };

    // Template buttons
    container.querySelector('#iac-terraform')?.addEventListener('click', this.handlers.terraform);
    container.querySelector('#iac-kubernetes')?.addEventListener('click', this.handlers.kubernetes);
    container.querySelector('#iac-microservices')?.addEventListener('click', this.handlers.microservices);

    // Toolbar buttons
    container.querySelector('#iac-export')?.addEventListener('click', this.handlers.export);
    container.querySelector('#iac-fit')?.addEventListener('click', this.handlers.fit);
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
    this.textarea.value = SAMPLE_TERRAFORM;
    this.setTemplateActive('terraform');
    this.updateEditorPresentation();
    this.parseAndRender();
    this.startAnimation();
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = parent.getBoundingClientRect();

    // Set display size (css)
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Set actual size in memory (scaled to account for extra pixel density).
    // Assigning width/height resets the transform to identity; render()
    // applies the DPR scale explicitly, so no persistent scale here.
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    if (this.nodes.length > 0) this.computeLayeredLayout(false);

    // Trigger re-render
    this.render();
  }

  private handleInput(): void {
    this.updateEditorPresentation();
    this.parseAndRender();
  }

  private updateEditorPresentation(): void {
    const code = this.textarea.value;
    this.highlightEl.innerHTML = highlightIaC(code) + (code.endsWith('\n') ? '\n ' : '');
    const lineCount = Math.max(1, code.split('\n').length);
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
    const start = this.textarea.selectionStart;
    const end = this.textarea.selectionEnd;
    this.textarea.setRangeText('  ', start, end, 'end');
    this.handleInput();
  }

  private loadTemplate(type: 'terraform' | 'kubernetes' | 'microservices'): void {
    switch (type) {
      case 'terraform': this.textarea.value = SAMPLE_TERRAFORM; break;
      case 'kubernetes': this.textarea.value = SAMPLE_KUBERNETES; break;
      case 'microservices': this.textarea.value = SAMPLE_MICROSERVICES; break;
    }
    this.setTemplateActive(type);
    this.updateEditorPresentation();
    this.selectedNode = null;
    this.hoveredNode = null;
    // Force a fresh layout for the new template (no position carry-over)
    this.nodes = [];
    this.nodeMap.clear();
    this.manuallyPlaced.clear();
    this.parseAndRender();
    if (isSoundEnabled()) playClick();
  }

  private setTemplateActive(type: 'terraform' | 'kubernetes' | 'microservices'): void {
    const root = this.textarea.closest('#iac-app');
    for (const option of ['terraform', 'kubernetes', 'microservices'] as const) {
      const button = root?.querySelector<HTMLElement>(`#iac-${option}`);
      button?.setAttribute('data-active', String(option === type));
      button?.setAttribute('aria-pressed', String(option === type));
    }
    const isKubernetes = type === 'kubernetes' || type === 'microservices';
    this.filenameEl.textContent = isKubernetes ? (type === 'microservices' ? 'microservices.yaml' : 'deployment.yaml') : 'main.tf';
    root?.querySelector('#iac-file-terraform-icon')?.classList.toggle('hidden', isKubernetes);
    root?.querySelector('#iac-file-kubernetes-icon')?.classList.toggle('hidden', !isKubernetes);
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
      const node = this.getNodeAt(x, y);
      
      if (node) {
        this.isDragging = true;
        this.dragNode = node;
        this.dragOffsetX = x - node.x;
        this.dragOffsetY = y - node.y;
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
      
      if (this.isDragging && this.dragNode) {
        const { x, y } = this.screenToWorld(sx, sy);
        this.dragNode.x = x - this.dragOffsetX;
        this.dragNode.y = y - this.dragOffsetY;
        this.dragNode.vx = 0;
        this.dragNode.vy = 0;
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
      if (this.dragNode) this.manuallyPlaced.add(this.dragNode.id);
      this.isDragging = false;
      this.dragNode = null;
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
    if (e.key === 'Escape' && this.selectedNode) {
      this.selectedNode = null;
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
    if (this.nodes.length === 0) return;
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    this.nodes.forEach(node => {
      minX = Math.min(minX, node.x - NODE_WIDTH / 2);
      minY = Math.min(minY, node.y - NODE_HEIGHT / 2);
      maxX = Math.max(maxX, node.x + NODE_WIDTH / 2);
      maxY = Math.max(maxY, node.y + NODE_HEIGHT / 2);
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
    link.download = 'iac-graph.png';
    link.href = this.canvas.toDataURL('image/png');
    link.click();
    if (isSoundEnabled()) playNotification();
  }

  private parseAndRender(): void {
    const code = this.textarea.value;
    const parsed = parseIaC(code);
    this.format = parsed.format;

    // Update UI
    this.formatEl.textContent = parsed.format === 'terraform' ? 'Terraform HCL' :
                                parsed.format === 'kubernetes' ? 'Kubernetes YAML' : 'Unknown';
    this.countEl.textContent = `${parsed.nodes.length} resources`;

    if (parsed.errors.length > 0) {
      this.errorEl.textContent = parsed.errors.join(', ');
      this.errorEl.classList.remove('hidden');
    } else {
      this.errorEl.classList.add('hidden');
    }

    // Keep positions of nodes that survive live edits. New graphs start in a
    // dependency-aware left-to-right layout instead of a collision-prone ring.
    const previous = this.nodeMap;
    parsed.nodes.forEach(node => {
      const prev = previous.get(node.id);
      if (prev) {
        node.x = prev.x;
        node.y = prev.y;
        node.vx = prev.vx;
        node.vy = prev.vy;
        node.scale = prev.scale ?? 1;
      } else {
        node.x = Number.NaN;
        node.y = Number.NaN;
        node.scale = 0; // Start invisible
      }
    });

    this.nodes = parsed.nodes;
    this.nodeMap = new Map(this.nodes.map(n => [n.id, n]));
    this.computeLayeredLayout(previous.size === 0);

    // Re-point selection/hover at the fresh node objects
    this.selectedNode = this.selectedNode ? this.nodeMap.get(this.selectedNode.id) ?? null : null;
    this.hoveredNode = this.hoveredNode ? this.nodeMap.get(this.hoveredNode.id) ?? null : null;
    this.updateDetails();
  }

  private computeLayeredLayout(placeAll: boolean): void {
    const depthCache = new Map<string, number>();
    const visiting = new Set<string>();
    const depthOf = (id: string): number => {
      const cached = depthCache.get(id);
      if (cached !== undefined) return cached;
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const node = this.nodeMap.get(id);
      const dependencies = node?.connections.filter(target => this.nodeMap.has(target)) ?? [];
      const depth = dependencies.length ? Math.max(...dependencies.map(target => depthOf(target) + 1)) : 0;
      visiting.delete(id);
      depthCache.set(id, depth);
      return depth;
    };

    const layers = new Map<number, IaCNode[]>();
    for (const node of this.nodes) {
      const depth = depthOf(node.id);
      const layer = layers.get(depth) ?? [];
      layer.push(node);
      layers.set(depth, layer);
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvasW = this.canvas.width / dpr;
    const canvasH = this.canvas.height / dpr;
    const columnStep = NODE_WIDTH + COLUMN_GAP;
    const maxDepth = Math.max(0, ...layers.keys());
    const graphW = maxDepth * columnStep;
    const startX = Math.max(NODE_WIDTH / 2 + 54, canvasW / 2 - graphW / 2);

    this.layoutTargets.clear();
    for (const [depth, layer] of layers) {
      layer.sort((a, b) => a.resourceType.localeCompare(b.resourceType) || a.name.localeCompare(b.name));
      const rowStep = NODE_HEIGHT + ROW_GAP;
      const startY = Math.max(NODE_HEIGHT / 2 + 42, canvasH / 2 - ((layer.length - 1) * rowStep) / 2);
      layer.forEach((node, row) => {
        const target = { x: startX + depth * columnStep, y: startY + row * rowStep };
        this.layoutTargets.set(node.id, target);
        if (placeAll || !Number.isFinite(node.x) || !Number.isFinite(node.y)) {
          node.x = target.x;
          node.y = target.y;
          node.vx = 0;
          node.vy = 0;
        }
      });
    }
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
    const damping = 0.78;

    // A strict rectangular collision pass guarantees cards never overlap.
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const a = this.nodes[i];
        const b = this.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const overlapX = NODE_WIDTH + 18 - Math.abs(dx);
        const overlapY = NODE_HEIGHT + 16 - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const push = overlapX * 0.09 * (dx < 0 ? -1 : 1);
            if (a !== this.dragNode) a.vx -= push;
            if (b !== this.dragNode) b.vx += push;
          } else {
            const push = overlapY * 0.12 * (dy < 0 ? -1 : 1);
            if (a !== this.dragNode) a.vy -= push;
            if (b !== this.dragNode) b.vy += push;
          }
        }
      }
    }

    // Gently settle automatic nodes back into dependency columns. Manually
    // dragged cards remain where the user placed them.
    for (const node of this.nodes) {
      const target = this.layoutTargets.get(node.id);
      if (target && !this.manuallyPlaced.has(node.id) && node !== this.dragNode) {
        node.vx += (target.x - node.x) * 0.035;
        node.vy += (target.y - node.y) * 0.035;
      }
    }

    // Apply velocity and damping
    for (const node of this.nodes) {
      if (node !== this.dragNode) {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
      }
      
      // Entrance animation
      if (node.scale === undefined) node.scale = 0;
      if (this.reducedMotion) {
        node.scale = 1;
      } else if (node.scale < 1) {
        node.scale += (1 - node.scale) * 0.1;
        if (node.scale > 0.99) node.scale = 1;
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const reducedMotion = this.reducedMotion;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;

    // Clear canvas (reset transform to physical pixels)
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

    // Grid (in world space)
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

    // Focus mode: when a node is selected (or hovered), spotlight it and
    // its direct neighbours by dimming everything else.
    const focus = this.selectedNode || this.hoveredNode;
    let focusIds: Set<string> | null = null;
    if (focus) {
      focusIds = new Set([focus.id, ...focus.connections]);
      for (const n of this.nodes) {
        if (n.connections.includes(focus.id)) focusIds.add(n.id);
      }
    }

    // Connections are routed from card edge to card edge with smooth,
    // horizontal designer-style paths and explicit connection ports.
    for (const node of this.nodes) {
      for (const connId of node.connections) {
        const target = this.nodeMap.get(connId);
        if (target) {
          const colors = NODE_COLORS[node.type] || NODE_COLORS.aws;
          ctx.globalAlpha = !focus || node === focus || target === focus ? 1 : 0.12;
          const direction = target.x >= node.x ? 1 : -1;
          const startX = node.x + direction * NODE_WIDTH / 2;
          const endX = target.x - direction * NODE_WIDTH / 2;
          const bend = Math.max(34, Math.abs(endX - startX) * 0.48);

          ctx.setLineDash([]);
          ctx.lineWidth = 5 / this.zoomLevel;
          ctx.strokeStyle = '#06090d';
          ctx.beginPath();
          ctx.moveTo(startX, node.y);
          ctx.bezierCurveTo(startX + direction * bend, node.y, endX - direction * bend, target.y, endX, target.y);
          ctx.stroke();

          ctx.lineWidth = (node === focus || target === focus ? 2.5 : 1.5) / this.zoomLevel;
          ctx.strokeStyle = colors.border + (node === focus || target === focus ? 'e6' : '8c');
          ctx.beginPath();
          ctx.moveTo(startX, node.y);
          ctx.bezierCurveTo(startX + direction * bend, node.y, endX - direction * bend, target.y, endX, target.y);
          ctx.stroke();

          // Ports and directional chevron.
          ctx.fillStyle = '#0b1016';
          ctx.strokeStyle = colors.border;
          ctx.lineWidth = 2 / this.zoomLevel;
          for (const [px, py] of [[startX, node.y], [endX, target.y]] as const) {
            ctx.beginPath();
            ctx.arc(px, py, 4 / this.zoomLevel, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(endX, target.y);
          ctx.lineTo(endX - direction * 8, target.y - 5);
          ctx.lineTo(endX - direction * 8, target.y + 5);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Nodes
    for (const node of this.nodes) {
      const colors = NODE_COLORS[node.type] || NODE_COLORS.aws;
      const isSelected = node === this.selectedNode;
      const isHovered = node === this.hoveredNode;
      const scale = node.scale || 0;

      if (scale < 0.01) continue;

      ctx.save();
      ctx.globalAlpha = !focusIds || focusIds.has(node.id) ? 1 : 0.25;
      ctx.translate(node.x, node.y);
      ctx.scale(scale, scale);

      // Glow
      if (isSelected || isHovered) {
        const pulse = (isSelected && !reducedMotion) ? Math.sin(Date.now() / 200) * 5 + 5 : 0;
        ctx.shadowColor = colors.border;
        ctx.shadowBlur = (isSelected ? 20 : 15) + pulse;
      }

      // Background
      ctx.fillStyle = '#111923';
      ctx.strokeStyle = isSelected ? '#ffffff' : colors.border;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(-NODE_WIDTH / 2, -NODE_HEIGHT / 2, NODE_WIDTH, NODE_HEIGHT, 9);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // A slim type rail and compact icon make the card easier to scan.
      ctx.fillStyle = colors.border;
      ctx.beginPath();
      ctx.roundRect(-NODE_WIDTH / 2, -NODE_HEIGHT / 2, 5, NODE_HEIGHT, [9, 0, 0, 9]);
      ctx.fill();
      ctx.globalAlpha *= 0.16;
      ctx.beginPath();
      ctx.arc(-NODE_WIDTH / 2 + 25, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = !focusIds || focusIds.has(node.id) ? 1 : 0.25;
      ctx.fillStyle = colors.text;
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const initials = node.resourceType.replace(/^aws_/, '').split('_').map(part => part[0]).join('').slice(0, 2).toUpperCase();
      ctx.fillText(initials || 'R', -NODE_WIDTH / 2 + 25, 3);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#7f8c99';
      ctx.font = '700 8px "JetBrains Mono", monospace';
      ctx.fillText(node.resourceType.toUpperCase().slice(0, 18), -NODE_WIDTH / 2 + 47, -8);

      // Name
      ctx.fillStyle = '#f2f6fa';
      ctx.font = '600 12px "DM Sans", sans-serif';
      ctx.fillText(node.name.slice(0, 16), -NODE_WIDTH / 2 + 47, 11);

      ctx.fillStyle = colors.border;
      ctx.beginPath();
      ctx.arc(NODE_WIDTH / 2 - 12, -NODE_HEIGHT / 2 + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }

    ctx.restore();

    // Tooltip (screen space)
    if (this.hoveredNode) {
      ctx.save();
      ctx.scale(dpr, dpr);

      const screenX = this.hoveredNode.x * this.zoomLevel + this.panX;
      const screenY = this.hoveredNode.y * this.zoomLevel + this.panY;

      const doc = RESOURCE_DOCS[this.hoveredNode.resourceType];
      const text = doc ? doc.description : `${this.hoveredNode.resourceType} · ${this.hoveredNode.name}`;

      ctx.font = '12px "DM Sans", sans-serif';
      const metrics = ctx.measureText(text);
      const padding = 8;
      const boxW = metrics.width + padding * 2;
      const boxH = 26;

      // Clamp inside the canvas, flipping below the node if there is no room above
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
    if (this.nodes.length === 0) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#64748b';
      ctx.font = '16px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No infrastructure to visualize', width / 2, height / 2);
      ctx.font = '12px "DM Sans", sans-serif';
      ctx.fillText('Paste Terraform or Kubernetes YAML', width / 2, height / 2 + 20);
      ctx.restore();
    }
  }

  private drawLegend(): void {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const height = this.canvas.height / dpr;

    // Build legend from actually-present node types
    const presentTypes = new Set(this.nodes.map(n => n.type));
    const items = [...presentTypes].map(type => ({
      color: (NODE_COLORS[type] || NODE_COLORS.aws).border,
      label: type.charAt(0).toUpperCase() + type.slice(1),
    }));
    if (items.length === 0) return;

    const cols = 2;
    const rows = Math.ceil(items.length / cols);
    const legendH = 20 + rows * 14 + 8;
    const legendW = 170;

    ctx.save();
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0f172acc';
    ctx.beginPath();
    ctx.roundRect(10, height - legendH - 8, legendW, legendH, 6);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '9px "DM Sans", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('LEGEND', 18, height - legendH + 4);

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 18 + col * 80;
      const y = height - legendH + 22 + row * 14;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, y - 8, 10, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "DM Sans", sans-serif';
      ctx.fillText(item.label, x + 14, y);
    });

    ctx.restore();
  }

  private drawMinimap(): void {
    if (this.nodes.length < 5) {
      this.minimapRect = null;
      return;
    }
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = this.canvas.width / dpr;
    const mapSize = 120;
    const mapPad = 8;
    const mapX = cssW - mapSize - 12;
    const mapY = 12;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const node of this.nodes) {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
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

    // Mini connections
    for (const node of this.nodes) {
      for (const connId of node.connections) {
        const target = this.nodeMap.get(connId);
        if (!target) continue;
        const x1 = mapX + mapPad + (node.x - minX) * scale;
        const y1 = mapY + mapPad + (node.y - minY) * scale;
        const x2 = mapX + mapPad + (target.x - minX) * scale;
        const y2 = mapY + mapPad + (target.y - minY) * scale;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Mini nodes
    for (const node of this.nodes) {
      const nx = mapX + mapPad + (node.x - minX) * scale;
      const ny = mapY + mapPad + (node.y - minY) * scale;
      const colors = NODE_COLORS[node.type] || NODE_COLORS.aws;
      ctx.fillStyle = node === this.selectedNode ? '#ffffff' : colors.border;
      ctx.beginPath();
      ctx.arc(nx, ny, node === this.selectedNode ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Viewport rectangle (clipped so it never spills outside the minimap)
    const cssH = this.canvas.height / dpr;
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

  private getNodeAt(x: number, y: number): IaCNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (Math.abs(x - node.x) < NODE_WIDTH / 2 && Math.abs(y - node.y) < NODE_HEIGHT / 2) return node;
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
    const node = this.getNodeAt(x, y);

    if (node) {
      this.isDragging = true;
      this.dragNode = node;
      this.dragOffsetX = x - node.x;
      this.dragOffsetY = y - node.y;
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

    if (this.isDragging && this.dragNode) {
      this.dragNode.x = x - this.dragOffsetX;
      this.dragNode.y = y - this.dragOffsetY;
      this.dragNode.vx = 0;
      this.dragNode.vy = 0;
    } else if (this.isPanning) {
      this.panX = sx - this.panStartX;
      this.panY = sy - this.panStartY;
    } else if (this.isInMinimap(sx, sy)) {
      this.hoveredNode = null;
      this.canvas.style.cursor = 'pointer';
    } else {
      this.hoveredNode = this.getNodeAt(x, y);
      this.canvas.style.cursor = this.hoveredNode ? 'grab' : 'default';
    }
  }

  private handleMouseUp(): void {
    if (this.dragNode && this.didMove) this.manuallyPlaced.add(this.dragNode.id);
    this.isDragging = false;
    this.dragNode = null;
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
    this.selectedNode = this.getNodeAt(x, y);
    this.updateDetails();
    if (this.selectedNode && isSoundEnabled()) playClick();
  }

  private updateDetails(): void {
    const node = this.selectedNode;
    if (!node) {
      this.detailsEl.innerHTML = '<div class="lab-eyebrow mb-2">Inspector</div><div class="lab-muted text-xs">Select a resource to inspect its properties and dependencies.</div>';
      return;
    }

    const colors = NODE_COLORS[node.type] || NODE_COLORS.aws;
    const doc = RESOURCE_DOCS[node.resourceType];
    const tips = LEARNING_TIPS[node.type] || [];

    const propsHtml = Object.keys(node.properties).length > 0
      ? `<div class="mt-2"><div class="text-xs uppercase font-bold opacity-50">Properties</div>
         <div class="text-xs opacity-70 mt-1">${Object.entries(node.properties).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join('<br>')}</div></div>`
      : '';

    const connsHtml = node.connections.length > 0
      ? `<div class="mt-2"><div class="text-xs uppercase font-bold opacity-50">Connections</div>
         <div class="text-xs opacity-70 mt-1">${node.connections.map(c => `→ ${escapeHtml(c)}`).join('<br>')}</div></div>`
      : '';

    const docHtml = doc
      ? `<div class="mt-2"><div class="text-xs opacity-70">${doc.description}</div>
         <a href="${doc.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-400 hover:underline mt-1 inline-block">📖 Documentation</a></div>`
      : '';

    const tipsHtml = tips.length > 0
      ? `<div class="mt-3 p-2 rounded" style="background: ${colors.border}20; border: 1px solid ${colors.border}40">
         <div class="text-xs font-bold" style="color: ${colors.text}">💡 Tips</div>
         <div class="text-xs opacity-70 mt-1">${tips.map(t => `• ${t}`).join('<br>')}</div></div>`
      : '';

    this.detailsEl.innerHTML = `
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Resource</div>
        <div class="font-bold" style="color: ${colors.text}">${escapeHtml(node.resourceType)}</div>
      </div>
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Name</div>
        <div>${escapeHtml(node.name)}</div>
      </div>
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">ID</div>
        <div class="text-xs font-mono opacity-70">${escapeHtml(node.id)}</div>
      </div>
      ${docHtml}${propsHtml}${connsHtml}${tipsHtml}
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
       container.querySelector('#iac-terraform')?.removeEventListener('click', this.handlers.terraform);
       container.querySelector('#iac-kubernetes')?.removeEventListener('click', this.handlers.kubernetes);
       container.querySelector('#iac-microservices')?.removeEventListener('click', this.handlers.microservices);
       container.querySelector('#iac-export')?.removeEventListener('click', this.handlers.export);
       container.querySelector('#iac-fit')?.removeEventListener('click', this.handlers.fit);
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
let currentVisualizer: IaCVisualizer | null = null;

export function initIaCVisualizer(container: HTMLElement): void {
  if (currentVisualizer) currentVisualizer.destroy();
  currentVisualizer = new IaCVisualizer(container);
}

export function destroyIaCVisualizer(): void {
  if (currentVisualizer) {
    currentVisualizer.destroy();
    currentVisualizer = null;
  }
}
