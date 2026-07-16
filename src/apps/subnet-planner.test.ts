import { describe, it, expect } from 'vitest';
import {
  ipToInt, intToIp, isValidIp, parseCIDR, blockStats, prefixForHosts,
  createRoot, splitNode, joinNode, collectLeaves, isLeaf, planVLSM,
  detectPlanMode, parsePlanInput, inferTag, addressCount,
} from './subnet-planner';

describe('ipToInt / intToIp', () => {
  it('round-trips a normal address', () => {
    expect(intToIp(ipToInt('192.168.1.10'))).toBe('192.168.1.10');
  });

  it('round-trips the edges of the space', () => {
    expect(intToIp(ipToInt('0.0.0.0'))).toBe('0.0.0.0');
    expect(intToIp(ipToInt('255.255.255.255'))).toBe('255.255.255.255');
  });

  it('rejects malformed input', () => {
    expect(Number.isNaN(ipToInt('10.0.0'))).toBe(true);
    expect(Number.isNaN(ipToInt('10.0.0.256'))).toBe(true);
    expect(Number.isNaN(ipToInt('not an ip'))).toBe(true);
  });

  it('isValidIp mirrors ipToInt validity', () => {
    expect(isValidIp('10.0.0.1')).toBe(true);
    expect(isValidIp('10.0.0.999')).toBe(false);
  });
});

describe('parseCIDR', () => {
  it('normalizes host bits down to the network address', () => {
    const result = parseCIDR('10.0.5.3/24');
    expect(result).not.toBeNull();
    expect(intToIp(result!.base)).toBe('10.0.5.0');
    expect(result!.prefix).toBe(24);
  });

  it('handles /0 and /32 edge cases', () => {
    expect(parseCIDR('0.0.0.0/0')).toEqual({ base: 0, prefix: 0 });
    const host = parseCIDR('10.0.0.5/32')!;
    expect(intToIp(host.base)).toBe('10.0.0.5');
  });

  it('rejects invalid CIDR strings', () => {
    expect(parseCIDR('not a cidr')).toBeNull();
    expect(parseCIDR('10.0.0.0/33')).toBeNull();
    expect(parseCIDR('10.0.0.0')).toBeNull();
  });
});

describe('blockStats', () => {
  it('computes a standard /24', () => {
    const base = parseCIDR('192.168.1.0/24')!;
    const stats = blockStats(base.base, base.prefix);
    expect(stats.netmask).toBe('255.255.255.0');
    expect(stats.network).toBe('192.168.1.0');
    expect(stats.broadcast).toBe('192.168.1.255');
    expect(stats.firstHost).toBe('192.168.1.1');
    expect(stats.lastHost).toBe('192.168.1.254');
    expect(stats.usableHosts).toBe(254);
    expect(stats.totalAddresses).toBe(256);
  });

  it('treats /31 as a point-to-point link (RFC 3021)', () => {
    const base = parseCIDR('10.0.0.0/31')!;
    const stats = blockStats(base.base, base.prefix);
    expect(stats.usableHosts).toBe(2);
    expect(stats.firstHost).toBe('10.0.0.0');
    expect(stats.lastHost).toBe('10.0.0.1');
  });

  it('treats /32 as a single host route', () => {
    const base = parseCIDR('10.0.0.5/32')!;
    const stats = blockStats(base.base, base.prefix);
    expect(stats.usableHosts).toBe(1);
    expect(stats.firstHost).toBe(stats.lastHost);
  });
});

describe('prefixForHosts', () => {
  it('finds the smallest block that fits', () => {
    expect(prefixForHosts(1)).toBe(32);
    expect(prefixForHosts(2)).toBe(31);
    expect(prefixForHosts(20)).toBe(27);
    expect(prefixForHosts(254)).toBe(24);
    expect(prefixForHosts(500)).toBe(23);
    expect(prefixForHosts(65534)).toBe(16);
  });
});

describe('tree structural operations', () => {
  it('split then join returns to a single leaf', () => {
    const root = createRoot(parseCIDR('10.0.0.0/24')!.base, 24);
    expect(isLeaf(root)).toBe(true);
    expect(splitNode(root)).toBe(true);
    expect(isLeaf(root)).toBe(false);
    expect(collectLeaves(root)).toHaveLength(2);
    expect(joinNode(root)).toBe(true);
    expect(isLeaf(root)).toBe(true);
  });

  it('refuses to split a /32', () => {
    const root = createRoot(parseCIDR('10.0.0.5/32')!.base, 32);
    expect(splitNode(root)).toBe(false);
  });

  it('refuses to join when a child is itself split', () => {
    const root = createRoot(parseCIDR('10.0.0.0/24')!.base, 24);
    splitNode(root);
    splitNode(root.left!);
    expect(joinNode(root)).toBe(false);
  });

  it('left/right children exactly tile the parent range with no gap or overlap', () => {
    const root = createRoot(parseCIDR('10.0.0.0/24')!.base, 24);
    splitNode(root);
    expect(root.left!.base).toBe(root.base);
    expect(root.right!.base).toBe(root.base + addressCount(root.left!.prefix));
    expect(addressCount(root.left!.prefix) + addressCount(root.right!.prefix)).toBe(addressCount(root.prefix));
  });
});

