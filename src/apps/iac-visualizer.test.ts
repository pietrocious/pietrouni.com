import { describe, it, expect } from 'vitest';
import { parseIaC, detectFormat } from './iac-visualizer';

const TERRAFORM_SNIPPET = `
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = { Name = "main-vpc" }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id
}
`;

const K8S_SNIPPET = `
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
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-app-config
  namespace: production
`;

describe('detectFormat', () => {
  it('detects Terraform HCL', () => {
    expect(detectFormat(TERRAFORM_SNIPPET)).toBe('terraform');
  });

  it('detects Kubernetes YAML', () => {
    expect(detectFormat(K8S_SNIPPET)).toBe('kubernetes');
  });

  it('returns unknown for unrecognised input', () => {
    expect(detectFormat('hello world')).toBe('unknown');
  });
});

describe('parseIaC (terraform)', () => {
  const parsed = parseIaC(TERRAFORM_SNIPPET);

  it('parses all resources', () => {
    expect(parsed.format).toBe('terraform');
    expect(parsed.errors).toEqual([]);
    expect(parsed.nodes.map(n => n.id)).toEqual([
      'aws_vpc.main',
      'aws_subnet.public',
      'aws_instance.web',
    ]);
  });

  it('classifies resource types', () => {
    const byId = new Map(parsed.nodes.map(n => [n.id, n]));
    expect(byId.get('aws_vpc.main')!.type).toBe('network');
    expect(byId.get('aws_subnet.public')!.type).toBe('network');
    expect(byId.get('aws_instance.web')!.type).toBe('compute');
  });

  it('resolves references as connections', () => {
    const subnet = parsed.nodes.find(n => n.id === 'aws_subnet.public')!;
    const instance = parsed.nodes.find(n => n.id === 'aws_instance.web')!;
    expect(subnet.connections).toContain('aws_vpc.main');
    expect(instance.connections).toContain('aws_subnet.public');
  });

  it('extracts string properties', () => {
    const vpc = parsed.nodes.find(n => n.id === 'aws_vpc.main')!;
    expect(vpc.properties.cidr_block).toBe('10.0.0.0/16');
  });

  it('reports an error when no resources are found', () => {
    const bad = parseIaC('resource "incomplete');
    expect(bad.nodes).toHaveLength(0);
    expect(bad.errors.length).toBeGreaterThan(0);
  });
});

describe('parseIaC (kubernetes)', () => {
  const parsed = parseIaC(K8S_SNIPPET);

  it('parses each YAML document', () => {
    expect(parsed.format).toBe('kubernetes');
    expect(parsed.nodes.map(n => n.id)).toEqual([
      'Deployment/web-app',
      'Service/web-app-service',
      'ConfigMap/web-app-config',
    ]);
  });

  it('captures namespace and replicas', () => {
    const deploy = parsed.nodes.find(n => n.id === 'Deployment/web-app')!;
    expect(deploy.properties.namespace).toBe('production');
    expect(deploy.properties.replicas).toBe(3);
  });

  it('links services to their deployment by name prefix', () => {
    const svc = parsed.nodes.find(n => n.id === 'Service/web-app-service')!;
    expect(svc.connections).toContain('Deployment/web-app');
  });

  it('links configmaps to deployments in the same namespace', () => {
    const cm = parsed.nodes.find(n => n.id === 'ConfigMap/web-app-config')!;
    expect(cm.connections).toContain('Deployment/web-app');
  });
});
