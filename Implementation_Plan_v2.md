# Implementation Plan v2 — Revised SVG Parser
## Berdasarkan Analisis Aktual `Topologi_Sumbagteng.svg`

> **Konteks**: Plan v1 dibuat berdasarkan asumsi tentang struktur SVG Google Slides. Setelah analisis file nyata, ditemukan bahwa hampir semua asumsi tersebut salah. Plan ini menggantikan seluruh Phase 1–3 dari Plan v1.

---

## Temuan Kritis dari Analisis File

Hasil inspect byte-per-byte terhadap `Topologi_Sumbagteng.svg` (10.22 MB):

| Temuan | Detail | Implikasi untuk Parser |
|--------|--------|------------------------|
| **0 elemen `<text>`** | Google Slides meng-vectorize SEMUA teks menjadi `<path>` | Label TIDAK BISA dibaca dari DOM |
| **144 embedded PNG** | Setiap ikon perangkat jaringan = 1 image PNG ter-embed sebagai base64 | Node = `<image>` element |
| **`matrix(a,b,c,d,TX,TY)`** | Posisi node disimpan di kolom ke-5 dan ke-6 matrix transform | BUKAN `translate(x,y)` seperti diasumsikan Plan v1 |
| **170 stroked paths** | Semua koneksi = path dengan `stroke="color"` tanpa fill | Edge = stroked path |
| **20 warna stroke berbeda** | Setiap warna merepresentasikan tipe/layer jaringan berbeda | Warna = semantik koneksi |
| **279 invisible bboxes** | Kotak transparan `fill-opacity="0.0"` = bounding box label teks | Posisi label bisa diekstrak |
| **Bezier relatif** | Edge menggunakan koordinat relatif `m X Y c dx1 dy1 ...` | Endpoint butuh kalkulasi kumulatif |

---

## Koreksi terhadap Plan v1

### ❌ Yang Salah di Plan v1

```
// Plan v1 yang SALAH:
const isNodeElement = (el) => el.hasAttribute('fill') && getArea(el) > threshold;
// → Gagal: teks vectorized JUGA punya fill. Area check tidak membedakan node vs glyph.

const text = doc.querySelector('text');
// → Gagal: tidak ada elemen <text> sama sekali.

transform = child.getAttribute('transform');
// → Gagal: transform ada di <g> parent, bukan di <path>/<image> child.

const { x, y } = { x: 'translate(X', y: 'Y)' }; // parse translate
// → Gagal: Google Slides menggunakan matrix(), BUKAN translate().
```

### ✅ Yang Benar (dari analisis aktual)

```
// Posisi node AKTUAL dari matrix transform:
// matrix(scaleX, 0, 0, scaleY, TX, TY)
//                               ↑   ↑
//                         kolom ke-5 dan ke-6 = posisi top-left node

// Contoh nyata dari file:
// matrix(0.8437 0.0 0.0 0.8437 803.118 384.943) → node di (803, 385)
// matrix(0.8437 0.0 0.0 0.8437 832.990 2803.949) → node di (833, 2804)
// matrix(0.0824 0.0 0.0 0.0824 1372.013 1012.437) → node di (1372, 1012)

// Ukuran node yang dirender = scale × original_image_size
// 0.8437 × 200px = ~169px (semua node tampil ~169px meski image asli berbeda)
```

---

## Arsitektur Parser Baru

