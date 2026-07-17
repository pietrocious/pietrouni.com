# Inside the IaC Visualizer

The IaC Visualizer turns pasted Terraform or Kubernetes configuration into an interactive dependency graph. I built it to answer a practical question quickly: **what depends on what, without mentally tracing every reference across a file?**

## From source to graph

The visualizer uses a deliberately lightweight client-side pipeline:

1. **Detect the source type.** Terraform resource blocks and Kubernetes fields such as `apiVersion` and `kind` contribute signals. The stronger score selects the parser.
2. **Extract resources.** Terraform blocks become nodes with their type, name, properties, and referenced resources. Kubernetes documents become nodes identified by kind and metadata.
3. **Infer relationships.** Explicit Terraform references create edges. For Kubernetes, selectors and common relationships connect workloads, Services, Ingresses, ConfigMaps, and Secrets.
4. **Lay out by dependency.** The graph is arranged in layers so upstream resources read from left to right. Existing positions are retained where possible when the source changes.
5. **Render and inspect.** A canvas view supports navigation and focused inspection, and the current diagram can be exported as a PNG.

## Why a lightweight parser

The tool is an explainer embedded in a static portfolio, not a replacement for Terraform or a Kubernetes API server. A focused parser keeps the interaction instant, private, and deployable without a backend: the source stays in the browser and there is no account or upload step.

That decision has an honest boundary. It handles the common structures needed for visualization, but it is not a complete HCL or YAML implementation. Advanced expressions, templating, generated manifests, and provider-specific semantics can require a real language parser or evaluated plan.

## Design decisions

### Make inference visible

Edges should be understandable, not mysterious. Relationships come from explicit references or recognizable platform conventions, which makes incorrect inference easier to spot.

### Preserve the user's mental map

Rebuilding a layout from scratch after every edit makes comparison difficult. Retaining node positions where possible lets the graph feel stable while the infrastructure changes.

### Degrade usefully

Partial understanding is still valuable. A resource can remain visible even when every property or edge cannot be resolved. The UI favors a useful graph plus clear limitations over pretending to provide compiler-level certainty.

## What I would add next

- Parse Terraform plan JSON for evaluated, module-aware relationships.
- Use a standards-compliant YAML parser for multi-document and templated manifests.
- Surface the evidence behind each inferred edge.
- Add graph diffing so reviewers can compare infrastructure changes visually.
- Move layout work to a Web Worker for very large configurations.

The current version demonstrates the core product idea: translate infrastructure source into a visual model quickly enough to support exploration, review, and explanation.

