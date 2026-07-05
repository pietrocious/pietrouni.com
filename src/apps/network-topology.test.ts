import { describe, it, expect } from 'vitest';
import { parseTopology, detectFormat } from './network-topology';

const LLDP_SNIPPET = `# LLDP Neighbors - CORE-SW-01
Device ID           Local Intf     Hold-time  Capability      Port ID
CORE-RTR-01         Gi0/1          120        R               Gi0/0
DIST-SW-01          Gi0/2          120        B               Gi1/0/24
SERVER-01           Gi0/9          120        S               eth0

# LLDP Neighbors - DIST-SW-01
Device ID           Local Intf     Hold-time  Capability      Port ID
CORE-SW-01          Gi1/0/24       120        B               Gi0/2
ACCESS-SW-03        Gi1/0/1        120        B               Gi1/0/48`;

const CDP_SNIPPET = `-------------------------
Device ID: CORE-RTR-01
Entry address(es):
  IP address: 10.0.0.1
Platform: Cisco ISR4451-X,  Capabilities: Router
Interface: GigabitEthernet0/0/0,  Port ID (outgoing port): GigabitEthernet0/0
Holdtime : 157 sec`;

const ROUTING_SNIPPET = `Codes: C - connected, S - static, R - RIP, O - OSPF, B - BGP

Gateway of last resort is 10.0.0.254 to network 0.0.0.0

C    10.0.0.0/24 is directly connected, GigabitEthernet0/0
O    10.1.0.0/16 [110/20] via 10.0.0.1, 00:45:12, GigabitEthernet0/0
S*   0.0.0.0/0 [1/0] via 10.0.0.254`;

describe('detectFormat', () => {
  it('detects LLDP output', () => {
    expect(detectFormat(LLDP_SNIPPET)).toBe('lldp');
  });

  it('detects CDP output', () => {
    expect(detectFormat(CDP_SNIPPET)).toBe('cdp');
  });

  it('detects routing tables', () => {
    expect(detectFormat(ROUTING_SNIPPET)).toBe('routing');
  });

  it('returns unknown for unrecognised input', () => {
    expect(detectFormat('hello world')).toBe('unknown');
  });
});

describe('parseTopology (lldp)', () => {
  const parsed = parseTopology(LLDP_SNIPPET);
  const ids = parsed.devices.map(d => d.id);

  it('uses the full device name from header comments', () => {
    expect(ids).toContain('CORE-SW-01');
    expect(ids).toContain('DIST-SW-01');
  });

  it('creates each device exactly once', () => {
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('dedupes the reverse entry of an already-known link', () => {
    const coreToDist = parsed.links.filter(l =>
      (l.source === 'CORE-SW-01' && l.target === 'DIST-SW-01') ||
      (l.source === 'DIST-SW-01' && l.target === 'CORE-SW-01')
    );
    expect(coreToDist).toHaveLength(1);
  });

  it('classifies devices from capability codes and names', () => {
    const byId = new Map(parsed.devices.map(d => [d.id, d]));
    expect(byId.get('CORE-RTR-01')!.type).toBe('router');
    expect(byId.get('SERVER-01')!.type).toBe('server');
    expect(byId.get('DIST-SW-01')!.type).toBe('switch');
  });

  it('infers link types from capability codes', () => {
    const routerLink = parsed.links.find(l => l.target === 'CORE-RTR-01')!;
    const serverLink = parsed.links.find(l => l.target === 'SERVER-01')!;
    expect(routerLink.type).toBe('routed');
    expect(serverLink.type).toBe('access');
  });
});

describe('parseTopology (cdp)', () => {
  const parsed = parseTopology(CDP_SNIPPET);

  it('parses neighbour entries with IP and platform', () => {
    const rtr = parsed.devices.find(d => d.id === 'CORE-RTR-01')!;
    expect(rtr.ip).toBe('10.0.0.1');
    expect(rtr.platform).toContain('ISR4451');
    expect(rtr.type).toBe('router');
  });

  it('links neighbours to the local device', () => {
    expect(parsed.links).toHaveLength(1);
    expect(parsed.links[0].source).toBe('LOCAL-DEVICE');
    expect(parsed.links[0].target).toBe('CORE-RTR-01');
  });
});

describe('parseTopology (routing)', () => {
  const parsed = parseTopology(ROUTING_SNIPPET);

  it('creates cloud nodes for connected networks', () => {
    const net = parsed.devices.find(d => d.name === '10.0.0.0/24');
    expect(net).toBeDefined();
    expect(net!.type).toBe('cloud');
  });

  it('creates router nodes for next hops', () => {
    const hops = parsed.devices.filter(d => d.id.startsWith('NH-'));
    expect(hops.map(h => h.name).sort()).toEqual(['10.0.0.1', '10.0.0.254']);
    hops.forEach(h => expect(h.type).toBe('router'));
  });

  it('links everything to the local router', () => {
    parsed.links.forEach(l => expect(l.source).toBe('LOCAL-ROUTER'));
  });
});