```
SVG File (Google Slides export)
        │
        ▼
┌─────────────────────────────────────────────┐
│  PHASE 1: Matrix Transform Node Extractor   │
│  Input:  <g transform="matrix(...)">        │
│  Output: NodeGeometry[] {cx, cy, size}      │
└─────────────────────┬───────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
┌───────────────────┐   ┌────────────────────────┐
│  PHASE 2A:        │   │  PHASE 2B:             │
│  Bezier Edge      │   │  Invisible BBox        │
│  Endpoint Parser  │   │  Label Position        │
│                   │   │  Extractor             │
│  stroke paths →   │   │  fill-opacity=0.0 →   │
│  {start, end,     │   │  {x, y, w, h}[]        │
│   color, width}   │   └──────────┬─────────────┘
└─────────┬─────────┘              │
          │                        ▼
          │          ┌─────────────────────────┐
          │          │  PHASE 3: AI Vision     │
          │          │  Label Extractor        │
          │          │                         │
          │          │  SVG → Canvas → PNG     │
          │          │  → Claude Vision API    │
          │          │  → [{label, x, y}]      │
          │          └──────────┬──────────────┘
          │                     │
          └──────────┬──────────┘
                     ▼
        ┌────────────────────────────┐
        │  PHASE 4: Graph Assembly  │
        │  + Edge→Node Matching     │
        │  + Label→Node Matching    │
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
        │  PHASE 5: AI Enhancement  │
        │  + Premium Re-render      │
        └────────────────────────────┘
```

---

## Phase 1 — Matrix Transform Node Extractor

**File**: `src/utils/googleSlidesSvgParser.ts` *(replace existing)*

### Algoritma

```typescript
interface RawNode {
  id: string;
  tx: number;        // posisi X (dari matrix kolom ke-5)
  ty: number;        // posisi Y (dari matrix kolom ke-6)
  scaleX: number;    // scale dari matrix
  scaleY: number;
  renderedW: number; // = scaleX × original image width
  renderedH: number; // = scaleY × original image height
  cx: number;        // center X = tx + renderedW/2
  cy: number;        // center Y = ty + renderedH/2
  imageDataUri: string; // base64 PNG untuk icon preview
}

export const extractNodes = (svgDoc: Document): RawNode[] => {
  const nodes: RawNode[] = [];
  
  // Cari semua <g> dengan transform="matrix(...)"
  const groups = svgDoc.querySelectorAll('g[transform]');
  
  groups.forEach((g, index) => {
    const transform = g.getAttribute('transform') || '';
    
    // Parse: matrix(a, b, c, d, TX, TY)
    const matrixMatch = transform.match(
      /matrix\(\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*[\s,]\s*([\d.E+-]+)\s*\)/
    );
    if (!matrixMatch) return;
    
    const [, a, , , d, tx, ty] = matrixMatch.map(Number);
    
    // Cari <image> di dalam group ini
    const image = g.querySelector('image');
    if (!image) return; // bukan node, skip
    
    const imgW = parseFloat(image.getAttribute('width') || '0');
    const imgH = parseFloat(image.getAttribute('height') || '0');
    const imageDataUri = image.getAttribute('xlink:href') || image.getAttribute('href') || '';
    
    const renderedW = Math.abs(a) * imgW;
    const renderedH = Math.abs(d) * imgH;
    
    nodes.push({
      id: `node-${index}`,
      tx,
      ty,
      scaleX: a,
      scaleY: d,
      renderedW,
      renderedH,
      cx: tx + renderedW / 2,
      cy: ty + renderedH / 2,
      imageDataUri,
    });
  });
  
  return nodes;
};
```

### Validasi

Berdasarkan analisis file, hasil yang diharapkan:
- **144 nodes** ditemukan (sesuai 144 `<image>` elements)
- Center node pertama: ~(887, 469) — konfirmasi dengan edge endpoint (887, 554) ✓
- Center node kedua: ~(917, 2888) — konfirmasi dengan edge endpoint (917, 2804) ✓
- Semua node tersebar di canvas 6047×3401

---

## Phase 2A — Bezier Edge Endpoint Parser

**File**: `src/utils/edgeParser.ts` *(file baru)*

### Masalah

Edge path menggunakan koordinat **relatif** dalam format bezier cubic:
```
m887.49 553.69  c0 265.79 242.25 531.59 484.50 531.59
↑ START (absolute)  ↑ control1   ↑ control2   ↑ END DELTA (relative!)
```

Endpoint absolut = START + akumulasi semua delta.

### Algoritma

