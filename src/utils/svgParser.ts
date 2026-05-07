/**
 * Mem-parsing string SVG menjadi array elemen yang dapat disimpan ke database.
 * Sekarang mendukung ekstraksi aset (gradients, filters) untuk kualitas visual tinggi.
 */
export const parseSvgContent = (svgString: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.querySelector('svg');

  if (!svgElement) {
    throw new Error('Invalid SVG content');
  }

  const elements: any[] = [];
  const assets: any[] = [];

  // 1. Ekstrak Assets (Gradients, Filters, Markers, Patterns)
  const assetTags = ['linearGradient', 'radialGradient', 'filter', 'marker', 'pattern'];
  assetTags.forEach(tag => {
    // Cari case-insensitive karena DOMParser mungkin mengubah case
    const foundAssets = doc.querySelectorAll(tag);
    foundAssets.forEach(asset => {
      assets.push({
        type: tag,
        id: asset.getAttribute('id'),
        content: asset.outerHTML
      });
    });
  });

  // 2. Ekstrak Style Global jika ada
  const styles = doc.querySelectorAll('style');
  styles.forEach(style => {
    assets.push({
      type: 'style',
      content: style.innerHTML
    });
  });

  const traverse = (node: Element, parentTransform = '') => {
    const children = Array.from(node.children);

    children.forEach((child) => {
      const type = child.tagName; // Preserve original case or use lowercase consistently
      const typeLower = type.toLowerCase();
      
      // Abaikan elemen non-visual dan assets yang sudah dihandle
      if (['defs', 'style', 'metadata', 'title', 'desc', ...assetTags.map(t => t.toLowerCase())].includes(typeLower)) {
        return;
      }

      if (typeLower === 'g') {
        const currentTransform = child.getAttribute('transform') || '';
        traverse(child, parentTransform + ' ' + currentTransform);
        return;
      }

      const props: any = {};
      Array.from(child.attributes).forEach((attr) => {
        props[attr.name] = attr.value;
      });

      // Koordinat dasar
      let x = 0;
      let y = 0;

      if (typeLower === 'rect') {
        x = parseFloat(child.getAttribute('x') || '0');
        y = parseFloat(child.getAttribute('y') || '0');
      } else if (typeLower === 'circle' || typeLower === 'ellipse') {
        x = parseFloat(child.getAttribute('cx') || '0');
        y = parseFloat(child.getAttribute('cy') || '0');
      } else if (typeLower === 'text') {
        x = parseFloat(child.getAttribute('x') || '0');
        y = parseFloat(child.getAttribute('y') || '0');
      }

      elements.push({
        type: typeLower,
        props,
        x,
        y,
        transform: (child.getAttribute('transform') || '') + (parentTransform ? ' ' + parentTransform : ''),
        zIndex: elements.length,
      });
    });
  };

  traverse(svgElement);
  
  return {
    elements,
    assets,
    viewBox: svgElement.getAttribute('viewBox') || `0 0 ${svgElement.getAttribute('width') || 1000} ${svgElement.getAttribute('height') || 1000}`
  };
};
