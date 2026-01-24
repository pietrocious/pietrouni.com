// IaC Visualizer for pietrOS
// Vanilla TypeScript implementation using Canvas API
// Force-directed graph with documentation/learning features

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
}

interface ParsedIaC {
  nodes: IaCNode[];
  format: 'terraform' | 'kubernetes' | 'unknown';
  errors: string[];
}

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
};

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
    'aws_s3_bucket': 'storage', 'aws_ebs_volume': 'storage', 'aws_rds_instance': 'storage', 'aws_dynamodb_table': 'storage',
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

  // Add K8s connections
  nodes.forEach(node => {
    if (node.resourceType === 'Service') {
      const deployment = nodes.find(n => n.resourceType === 'Deployment');
      if (deployment) node.connections.push(deployment.id);
    }
    if (node.resourceType === 'Ingress') {
      const service = nodes.find(n => n.resourceType === 'Service');
      if (service) node.connections.push(service.id);
    }
  });

  if (nodes.length === 0 && code.trim().length > 0) {
    errors.push('No valid Kubernetes resources found.');
  }
  return { nodes, format: 'kubernetes', errors };
}

function detectFormat(code: string): 'terraform' | 'kubernetes' | 'unknown' {
  const tfPatterns = [/resource\s+"/, /provider\s+"/, /variable\s+"/, /data\s+"/];
  const k8sPatterns = [/apiVersion:/, /kind:/, /metadata:/, /spec:/];
  const tfScore = tfPatterns.filter(p => p.test(code)).length;
  const k8sScore = k8sPatterns.filter(p => p.test(code)).length;
  if (tfScore > k8sScore) return 'terraform';
  if (k8sScore > tfScore) return 'kubernetes';
  return 'unknown';
}