describe('planVLSM', () => {
  const base = parseCIDR('10.0.0.0/16')!;
  const requests = [
    { name: 'Engineering', hosts: 500, tag: inferTag('Engineering') },
    { name: 'Sales', hosts: 220, tag: inferTag('Sales') },
    { name: 'Guest-WiFi', hosts: 60, tag: inferTag('Guest-WiFi') },
    { name: 'Voice', hosts: 40, tag: inferTag('Voice') },
    { name: 'Servers', hosts: 20, tag: inferTag('Servers') },
    { name: 'Point-to-Point-WAN', hosts: 2, tag: inferTag('Point-to-Point-WAN') },
  ];

  it('allocates every request with no errors', () => {
    const { errors } = planVLSM(base, requests);
    expect(errors).toEqual([]);
  });

  it('gives each request a block sized to exactly fit its host count', () => {
    const { root } = planVLSM(base, requests);
    const leaves = collectLeaves(root);
    const byName = new Map(leaves.filter(l => l.label).map(l => [l.label, l]));
    expect(byName.get('Engineering')!.prefix).toBe(23);
    expect(byName.get('Sales')!.prefix).toBe(24);
    expect(byName.get('Guest-WiFi')!.prefix).toBe(26);
    expect(byName.get('Voice')!.prefix).toBe(26);
    expect(byName.get('Servers')!.prefix).toBe(27);
    expect(byName.get('Point-to-Point-WAN')!.prefix).toBe(31);
  });

  it('never overlaps allocations and always fully tiles the base network', () => {
    const { root } = planVLSM(base, requests);
    const leaves = collectLeaves(root).slice().sort((a, b) => a.base - b.base);
    for (let i = 0; i < leaves.length - 1; i++) {
      expect(leaves[i].base + addressCount(leaves[i].prefix)).toBeLessThanOrEqual(leaves[i + 1].base);
    }
    const totalTiled = leaves.reduce((sum, l) => sum + addressCount(l.prefix), 0);
    expect(totalTiled).toBe(addressCount(base.prefix));
  });

  it('reports an error when a request is larger than the entire base network', () => {
    const { errors } = planVLSM(parseCIDR('10.0.0.0/28')!, [{ name: 'TooBig', hosts: 5000, tag: 'lan' }]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('TooBig');
  });

  it('reports an error when requests together exceed the free space', () => {
    const tight = parseCIDR('10.0.0.0/24')!;
    const { errors } = planVLSM(tight, [
      { name: 'A', hosts: 200, tag: 'lan' },
      { name: 'B', hosts: 200, tag: 'lan' },
    ]);
    expect(errors.length).toBe(1);
  });
});

describe('inferTag', () => {
  it('infers common categories from the name', () => {
    expect(inferTag('Guest-WiFi')).toBe('guest');
    expect(inferTag('Voice-VLAN')).toBe('voice');
    expect(inferTag('Public-Web')).toBe('dmz');
    expect(inferTag('Mgmt-Bastion')).toBe('mgmt');
    expect(inferTag('Point-to-Point-WAN')).toBe('wan');
    expect(inferTag('Data-DB')).toBe('storage');
    expect(inferTag('App-Servers')).toBe('server');
    expect(inferTag('Engineering')).toBe('lan');
  });
});

describe('detectPlanMode', () => {
  it('detects manual mode for a single CIDR line', () => {
    expect(detectPlanMode('10.0.0.0/16')).toBe('manual');
  });

  it('detects vlsm mode when requirement lines follow', () => {
    expect(detectPlanMode('10.0.0.0/16\nEngineering 500')).toBe('vlsm');
  });

  it('ignores comment lines', () => {
    expect(detectPlanMode('# a comment\n10.0.0.0/16')).toBe('manual');
  });

  it('returns unknown for garbage input', () => {
    expect(detectPlanMode('hello world')).toBe('unknown');
  });
});

describe('parsePlanInput', () => {
  it('parses a base network with requirement lines', () => {
    const parsed = parsePlanInput('10.0.0.0/16\nEngineering 500\nSales 220');
    expect(parsed.base).toEqual({ base: parseCIDR('10.0.0.0/16')!.base, prefix: 16 });
    expect(parsed.requests).toHaveLength(2);
    expect(parsed.errors).toEqual([]);
  });

  it('flags an invalid base network', () => {
    const parsed = parsePlanInput('not-a-network');
    expect(parsed.base).toBeNull();
    expect(parsed.errors.length).toBe(1);
  });

  it('flags a malformed requirement line without failing the whole parse', () => {
    const parsed = parsePlanInput('10.0.0.0/16\nEngineering');
    expect(parsed.base).not.toBeNull();
    expect(parsed.requests).toHaveLength(0);
    expect(parsed.errors.length).toBe(1);
  });
});
