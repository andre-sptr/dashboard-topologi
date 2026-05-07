# Implementation Plan: Google Slides SVG Enhancement Pipeline

> **Tujuan**: Menerima file `.svg` yang diexport dari Google Slides/Docs, lalu secara otomatis menganalisis kontennya dan me-render ulang versi yang jauh lebih bagus secara visual — tetap faithful terhadap struktur topologi asli.

---

## Gambaran Arsitektur Baru

```
User Upload SVG (dari Google Slides)
        │
        ▼
[Phase 1] Smart SVG Parser
   - Deteksi elemen topologi (node, link, label)
   - Ekstrak struktur graph (siapa terhubung ke siapa)
   - Baca metadata: warna, posisi, hierarki
        │
        ▼
[Phase 2] Topology Reconstructor
   - Convert raw SVG shapes → typed NetworkNode & NetworkEdge
   - Infer node type dari shape/label (router, switch, POP, dll)
   - Build adjacency graph
        │
        ▼
[Phase 3] AI-Powered Enhancer (via Anthropic API)
   - Kirim graph structure ke Claude
   - Claude menganalisis dan menghasilkan enhanced metadata
   - Tambahkan: node types, bandwidth estimates, status, labels
        │
        ▼
[Phase 4] Premium Renderer
   - Render ulang dengan visual premium (custom SVG + CSS)
   - Animasi data-flow, status indicators, tooltip interaktif
   - Simpan ke database via existing API
```

---

## Phase 1 — Smart SVG Parser (Upgrade `svgParser.ts`)

### Masalah Saat Ini

`parseSvgContent` hanya memflattening semua elemen SVG tanpa memahami **semantik topologi**. Google Slides menghasilkan SVG dengan grup `<g>` berlapis yang merepresentasikan shapes, connectors, dan teks — bukan elemen topologi langsung.

### Solusi: Google Slides SVG Semantic Parser

**File baru**: `src/utils/googleSlidesSvgParser.ts`

```typescript
// Struktur data hasil parsing
interface ParsedTopologyGraph {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  viewBox: string;
  originalBounds: { width: number; height: number };
  rawAssets: Asset[];
}

interface ParsedNode {
  id: string;
  label: string;
  shape: 'rect' | 'circle' | 'ellipse' | 'polygon' | 'custom';
  bounds: { x: number; y: number; width: number; height: number };
  fillColor: string;
  strokeColor: string;
  fontSize?: number;
  rawElement: string; // original SVG outerHTML untuk fallback
}

interface ParsedEdge {
  id: string;
  sourceNodeId: string | null;   // null jika tidak bisa di-resolve
  targetNodeId: string | null;
  label?: string;
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray?: string;      // dashed = backup link
  points: Array<{ x: number; y: number }>;
  arrowMarker?: 'start' | 'end' | 'both';
}
```

**Algoritma Deteksi Node vs Edge:**

```typescript
// Heuristik untuk membedakan elemen di Google Slides SVG:

// NODE: Shape yang memiliki fill solid + teks label di dalamnya atau bersebelahan
const isNodeElement = (el: Element): boolean => {
  const hasFill = el.getAttribute('fill') && el.getAttribute('fill') !== 'none';
  const hasSignificantArea = getArea(el) > MINIMUM_NODE_AREA_THRESHOLD;
  const isNotConnector = !isLikelyConnector(el);
  return hasFill && hasSignificantArea && isNotConnector;
};

// EDGE: Path/line dengan stroke tapi fill=none, atau polyline
const isEdgeElement = (el: Element): boolean => {
  const fillIsNone = !el.getAttribute('fill') || el.getAttribute('fill') === 'none';
  const hasStroke = el.getAttribute('stroke') && el.getAttribute('stroke') !== 'none';
  const tagName = el.tagName.toLowerCase();
  return (fillIsNone && hasStroke) || tagName === 'line' || tagName === 'polyline';
};

// Teknik proximity: teks yang paling dekat dengan suatu shape = label node tersebut
const associateLabelsToNodes = (nodes: ParsedNode[], texts: TextElement[]): void => {
  texts.forEach(text => {
    const nearest = findNearestNode(text.centerX, text.centerY, nodes);
    if (nearest && distanceTo(text, nearest) < LABEL_PROXIMITY_THRESHOLD) {
      nearest.label = text.content;
    }
  });
};

// Teknik endpoint: ujung-ujung edge diperiksa overlapping dengan node mana
const resolveEdgeEndpoints = (edges: ParsedEdge[], nodes: ParsedNode[]): void => {
  edges.forEach(edge => {
    const startPoint = edge.points[0];
    const endPoint = edge.points[edge.points.length - 1];
    edge.sourceNodeId = findNodeAtPoint(startPoint, nodes)?.id ?? null;
    edge.targetNodeId = findNodeAtPoint(endPoint, nodes)?.id ?? null;
  });
};
```