function parseIaC(code: string): ParsedIaC {
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

  private nodes: IaCNode[] = [];
  private format: 'terraform' | 'kubernetes' | 'unknown' = 'unknown';
  private selectedNode: IaCNode | null = null;
  private hoveredNode: IaCNode | null = null;
  private isDragging = false;
  private dragNode: IaCNode | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private animationId: number | null = null;

  constructor(container: HTMLElement) {
    this.canvas = container.querySelector('#iac-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.textarea = container.querySelector('#iac-code') as HTMLTextAreaElement;
    this.formatEl = container.querySelector('#iac-format')!;
    this.countEl = container.querySelector('#iac-count')!;
    this.errorEl = container.querySelector('#iac-errors')!;
    this.detailsEl = container.querySelector('#iac-details')!;

    // Template buttons
    container.querySelector('#iac-terraform')?.addEventListener('click', () => this.loadTemplate('terraform'));
    container.querySelector('#iac-kubernetes')?.addEventListener('click', () => this.loadTemplate('kubernetes'));
    container.querySelector('#iac-microservices')?.addEventListener('click', () => this.loadTemplate('microservices'));

    // Code input
    this.textarea.addEventListener('input', () => this.parseAndRender());

    // Canvas interactions
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));

    // Initialize
    this.textarea.value = SAMPLE_TERRAFORM;
    this.parseAndRender();
    this.startAnimation();
  }

  private loadTemplate(type: 'terraform' | 'kubernetes' | 'microservices'): void {
    switch (type) {
      case 'terraform': this.textarea.value = SAMPLE_TERRAFORM; break;
      case 'kubernetes': this.textarea.value = SAMPLE_KUBERNETES; break;
      case 'microservices': this.textarea.value = SAMPLE_MICROSERVICES; break;
    }
    this.selectedNode = null;
    this.parseAndRender();
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

    // Initialize node positions in a circle
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    parsed.nodes.forEach((node, i) => {
      const angle = (i / parsed.nodes.length) * Math.PI * 2;
      const radius = 100 + Math.random() * 80;
      node.x = centerX + Math.cos(angle) * radius;
      node.y = centerY + Math.sin(angle) * radius;
    });

    this.nodes = parsed.nodes;
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
    const repulsion = 6000;
    const attraction = 0.008;
    const centerForce = 0.0008;
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Repulsion between nodes
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[j].x - this.nodes[i].x;
        const dy = this.nodes[j].y - this.nodes[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        this.nodes[i].vx -= fx;
        this.nodes[i].vy -= fy;
        this.nodes[j].vx += fx;
        this.nodes[j].vy += fy;
      }
    }

    // Attraction for connected nodes
    for (const node of this.nodes) {
      for (const connId of node.connections) {
        const target = this.nodes.find(n => n.id === connId);
        if (target) {
          const dx = target.x - node.x;
          const dy = target.y - node.y;
          node.vx += dx * attraction;
          node.vy += dy * attraction;
          target.vx -= dx * attraction;
          target.vy -= dy * attraction;
        }
      }
    }

    // Center gravity
    for (const node of this.nodes) {
      node.vx += (centerX - node.x) * centerForce;
      node.vy += (centerY - node.y) * centerForce;
    }

    // Apply velocity and damping
    for (const node of this.nodes) {
      if (node !== this.dragNode) {
        node.vx *= damping;
        node.vy *= damping;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(70, Math.min(this.canvas.width - 70, node.x));
        node.y = Math.max(35, Math.min(this.canvas.height - 35, node.y));
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvas.height); ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvas.width, y); ctx.stroke();
    }

    // Connections
    ctx.lineWidth = 2;
    for (const node of this.nodes) {
      for (const connId of node.connections) {
        const target = this.nodes.find(n => n.id === connId);
        if (target) {
          const colors = NODE_COLORS[node.type] || NODE_COLORS.aws;
          ctx.strokeStyle = colors.border + '60';
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Arrow
          const angle = Math.atan2(target.y - node.y, target.x - node.x);
          const arrowX = target.x - Math.cos(angle) * 55;
          const arrowY = target.y - Math.sin(angle) * 55;
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - 10 * Math.cos(angle - 0.4), arrowY - 10 * Math.sin(angle - 0.4));
          ctx.lineTo(arrowX - 10 * Math.cos(angle + 0.4), arrowY - 10 * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fillStyle = colors.border;
          ctx.fill();
        }
      }
    }

    // Nodes
    for (const node of this.nodes) {
      const colors = NODE_COLORS[node.type] || NODE_COLORS.aws;
      const isSelected = node === this.selectedNode;
      const isHovered = node === this.hoveredNode;
      const nodeWidth = 120;
      const nodeHeight = 55;

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
      ctx.roundRect(node.x - nodeWidth / 2, node.y - nodeHeight / 2, nodeWidth, nodeHeight, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Type label
      ctx.fillStyle = colors.border;
      ctx.font = 'bold 9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node.resourceType.toUpperCase().slice(0, 18), node.x, node.y - 10);

      // Name
      ctx.fillStyle = colors.text;
      ctx.font = 'bold 11px system-ui';
      ctx.fillText(node.name.slice(0, 16), node.x, node.y + 8);
    }

    // Legend
    this.drawLegend();

    // Empty state
    if (this.nodes.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No infrastructure to visualize', this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = '12px system-ui';
      ctx.fillText('Paste Terraform or Kubernetes YAML', this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
  }

  private drawLegend(): void {
    const ctx = this.ctx;
    const items = [
      { color: NODE_COLORS.compute.border, label: 'Compute' },
      { color: NODE_COLORS.network.border, label: 'Network' },
      { color: NODE_COLORS.storage.border, label: 'Storage' },
      { color: NODE_COLORS.service.border, label: 'Service' },
    ];

    ctx.fillStyle = '#0f172acc';
    ctx.fillRect(10, this.canvas.height - 55, 160, 45);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, this.canvas.height - 55, 160, 45);

    ctx.font = '9px system-ui';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('LEGEND', 18, this.canvas.height - 40);

    items.forEach((item, i) => {
      const x = 18 + (i % 2) * 75;
      const y = this.canvas.height - 25 + Math.floor(i / 2) * 14;
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.roundRect(x, y - 8, 10, 10, 2);
      ctx.fill();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui';
      ctx.fillText(item.label, x + 14, y);
    });
  }

  private getNodeAt(x: number, y: number): IaCNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (Math.abs(x - node.x) < 60 && Math.abs(y - node.y) < 28) return node;
    }
    return null;
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = this.getNodeAt(x, y);

    if (node) {
      this.isDragging = true;
      this.dragNode = node;
      this.dragOffsetX = x - node.x;
      this.dragOffsetY = y - node.y;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isDragging && this.dragNode) {
      this.dragNode.x = x - this.dragOffsetX;
      this.dragNode.y = y - this.dragOffsetY;
      this.dragNode.vx = 0;
      this.dragNode.vy = 0;
    } else {
      this.hoveredNode = this.getNodeAt(x, y);
      this.canvas.style.cursor = this.hoveredNode ? 'grab' : 'default';
    }
  }

  private handleMouseUp(): void {
    this.isDragging = false;
    this.dragNode = null;
  }

  private handleClick(e: MouseEvent): void {
    if (this.isDragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.selectedNode = this.getNodeAt(x, y);
    this.updateDetails();
  }

  private updateDetails(): void {
    const node = this.selectedNode;
    if (!node) {
      this.detailsEl.innerHTML = '<div class="text-xs opacity-50">Click a node to view details</div>';
      return;
    }

    const colors = NODE_COLORS[node.type] || NODE_COLORS.aws;
    const doc = RESOURCE_DOCS[node.resourceType];
    const tips = LEARNING_TIPS[node.type] || [];

    const propsHtml = Object.keys(node.properties).length > 0
      ? `<div class="mt-2"><div class="text-xs uppercase font-bold opacity-50">Properties</div>
         <div class="text-xs opacity-70 mt-1">${Object.entries(node.properties).map(([k, v]) => `${k}: ${v}`).join('<br>')}</div></div>`
      : '';

    const connsHtml = node.connections.length > 0
      ? `<div class="mt-2"><div class="text-xs uppercase font-bold opacity-50">Connections</div>
         <div class="text-xs opacity-70 mt-1">${node.connections.map(c => `→ ${c}`).join('<br>')}</div></div>`
      : '';

    const docHtml = doc
      ? `<div class="mt-2"><div class="text-xs opacity-70">${doc.description}</div>
         <a href="${doc.url}" target="_blank" class="text-xs text-blue-400 hover:underline mt-1 inline-block">📖 Documentation</a></div>`
      : '';

    const tipsHtml = tips.length > 0
      ? `<div class="mt-3 p-2 rounded" style="background: ${colors.border}20; border: 1px solid ${colors.border}40">
         <div class="text-xs font-bold" style="color: ${colors.text}">💡 Tips</div>
         <div class="text-xs opacity-70 mt-1">${tips.map(t => `• ${t}`).join('<br>')}</div></div>`
      : '';

    this.detailsEl.innerHTML = `
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Resource</div>
        <div class="font-bold" style="color: ${colors.text}">${node.resourceType}</div>
      </div>
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">Name</div>
        <div>${node.name}</div>
      </div>
      <div class="mb-2">
        <div class="text-xs uppercase font-bold opacity-50">ID</div>
        <div class="text-xs font-mono opacity-70">${node.id}</div>
      </div>
      ${docHtml}${propsHtml}${connsHtml}${tipsHtml}
    `;
  }

  destroy(): void {
    if (this.animationId) cancelAnimationFrame(this.animationId);
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