```typescript
interface RawEdge {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  strokeWidth: number;
  pathData: string;   // original path untuk render
  isDashed: boolean;
  sourceNodeId?: string; // diisi setelah matching
  targetNodeId?: string;
}

export const parseEdgePath = (d: string): { start: Point; end: Point } | null => {
  // 1. Ambil starting point (selalu absolut pada command 'm')
  const startMatch = d.match(/^m\s*([\d.E+-]+)\s+([\d.E+-]+)/);
  if (!startMatch) return null;
  
  let cx = parseFloat(startMatch[1]);
  let cy = parseFloat(startMatch[2]);
  const start = { x: cx, y: cy };
  
  // 2. Proses semua segments secara kumulatif
  // Cubic bezier 'c': dx1 dy1 dx2 dy2 dx dy (endpoint = dx, dy)
  const cubicSegments = [...d.matchAll(/c\s*([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)\s+([\d.E+-]+)/g)];
  
  for (const seg of cubicSegments) {
    // Hanya ambil endpoint delta (parameter ke-5 dan ke-6)
    cx += parseFloat(seg[5]);
    cy += parseFloat(seg[6]);
  }
  
  // Line segments 'l': dx dy
  const lineSegments = [...d.matchAll(/l\s*([\d.E+-]+)\s+([\d.E+-]+)/g)];
  for (const seg of lineSegments) {
    cx += parseFloat(seg[1]);
    cy += parseFloat(seg[2]);
  }
  
  return { start, end: { x: cx, y: cy } };
};

export const extractEdges = (svgDoc: Document): RawEdge[] => {
  const edges: RawEdge[] = [];
  
  // Ambil pasangan: invisible bbox + stroked path yang mengikutinya
  const paths = svgDoc.querySelectorAll('path[stroke]');
  
  paths.forEach((path, index) => {
    const stroke = path.getAttribute('stroke');
    const fill = path.getAttribute('fill');
    const strokeWidth = parseFloat(path.getAttribute('stroke-width') || '1');
    const d = path.getAttribute('d') || '';
    
    // Filter: edge = stroke ada, fill = none atau transparent
    if (!stroke || stroke === 'none') return;
    if (fill && fill !== 'none' && fill !== '#000000') return;
    if (fill === '#000000' && !path.getAttribute('fill-opacity')) return;
    
    const endpoints = parseEdgePath(d);
    if (!endpoints) return;
    
    // Deteksi dashed (backup link)
    const strokeDasharray = path.getAttribute('stroke-dasharray');
    
    edges.push({
      id: `edge-${index}`,
      startX: endpoints.start.x,
      startY: endpoints.start.y,
      endX: endpoints.end.x,
      endY: endpoints.end.y,
      strokeColor: stroke,
      strokeWidth,
      pathData: d,
      isDashed: !!strokeDasharray,
    });
  });
  
  return edges;
};
```

---

## Phase 2B — Label Position Extractor

**File**: bagian dari `src/utils/googleSlidesSvgParser.ts`

### Strategi

Invisible bboxes (`fill-opacity="0.0"`) adalah bounding box TEPAT di atas setiap elemen teks vectorized. Posisi bbox ini = posisi label di SVG space.

```typescript
interface LabelRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;  // center
  cy: number;
}

export const extractLabelRegions = (svgDoc: Document): LabelRegion[] => {
  const regions: LabelRegion[] = [];
  
  // Pattern: <path fill="#000000" fill-opacity="0.0" d="m X Y l W 0 l 0 H ...">
  const invisPaths = svgDoc.querySelectorAll('path[fill="#000000"][fill-opacity="0.0"]');
  
  invisPaths.forEach(path => {
    const d = path.getAttribute('d') || '';
    
    // Parse: "m X Y l W 0 l 0 H l -W 0 z"
    const match = d.match(/m([\d.E+-]+)\s+([\d.E+-]+)l([\d.E+-]+)\s+0l0\s+([\d.E+-]+)/);
    if (!match) return;
    
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    const w = parseFloat(match[3]);
    const h = parseFloat(match[4]);
    
    // Filter: terlalu kecil = bukan label (mungkin spacer), terlalu besar = frame slide
    if (w < 30 || h < 10 || w > 5000) return;
    
    regions.push({
      x, y, width: w, height: h,
      cx: x + w / 2,
      cy: y + h / 2,
    });
  });
  
  return regions;
};
```