**Yang perlu di-implement:**
- [ ] `detectShapeType(element)` — rect/circle/ellipse/path heuristic
- [ ] `extractColorInfo(element)` — resolve fill dari inline style, attribute, atau CSS class
- [ ] `getElementBounds(element)` — unified bounding box untuk semua shape types
- [ ] `findNearestNode(x, y, nodes)` — KD-tree sederhana atau brute force untuk dataset kecil
- [ ] `resolveEdgeEndpoints(edges, nodes)` — endpoint proximity matching
- [ ] `parseGoogleSlidesSpecificStructure(doc)` — handle quirks dari export Google Slides (namespace, transform matrices yang nested)

---

## Phase 2 — Topology Type Inferencer

**File baru**: `src/utils/topologyInferencer.ts`

Google Slides topology diagram biasanya menggunakan warna dan bentuk yang sudah konvensional. Kita bisa meng-infer node type dari visual cues:

```typescript
interface InferenceRule {
  name: string;
  priority: number;
  match: (node: ParsedNode) => boolean;
  result: NodeType;
}

const INFERENCE_RULES: InferenceRule[] = [
  // Berdasarkan label text
  { name: 'label-router',    priority: 10, match: n => /router|RTR|PE-/i.test(n.label),       result: 'router' },
  { name: 'label-switch',    priority: 10, match: n => /switch|SW|BTM-/i.test(n.label),        result: 'switch' },
  { name: 'label-pop',       priority: 10, match: n => /POP|BTN|[A-Z]{3}[AB]$/i.test(n.label), result: 'pop' },
  { name: 'label-server',    priority: 10, match: n => /server|CDN|BB/i.test(n.label),          result: 'server' },
  { name: 'label-firewall',  priority: 10, match: n => /FW|firewall|WAG|WAC|PCEF/i.test(n.label), result: 'firewall' },
  
  // Berdasarkan warna fill (common network diagram conventions)
  { name: 'color-blue',   priority: 5, match: n => isBlueish(n.fillColor),  result: 'router' },
  { name: 'color-green',  priority: 5, match: n => isGreenish(n.fillColor), result: 'switch' },
  { name: 'color-orange', priority: 5, match: n => isOrange(n.fillColor),   result: 'server' },
  { name: 'color-red',    priority: 5, match: n => isReddish(n.fillColor),  result: 'firewall' },
  
  // Berdasarkan shape
  { name: 'shape-cylinder', priority: 3, match: n => isCylinderShape(n.rawElement), result: 'server' },
  { name: 'shape-diamond',  priority: 3, match: n => isDiamondShape(n.rawElement),  result: 'router' },
  { name: 'shape-circle',   priority: 2, match: n => n.shape === 'circle',           result: 'pop' },
  { name: 'shape-rect',     priority: 1, match: n => n.shape === 'rect',             result: 'switch' },
];

// Apply rules in priority order, take highest matching
export const inferNodeType = (node: ParsedNode): NodeType => {
  const matchingRules = INFERENCE_RULES
    .filter(rule => rule.match(node))
    .sort((a, b) => b.priority - a.priority);
  return matchingRules[0]?.result ?? 'pop';
};

// Infer edge type
export const inferEdgeType = (edge: ParsedEdge): EdgeType => {
  if (edge.strokeDasharray) return 'ethernet'; // dashed biasanya secondary/backup
  if (edge.strokeWidth > 3) return 'fiber';    // thick line = fiber
  return 'ethernet';
};
```

