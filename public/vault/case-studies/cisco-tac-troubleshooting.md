# Troubleshooting under pressure

> This case study is a generalized composite of the troubleshooting patterns I used in Cisco TAC. Customer, topology, and incident details are intentionally anonymized; it describes the method, not a specific customer's record.

## The situation

An intermittent reachability problem appeared after a routing change. The initial report mixed several symptoms, including timeouts, incomplete paths, and inconsistent results between locations. The first challenge was not finding a command. It was turning an ambiguous incident into a small set of falsifiable hypotheses while keeping the production risk low.

## My approach

### 1. Establish the failure boundary

I started with a precise matrix: source, destination, protocol, direction, first observed time, and whether the result was consistently reproducible. Comparing a failing flow with a known-good flow removed unrelated devices and features from the investigation.

### 2. Separate control plane from data plane

I checked whether the expected routes existed and whether their attributes and next hops were stable. Then I compared that view with the forwarding decision actually used for the affected traffic. This distinction matters: a healthy routing table does not prove that packets follow the intended path.

### 3. Test hypotheses with aligned evidence

Rather than collecting broad command output, each capture answered one question. Route state, interface counters, adjacency state, timestamps, and targeted packet captures were aligned around the same failing attempt. That made it possible to distinguish a routing-policy problem from loss, asymmetric forwarding, or an endpoint issue.

### 4. Keep every change rollback-safe

Potential mitigations were ranked by blast radius and reversibility. Before a production change, I defined the expected signal, a validation window, and the exact rollback condition. The final recommendation included both the technical action and the evidence needed to confirm it.

## Why this worked

The useful output was not a wall of diagnostics. It was a compact chain of evidence:

1. the failure could be reproduced under known conditions;
2. the control-plane state was compared with the forwarding behavior;
3. competing explanations were eliminated one by one;
4. the proposed action had explicit validation and rollback criteria.

That structure made the next decision clear to both the engineering team and the people coordinating the incident.

## What I carried forward

- Define the failure boundary before increasing the volume of telemetry.
- Compare failing and healthy paths whenever possible.
- Make each diagnostic step answer a named hypothesis.
- Communicate confidence, unknowns, and rollback conditions, not just commands.
- Leave behind a reusable evidence timeline for the next engineer.