**Hasil yang diharapkan**: ~279 label regions spread di canvas 56–5726 (X), 12–3263 (Y).

---

## Phase 3 — AI Vision Label Extractor

### Kenapa Diperlukan

Karena 100% teks di file SVG ini adalah path vectorized, satu-satunya cara membaca label adalah dengan **merender SVG ke gambar dan mengirimnya ke Claude Vision API**.

### Implementasi

**File baru**: `src/utils/aiVisionLabelExtractor.ts`

```typescript
interface VisualLabel {
  text: string;
  approximateX: number;  // dalam koordinat SVG (0–6047)
  approximateY: number;  // dalam koordinat SVG (0–3401)
  confidence: 'high' | 'medium' | 'low';
}

export const extractLabelsViaAIVision = async (
  svgString: string,
  svgWidth: number,
  svgHeight: number
): Promise<VisualLabel[]> => {

  // STEP 1: Render SVG ke canvas
  const canvas = document.createElement('canvas');
  const RENDER_SCALE = 0.15; // 6047 * 0.15 ≈ 907px — cukup untuk OCR, tidak terlalu besar
  canvas.width = Math.round(svgWidth * RENDER_SCALE);
  canvas.height = Math.round(svgHeight * RENDER_SCALE);
  
  const ctx = canvas.getContext('2d')!;
  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });
  
  // STEP 2: Konversi ke base64 PNG
  const base64Image = canvas.toDataURL('image/png').split(',')[1];
  
  // STEP 3: Kirim ke Claude Vision API
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: base64Image,
            }
          },
          {
            type: 'text',
            text: `This is a network topology diagram exported from Google Slides.
            
The image is rendered at ${RENDER_SCALE * 100}% of the original SVG size.
The original SVG canvas is ${svgWidth} × ${svgHeight} units.

Your task: Identify ALL text labels visible in this diagram.
For each label, estimate its position in the ORIGINAL SVG coordinate space (scale your pixel estimate by ${1/RENDER_SCALE}).

Return ONLY a JSON array in this exact format:
[
  {
    "text": "label text here",
    "approximateX": 887,
    "approximateY": 469,
    "confidence": "high"
  }
]

Rules:
- Include node names, location codes (like BDSA, LBJA, etc.), and any annotation text
- Ignore purely decorative text or legend headers if unclear
- For "confidence": use "high" if clearly readable, "medium" if somewhat unclear, "low" if guessing
- Coordinates should be in original SVG units (multiply pixel position by ${(1/RENDER_SCALE).toFixed(1)})`
          }
        ]
      }]
    })
  });
  
  const data = await response.json();
  const rawText = data.content[0].text;
  
  // Parse JSON dari response
  const jsonMatch = rawText.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  
  return JSON.parse(jsonMatch[0]) as VisualLabel[];
};
```

### Tile Strategy untuk SVG Besar

Jika 907px terlalu kecil untuk Claude membaca label kecil, gunakan tile approach:

```typescript
// Bagi canvas menjadi 4 tiles (2×2 grid) dan kirim masing-masing ke Claude
const TILES = [
  { label: 'top-left',     svgX: 0,        svgY: 0,        w: 3024, h: 1701 },
  { label: 'top-right',    svgX: 3024,     svgY: 0,        w: 3024, h: 1701 },
  { label: 'bottom-left',  svgX: 0,        svgY: 1701,     w: 3024, h: 1701 },
  { label: 'bottom-right', svgX: 3024,     svgY: 1701,     w: 3024, h: 1701 },
];

// Render tiap tile, offset koordinat, gabungkan results
```

---

## Phase 4 — Graph Assembly & Matching

**File**: `src/utils/topologyAssembler.ts`

### Node ↔ Label Matching