---

## Phase 3 — AI-Powered Enhancement (Fitur Baru Utama)

**File baru**: `src/utils/aiEnhancer.ts`

Ini adalah fitur pembeda utama. Setelah parsing, kirim struktur graph ke Claude API untuk analisis dan enrichment.

```typescript
interface AIEnhancementRequest {
  nodes: Array<{
    id: string;
    label: string;
    inferredType: NodeType;
    fillColor: string;
    position: { x: number; y: number };
  }>;
  edges: Array<{
    id: string;
    sourceId: string | null;
    targetId: string | null;
    label?: string;
    isDashed: boolean;
  }>;
  contextHint?: string; // misal: "ISP backbone topology Indonesia"
}

interface AIEnhancementResult {
  nodes: Array<{
    id: string;
    confirmedType: NodeType;
    status: NodeStatus;
    data: {
      description: string;
      vendor?: string;
      location?: string;
      estimatedBandwidth?: number;
    };
  }>;
  edges: Array<{
    id: string;
    confirmedType: EdgeType;
    connectionType: ConnectionType;
    data: {
      estimatedLatency: number;
      estimatedUtilization: number;
      protocol?: string;
    };
  }>;
  networkSummary: string;
}

export const enhanceWithAI = async (
  request: AIEnhancementRequest,
  apiKey?: string
): Promise<AIEnhancementResult> => {
  const prompt = buildEnhancementPrompt(request);
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // API key di-inject dari environment atau user setting
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
  });
  
  const data = await response.json();
  return parseAIResponse(data.content[0].text);
};

const buildEnhancementPrompt = (req: AIEnhancementRequest): string => `
You are a network topology expert. Analyze this network diagram structure and provide enriched metadata.

NODES (${req.nodes.length} total):
${req.nodes.map(n => `- ID: ${n.id}, Label: "${n.label}", Inferred type: ${n.inferredType}, Color: ${n.fillColor}`).join('\n')}

CONNECTIONS (${req.edges.length} total):
${req.edges.map(e => `- ${e.sourceId ?? '?'} → ${e.targetId ?? '?'}, Label: "${e.label ?? ''}", Dashed: ${e.isDashed}`).join('\n')}

${req.contextHint ? `Context: ${req.contextHint}` : ''}

For each node and edge, provide enriched metadata in this EXACT JSON format:
{
  "nodes": [
    {
      "id": "...",
      "confirmedType": "pop|router|switch|server|firewall|load-balancer",
      "status": "online|offline|warning|error",
      "data": {
        "description": "...",
        "vendor": "...",
        "location": "...",
        "estimatedBandwidth": 1000
      }
    }
  ],
  "edges": [
    {
      "id": "...",
      "confirmedType": "fiber|ethernet|wireless|vpn",
      "connectionType": "primary|backup|load-balanced",
      "data": {
        "estimatedLatency": 2,
        "estimatedUtilization": 65,
        "protocol": "MPLS"
      }
    }
  ],
  "networkSummary": "Brief description of this network topology"
}

Respond with ONLY the JSON, no other text.
`;
```

---

## Phase 4 — Premium SVG Renderer

**File baru**: `src/components/PremiumTopologyRenderer.tsx`

Ini adalah komponen renderer yang menggantikan `DraggableSvgItem` untuk tampilan yang jauh lebih premium.

### Visual Design System untuk Rendered Topology

