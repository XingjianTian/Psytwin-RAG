# WebUI Knowledge Graph Layout

Updated: 2026-06-25

This document describes the LightRAG WebUI knowledge graph layout behavior used for dense domain graphs.

## Goals

The graph viewer is optimized for knowledge bases with hundreds of nodes and many short semantic relations. The layout should:

- reduce node overlap on first render;
- keep communities visually separated;
- avoid excessive label collisions;
- keep important nodes discoverable;
- preserve existing search, focus, expand, prune, and property-panel workflows.

## Initial Node Placement

Nodes are initialized with a deterministic golden-angle spiral instead of random coordinates in a small unit square.

Benefits:

- first render starts from a readable distribution;
- repeated loads are visually stable for the same graph;
- high-degree nodes are given slightly more space before the force layout runs.

Implementation:

```text
lightrag_webui/src/hooks/useLightragGraph.tsx
```

## Automatic Layout

The graph viewer runs a two-stage layout after a graph is bound to Sigma:

1. `ForceAtlas2` separates communities and hub structures.
2. `Noverlap` removes remaining node collisions.

Default behavior uses at least 80 layout iterations even if the user setting is lower. This avoids dense graphs collapsing into a central cluster.

Implementation:

```text
lightrag_webui/src/components/graph/GraphControl.tsx
```

## Manual Layout Controls

The layout control now defaults to `Force Atlas`, which is more suitable for dense knowledge graphs than a circular layout.

The manual `Noverlaps` option also uses a larger margin and grid size so users can clean up visible collisions after expanding nodes.

Implementation:

```text
lightrag_webui/src/components/graph/LayoutsControl.tsx
```

## Label Strategy

The viewer keeps node labels enabled, but the node reducer hides labels for ordinary low-degree nodes.

Labels remain visible when a node is:

- selected;
- focused by hover or search;
- a neighbor of the selected/focused node;
- high-degree enough to act as a graph hub.

This keeps dense Chinese or multilingual labels from covering the graph while preserving context during exploration.

Implementation:

```text
lightrag_webui/src/components/graph/GraphControl.tsx
lightrag_webui/src/features/GraphViewer.tsx
```

## Visual Styling

The graph canvas uses:

- smaller default node sizes;
- softer disabled-node and edge colors;
- amber highlights for selection and focus;
- a light grid and radial background to improve spatial orientation.

Implementation:

```text
lightrag_webui/src/lib/constants.ts
lightrag_webui/src/features/GraphViewer.tsx
```

## Verification

Build the WebUI:

```bash
cd lightrag_webui
bun install --frozen-lockfile
bun run build
```

Or, in local Node.js environments:

```bash
cd lightrag_webui
npm install --no-package-lock --legacy-peer-deps
npm run build
```

Rebuild the API/WebUI container:

```bash
docker compose up -d --build lightrag
```

Check the API:

```bash
curl -H "X-API-Key: <your-light-rag-api-key>" \
  "http://localhost:9621/graphs?label=*&max_depth=3&max_nodes=1000"
```