```typescript
const LABEL_MATCH_RADIUS = 300; // unit SVG — cari label dalam radius ini dari node center

export const matchLabelsToNodes = (
  nodes: RawNode[],
  labels: VisualLabel[],
  labelRegions: LabelRegion[]
): NamedNode[] => {
  return nodes.map(node => {
    // Cari label terdekat dalam radius
    const nearby = labels
      .map(label => ({
        label,
        distance: Math.sqrt(
          (label.approximateX - node.cx) ** 2 +
          (label.approximateY - node.cy) ** 2
        )
      }))
      .filter(item => item.distance < LABEL_MATCH_RADIUS)
      .sort((a, b) => a.distance - b.distance);
    
    const bestLabel = nearby[0]?.label.text ?? `Node-${node.id}`;
    
    return { ...node, label: bestLabel };
  });
};
```

### Edge ↔ Node Matching

```typescript
const ENDPOINT_MATCH_RADIUS = 200; // unit SVG

export const matchEdgesToNodes = (
  edges: RawEdge[],
  nodes: NamedNode[]
): TypedEdge[] => {
  return edges.map(edge => {
    const findNearestNode = (px: number, py: number) =>
      nodes
        .map(n => ({ n, d: Math.sqrt((px - n.cx) ** 2 + (py - n.cy) ** 2) }))
        .filter(item => item.d < ENDPOINT_MATCH_RADIUS)
        .sort((a, b) => a.d - b.d)[0]?.n ?? null;
    
    const sourceNode = findNearestNode(edge.startX, edge.startY);
    const targetNode = findNearestNode(edge.endX, edge.endY);
    
    return {
      ...edge,
      sourceNodeId: sourceNode?.id ?? null,
      targetNodeId: targetNode?.id ?? null,
      // Infer edge type dari warna dan lebar stroke
      edgeType: inferEdgeType(edge.strokeColor, edge.strokeWidth),
      connectionType: edge.isDashed ? 'backup' : 'primary',
    };
  });
};
```

### Edge Color → Type Mapping

Dari analisis file, 20 warna stroke ditemukan. Mapping sementara (dikonfirmasi via AI Vision dari legenda diagram):

```typescript
// Warna dari file aktual — butuh konfirmasi via AI Vision pada bagian legenda SVG
const EDGE_COLOR_SEMANTICS: Record<string, { type: string; tier: string; colorName: string }> = {
  '#8e7cc3': { type: 'fiber',    tier: 'backbone',   colorName: 'light-purple' },  // 17 edges, width 16
  '#664ea6': { type: 'fiber',    tier: 'backbone',   colorName: 'dark-purple' },   // 15 edges
  '#ff00ff': { type: 'fiber',    tier: 'metro',      colorName: 'magenta' },       // 26 edges
  '#6aa84f': { type: 'ethernet', tier: 'access',     colorName: 'green' },         // 24 edges
  '#ff0000': { type: 'ethernet', tier: 'access',     colorName: 'red' },           // 16 edges
  '#0000ff': { type: 'ethernet', tier: 'access',     colorName: 'blue' },          // 16 edges
  '#6d9eeb': { type: 'ethernet', tier: 'distribution', colorName: 'light-blue' },  // 8 edges
  '#c27ba0': { type: 'vpn',      tier: 'overlay',    colorName: 'pink' },          // 8 edges
  '#e69138': { type: 'wireless', tier: 'wireless',   colorName: 'orange' },        // 8 edges
  '#595959': { type: 'ethernet', tier: 'management', colorName: 'gray' },          // 8 edges
  '#38761d': { type: 'fiber',    tier: 'backbone',   colorName: 'dark-green' },    // 6 edges
};

// TODO: Ganti dengan mapping yang dikonfirmasi dari legenda SVG via AI Vision
```

### Cara Baca Legenda Warna via AI Vision

```typescript
// Kirim portion bawah SVG (biasanya legenda ada di sana) ke Claude:
const legendPrompt = `
This is a section of a network topology diagram.
Identify the color legend/key if present.
For each color entry, tell me: hex color code, and what connection type it represents.
Return JSON: [{"color": "#hexcode", "meaning": "description"}]
`;
```