```typescript
// Node visual configs per type
const NODE_VISUAL_CONFIG: Record<NodeType, NodeVisual> = {
  router: {
    shape: 'hexagon',
    gradient: ['#1e40af', '#3b82f6'],
    glowColor: 'rgba(59,130,246,0.4)',
    icon: '⬡',  // atau custom SVG icon path
    borderWidth: 2,
    size: { w: 80, h: 80 },
  },
  switch: {
    shape: 'roundedRect',
    gradient: ['#065f46', '#10b981'],
    glowColor: 'rgba(16,185,129,0.3)',
    icon: '▤',
    borderWidth: 2,
    size: { w: 90, h: 50 },
  },
  pop: {
    shape: 'circle',
    gradient: ['#4338ca', '#6366f1'],
    glowColor: 'rgba(99,102,241,0.4)',
    icon: '●',
    borderWidth: 3,
    size: { w: 60, h: 60 },
  },
  server: {
    shape: 'cylinder',   // custom SVG path untuk cylinder 2D
    gradient: ['#92400e', '#f59e0b'],
    glowColor: 'rgba(245,158,11,0.3)',
    icon: '⬛',
    borderWidth: 1,
    size: { w: 60, h: 80 },
  },
  firewall: {
    shape: 'shield',     // custom shield path
    gradient: ['#7f1d1d', '#ef4444'],
    glowColor: 'rgba(239,68,68,0.4)',
    icon: '🛡',
    borderWidth: 2,
    size: { w: 70, h: 80 },
  },
  'load-balancer': {
    shape: 'parallelogram',
    gradient: ['#4c1d95', '#8b5cf6'],
    glowColor: 'rgba(139,92,246,0.3)',
    icon: '⇄',
    borderWidth: 2,
    size: { w: 100, h: 50 },
  },
};
```

### Animated Edge Renderer

```typescript
// Komponen edge dengan animasi data-flow
const PremiumEdge = ({ edge, sourcePos, targetPos, type, status }: PremiumEdgeProps) => {
  const pathId = `edge-path-${edge.id}`;
  const animId = `edge-anim-${edge.id}`;
  
  // Bezier curve yang smooth
  const d = computeCubicBezier(sourcePos, targetPos);
  
  const isActive = status === 'active';
  const isDashed = edge.connectionType === 'backup';
  const edgeColor = EDGE_COLORS[type] ?? '#64748b';
  
  return (
    <g className="premium-edge">
      {/* Shadow / glow layer */}
      <path d={d} stroke={edgeColor} strokeWidth={8} strokeOpacity={0.15} fill="none" />
      
      {/* Main line */}
      <path
        id={pathId}
        d={d}
        stroke={edgeColor}
        strokeWidth={isDashed ? 1.5 : 2.5}
        strokeDasharray={isDashed ? '8 6' : undefined}
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Animated data-flow particle (hanya untuk active links) */}
      {isActive && (
        <>
          <circle r={4} fill={edgeColor} fillOpacity={0.9}>
            <animateMotion dur="2s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
          <circle r={2} fill="white" fillOpacity={0.7}>
            <animateMotion dur="2s" begin="0.3s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        </>
      )}
      
      {/* Label bandwidth di tengah edge */}
      {edge.data.bandwidth && (
        <EdgeLabel pathId={pathId} text={`${edge.data.bandwidth}G`} color={edgeColor} />
      )}
    </g>
  );
};
```

### Status Indicator per Node

```typescript
// Pulsing status dot
const StatusIndicator = ({ status, cx, cy }: { status: NodeStatus; cx: number; cy: number }) => {
  const colors: Record<NodeStatus, string> = {
    online: '#10b981',
    offline: '#475569',
    warning: '#f59e0b',
    error: '#ef4444',
  };
  const color = colors[status];
  
  return (
    <g>
      {/* Outer pulse ring (hanya untuk online) */}
      {status === 'online' && (
        <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity={0.3}>
          <animate attributeName="r" from={6} to={14} dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="fill-opacity" from={0.4} to={0} dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Solid dot */}
      <circle cx={cx} cy={cy} r={6} fill={color} />
    </g>
  );
};
```

---

## Phase 5 — Upload Flow UI Improvements

