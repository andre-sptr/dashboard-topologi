import { GoogleGenAI } from '@google/genai';

export interface VisualLabel {
  text: string;
  approximateX: number;  // in ORIGINAL SVG coordinate space
  approximateY: number;  // in ORIGINAL SVG coordinate space
  confidence: 'high' | 'medium' | 'low';
}

export interface TopologyVisualData {
  labels: VisualLabel[];
  legend: Array<{ color: string; meaning: string }>;
}

/**
 * Extracts labels and legend from SVG by rendering it to a canvas and using Gemini Vision API.
 */
export const extractVisualDataViaAIVision = async (
  svgString: string,
  svgWidth: number,
  svgHeight: number,
  apiKey?: string
): Promise<TopologyVisualData> => {
  const effectiveApiKey = apiKey || (import.meta.env.VITE_GEMINI_API_KEY as string) || '';

  if (!effectiveApiKey) {
    console.warn('AI Vision Label Extraction: No Gemini API key provided');
    return { labels: [], legend: [] };
  }

  // STEP 1: Render SVG to canvas
  const canvas = document.createElement('canvas');
  const RENDER_SCALE = 0.15; // 6047 * 0.15 ≈ 907px — enough for OCR, not too large for API
  canvas.width = Math.round(svgWidth * RENDER_SCALE);
  canvas.height = Math.round(svgHeight * RENDER_SCALE);

  const ctx = canvas.getContext('2d')!;
  const img = new Image();
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  await new Promise<void>((resolve, reject) => {
    img.onload = () => {
      ctx.fillStyle = 'white'; // Google Slides exports often have transparent bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = reject;
    img.src = url;
  });

  // STEP 2: Convert to base64 PNG
  const base64Image = canvas.toDataURL('image/png').split(',')[1];

  // STEP 3: Send to Gemini Vision API
  console.log('AI Vision: Initializing with model gemini-3.1-pro-preview');
  const ai = new GoogleGenAI({
    apiKey: effectiveApiKey,
    vertexai: true
  });

  const prompt = `
This is a network topology diagram exported from Google Slides.
            
The image is rendered at ${RENDER_SCALE * 100}% of the original SVG size.
The original SVG canvas is ${svgWidth} × ${svgHeight} units.

Your task:
1. Identify ALL text labels visible in this diagram. Estimate center positions in ORIGINAL SVG units (multiply pixel position by ${1 / RENDER_SCALE}).
2. Locate the LEGEND (usually a table with colored lines/boxes and text). Extract the mapping of colors to meanings (e.g., "#8e7cc3" -> "Core Link").

Return ONLY a JSON object in this exact format:
{
  "labels": [
    {
      "text": "label text here",
      "approximateX": 887,
      "approximateY": 469,
      "confidence": "high"
    }
  ],
  "legend": [
    { "color": "#HEXCODE", "meaning": "Descriptive text" }
  ]
}

Rules:
- Include node names, location codes, and annotations in labels.
- Scale pixel positions to original space by multiplying by ${(1 / RENDER_SCALE).toFixed(1)}.
- Respond with ONLY the JSON object.
  `;

  try {
    console.log('AI Vision: Sending request...');
    const result = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { data: base64Image, mimeType: 'image/png' } }
          ]
        }
      ]
    });
    console.log('AI Vision: Response received');

    const text = result.text || '';

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { labels: [], legend: [] };

    return JSON.parse(jsonMatch[0]) as TopologyVisualData;
  } catch (error) {
    console.error('Gemini Vision Label Extraction failed:', error);
    return { labels: [], legend: [] };
  }
};