---

## Phase 5 — Premium Re-render

Setelah graph ter-assembly, render ulang menggunakan library yang sudah ada namun dengan enhancement:

### Pertahankan Layout Asli

**JANGAN relayout otomatis.** Posisi node dari matrix transform = hasil kerja desainer topologi yang harus dipertahankan.

```typescript
// Gunakan posisi dari matrix transform, bukan force-directed
const preserveOriginalLayout = (nodes: NamedNode[]): Node[] => {
  return nodes.map(node => ({
    id: node.id,
    label: node.label,
    type: inferNodeType(node),
    status: 'online', // default, bisa di-update dari AI enhancement
    position: {
      x: node.cx,       // ← dari TX + renderedW/2 (matrix transform)
      y: node.cy,       // ← dari TY + renderedH/2
      z: 0,
    },
    // ... rest of fields
  }));
};
```

### Visual Upgrade dari Plan v1

Bagian premium renderer dari Plan v1 tetap berlaku — hanya pipeline input-nya yang berubah.

```typescript
// Node visual: gunakan embedded PNG icon sebagai thumbnail
// + overlay badge untuk type dan status
const PremiumNodeRenderer = ({ node, imageDataUri }: Props) => (
  <g>
    {/* Glow ring berdasarkan status */}
    <circle cx={node.cx} cy={node.cy} r={node.size * 0.6} 
            fill={STATUS_GLOW[node.status]} opacity={0.2}>
      <animate attributeName="r" from={node.size * 0.5} to={node.size * 0.8} 
               dur="2s" repeatCount="indefinite"/>
    </circle>
    
    {/* Icon PNG asli dari Google Slides (tetap familiar bagi user) */}
    <image href={imageDataUri} 
           x={node.cx - node.size/2} y={node.cy - node.size/2}
           width={node.size} height={node.size}/>
    
    {/* Label dengan backdrop */}
    <rect ... /> {/* label background */}
    <text x={node.cx} y={node.cy + node.size/2 + 20}>{node.label}</text>
    
    {/* Status dot */}
    <StatusIndicator status={node.status} cx={node.cx + node.size/2 - 8} cy={node.cy - node.size/2 + 8}/>
  </g>
);
```

---

## Urutan Implementasi (Sprint Revisi)

### Sprint 1 — Core Parser Rewrite (3 hari)
**Ganti sepenuhnya `googleSlidesSvgParser.ts`**

| Task | Detail | Estimasi |
|------|--------|----------|
| `extractNodes()` via matrix transform | Parse `<g transform="matrix(...)">` + `<image>` | 1 hari |
| `extractEdges()` via bezier math | Parse stroked paths + kalkulasi endpoint absolut | 0.5 hari |
| `extractLabelRegions()` | Parse invisible bboxes untuk posisi label | 0.5 hari |
| Integration test dengan `Topologi_Sumbagteng.svg` | Verify: 144 nodes, 170 edges | 0.5 hari |
| Update Zustand store untuk handle `imageDataUri` | Store embedded PNG per node | 0.5 hari |

### Sprint 2 — AI Vision Integration (2 hari)

| Task | Detail | Estimasi |
|------|--------|----------|
| `extractLabelsViaAIVision()` — render + kirim ke Claude | SVG → canvas → PNG → API | 1 hari |
| `matchLabelsToNodes()` — proximity matching | Gunakan label regions sebagai kandidat | 0.5 hari |
| `matchEdgesToNodes()` — endpoint proximity | Match start/end point ke node center | 0.5 hari |

### Sprint 3 — Edge Color Semantics (1 hari)

| Task | Detail | Estimasi |
|------|--------|----------|
| AI Vision legend reader | Kirim portion SVG dengan legenda ke Claude | 0.5 hari |
| Color mapping UI | Tampilkan legend interaktif di dashboard | 0.5 hari |

### Sprint 4 — Premium Renderer Upgrade (2 hari)