### Upgrade `SVGFileUpload.tsx`

Tambahkan pipeline step indicator saat upload berlangsung:

```
[1] Parsing SVG...     ████░░░░  40%
[2] Inferring types... ██████░░  70%
[3] AI Enhancement...  ████████  100%
[4] Rendering...       ████████  Done ✓
```

**Komponen baru**: `src/components/ui/UploadProgress.tsx`

```typescript
interface UploadStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

const UPLOAD_STEPS: UploadStep[] = [
  { id: 'parse',   label: 'Parsing SVG structure' },
  { id: 'infer',   label: 'Inferring topology types' },
  { id: 'ai',      label: 'AI Enhancement' },
  { id: 'render',  label: 'Generating premium render' },
  { id: 'save',    label: 'Saving to database' },
];
```

### Context Hint Input

Tambahkan optional text input untuk membantu AI understanding:

```typescript
// Contoh context hints yang bisa di-suggest ke user:
const CONTEXT_HINT_SUGGESTIONS = [
  "ISP backbone topology",
  "Data center network",
  "Campus network diagram",
  "Metro ethernet topology",
  "Enterprise WAN topology",
];
```

---

## Phase 6 — Side Panel: Before / After Comparison

**File baru**: `src/components/ComparisonPanel.tsx`

Setelah rendering selesai, tampilkan side-by-side comparison:

```
┌─────────────────────────────────────────────────────┐
│  ORIGINAL (Google Slides)  │   ENHANCED VERSION     │
│  ─────────────────────     │  ──────────────────    │
│  [raw SVG preview]         │  [premium render]      │
│                            │                        │
│  Nodes: 12                 │  Nodes: 12             │
│  Edges: 15                 │  Edges: 15 (typed)     │
│  Types: unknown            │  Types: inferred ✓     │
└─────────────────────────────────────────────────────┘
         [Use Original]        [Use Enhanced] ←default
```

---

## Phase 7 — Backend Enhancements

### Upgrade `server/index.ts`

Tambahkan endpoint baru untuk menyimpan enhanced topology:

```typescript
// POST /api/topologies/:id/enhance
// Menyimpan AI enhancement result ke topology yang sudah ada
app.post('/api/topologies/:id/enhance', async (req, res) => {
  const { id } = req.params;
  const { enhancedNodes, enhancedEdges, networkSummary } = req.body;
  
  const updated = await prisma.topology.update({
    where: { id },
    data: {
      enhancedData: JSON.stringify({ enhancedNodes, enhancedEdges }),
      networkSummary,
      isEnhanced: true,
      enhancedAt: new Date(),
    }
  });
  
  res.json(updated);
});
```

### Prisma Schema Update

```prisma
// prisma/schema.prisma - tambahkan fields baru

model Topology {
  id            String       @id @default(cuid())
  name          String
  viewBox       String?
  assets        String?
  createdAt     DateTime     @default(now())
  
  // NEW FIELDS
  isEnhanced    Boolean      @default(false)
  enhancedData  String?      // JSON: AI-enriched node/edge metadata  
  networkSummary String?     // AI-generated summary
  enhancedAt    DateTime?
  contextHint   String?      // User-provided context
  sourceType    String?      // "google_slides" | "manual" | "custom"
  
  elements      SvgElement[]
}

model SvgElement {
  id          String   @id @default(cuid())
  type        String
  props       String
  x           Float
  y           Float
  transform   String?
  zIndex      Int
  
  // NEW FIELDS
  inferredNodeType  String?  // NodeType dari inferencer
  enhancedMetadata  String?  // JSON: AI result per element
  
  topology    Topology @relation(fields: [topologyId], references: [id])
  topologyId  String
}
```

---

## Urutan Implementasi (Rekomendasi Sprint)

### Sprint 1 — Foundation (3-4 hari)
**Priority: HARUS dikerjakan duluan**