| Task | Detail | Estimasi |
|------|--------|----------|
| Gunakan embedded PNG sebagai node icon | Pertahankan visual yang familiar + tambah enhancement | 1 hari |
| Animated edges dengan SVG `<animateMotion>` | Hanya untuk active edges | 0.5 hari |
| Tooltip per node (dari AI-extracted labels) | Hover → popup dengan metadata | 0.5 hari |

---

## Test Cases Spesifik untuk File Ini

Berdasarkan analisis `Topologi_Sumbagteng.svg`:

```typescript
// test/svgParser.test.ts
describe('GoogleSlidesSvgParser — Topologi_Sumbagteng.svg', () => {
  it('harus menemukan tepat 144 nodes', () => {
    const nodes = extractNodes(svgDoc);
    expect(nodes.length).toBe(144);
  });
  
  it('node pertama harus berada di sekitar (887, 469)', () => {
    const nodes = extractNodes(svgDoc);
    const firstNode = nodes[0];
    expect(firstNode.cx).toBeCloseTo(887, -1); // ±10 unit
    expect(firstNode.cy).toBeCloseTo(469, -1);
  });
  
  it('harus menemukan setidaknya 127 edges', () => {
    const edges = extractEdges(svgDoc);
    expect(edges.length).toBeGreaterThanOrEqual(127);
  });
  
  it('edge pertama harus start di (887, 554)', () => {
    const edges = extractEdges(svgDoc);
    expect(edges[0].startX).toBeCloseTo(887, -1);
    expect(edges[0].startY).toBeCloseTo(554, -1);
  });
  
  it('harus mendeteksi 20 warna edge yang berbeda', () => {
    const edges = extractEdges(svgDoc);
    const colors = new Set(edges.map(e => e.strokeColor));
    expect(colors.size).toBe(20);
  });
  
  it('harus menemukan 279 label regions', () => {
    const regions = extractLabelRegions(svgDoc);
    expect(regions.length).toBeCloseTo(279, -1);
  });
});
```

---

## Dependency Changes dari Plan v1

| Plan v1 | Plan v2 | Alasan |
|---------|---------|--------|
| `svgson` (SVG → JSON parser) | ❌ Remove | DOMParser cukup |
| `d3-shape`, `d3-path` | ❌ Remove | Bezier math manual lebih ringan |
| KD-tree untuk proximity | ✅ Keep | Dibutuhkan untuk matching |
| `html-to-image` | ✅ Keep | Render SVG → PNG untuk AI Vision |
| Anthropic Vision API call | ✅ **Wajib** | Satu-satunya cara baca label |

```bash
# Tambah (dari Plan v1 yang relevan)
npm install html-to-image

# Hapus (tidak diperlukan)
# npm uninstall svgson d3-shape d3-path
```

---

## Ringkasan Perubahan dari Plan v1

| Aspek | Plan v1 | Plan v2 (Revised) |
|-------|---------|-------------------|
| **Deteksi Node** | Heuristik shape (fill, area, shape type) | Parse `matrix(...)` transform + `<image>` |
| **Posisi Node** | Dari `translate(x, y)` atau attribute x/y | Dari matrix kolom TX, TY |
| **Label Extraction** | DOM parse `<text>` elements | AI Vision (Claude) — satu-satunya cara |
| **Tipe Node** | Rule engine dari label text | AI Vision → proximity match ke node |
| **Edge Extraction** | Path filter (fill=none, stroke ada) | Sama, tapi endpoint pakai bezier math |
| **Edge Endpoint** | Bounding box proximity (kasar) | Kalkulasi kumulatif bezier + proximity match |
| **Edge Type** | Dari stroke color (partial) | Dari stroke color + AI Vision baca legenda |
| **Label→Node Match** | Proximity dari `<text>` position | Proximity dari AI Vision OCR result |

---

*Plan ini didasarkan pada analisis aktual byte-per-byte terhadap `Topologi_Sumbagteng.svg` (10.22 MB, 1027 paths, 144 PNG images, 0 text elements).*