| Task | File | Estimasi |
|------|------|----------|
| Implement `googleSlidesSvgParser.ts` dengan shape detection | `src/utils/` | 2 hari |
| Unit test parser dengan beberapa sample SVG dari GSlides | `src/utils/__tests__/` | 0.5 hari |
| Update `SVGFileUpload.tsx` untuk trigger new parser | `src/components/ui/` | 0.5 hari |
| Update Prisma schema dengan fields baru | `prisma/schema.prisma` | 0.5 hari |

### Sprint 2 — Intelligence (2-3 hari)

| Task | File | Estimasi |
|------|------|----------|
| Implement `topologyInferencer.ts` dengan rule engine | `src/utils/` | 1 hari |
| Implement `aiEnhancer.ts` dengan Anthropic API call | `src/utils/` | 1 hari |
| Tambah `UploadProgress.tsx` step indicator UI | `src/components/ui/` | 0.5 hari |
| Tambah context hint input di upload flow | `src/components/ui/` | 0.5 hari |

### Sprint 3 — Premium Render (3-4 hari)

| Task | File | Estimasi |
|------|------|----------|
| Implement `PremiumTopologyRenderer.tsx` dengan node shapes | `src/components/` | 1.5 hari |
| Implement animated edge dengan `<animateMotion>` | dalam renderer | 1 hari |
| Implement `StatusIndicator` dengan pulse animation | dalam renderer | 0.5 hari |
| Tooltips & hover interactions per node | dalam renderer | 0.5 hari |

### Sprint 4 — Polish (2 hari)

| Task | File | Estimasi |
|------|------|----------|
| Implement `ComparisonPanel.tsx` before/after | `src/components/` | 1 hari |
| Backend endpoints baru (`/enhance`) | `server/index.ts` | 0.5 hari |
| Export enhanced topology sebagai SVG/PNG | `src/utils/` | 0.5 hari |

---

## Dependency Tambahan yang Diperlukan

```bash
# Untuk parsing SVG yang lebih robust
npm install svgson         # SVG → JSON parser yang handal

# Untuk tooltip interaktif
npm install @radix-ui/react-tooltip

# Untuk export PNG dari SVG
npm install html-to-image

# (Opsional) Untuk better path computation
npm install d3-shape d3-path
```

---

## Risiko & Mitigasi

| Risiko | Probabilitas | Dampak | Mitigasi |
|--------|-------------|--------|----------|
| Google Slides SVG structure berubah antar versi | Medium | High | Buat adapter pattern, support multiple GSlides export formats |
| AI inference tidak akurat untuk topology yang aneh | High | Medium | Tampilkan UI untuk manual override type setelah AI inference |
| Edge endpoint resolution gagal (ujung tidak tepat di atas node) | High | Medium | Tambahkan `fuzzy threshold` dan manual edge editor |
| Performance lambat untuk SVG besar (>500 elemen) | Medium | High | Chunking + Web Worker untuk parsing di background thread |
| Anthropic API latency tinggi | Low | Medium | Cache AI results per topology ID, tampilkan loading state yang informatif |

---

## Definisi "Done" (DoD)

Fitur dianggap selesai jika:

- [ ] User dapat upload SVG yang diexport dari Google Slides presentation
- [ ] Parser berhasil mengidentifikasi minimal 80% node dan edge dari sample topology yang ada
- [ ] AI enhancer mengembalikan typed metadata dalam <10 detik
- [ ] Rendered version menggunakan custom node shapes (bukan plain rect/circle)
- [ ] Animasi data-flow berjalan untuk active edges
- [ ] Status indicator (pulse) terlihat di setiap node
- [ ] Tooltips muncul saat hover node (menampilkan label, type, status, IP)
- [ ] User dapat switch antara original view dan enhanced view
- [ ] Semua posisi node dari original SVG dipertahankan (tidak di-relayout otomatis kecuali user minta)
- [ ] Topology tersimpan di database dengan enhanced metadata

---

*Plan ini dibuat berdasarkan analisis kode yang ada di project `dashboard-topologi` dan best practices untuk network visualization applications.*
