// SVG card -> PNG, entirely in the page. UPNG and pako are classic scripts in vendor/ (window.UPNG).

const FONTS = [
  [400, 'assets/fonts/Vazirmatn-Regular.ttf'],
  [500, 'assets/fonts/Vazirmatn-Medium.ttf'],
  [700, 'assets/fonts/Vazirmatn-Bold.ttf'],
];

let fontCss = null;

function base64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

// An SVG drawn as an image can't reach the page's fonts, so the fonts travel inside it.
function embeddedFonts() {
  fontCss ??= Promise.all(
    FONTS.map(async ([weight, url]) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`font ${url}: ${res.status}`);
      return `@font-face{font-family:Vazirmatn;font-weight:${weight};src:url(data:font/ttf;base64,${base64(await res.arrayBuffer())}) format("truetype")}`;
    }),
  ).then((rules) => rules.join(''), (err) => { fontCss = null; throw err; });
  return fontCss;
}

async function loadImage(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * @param {SVGSVGElement} svg the live card
 * @param {{width: number, height: number, smaller: boolean}} opts
 * @returns {Promise<Blob>} image/png
 */
export async function exportPng(svg, { width, height, smaller }) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);
  // 1080 × 681 is a hair off 856:540; stretch by that hair rather than leave a transparent line.
  clone.setAttribute('preserveAspectRatio', 'none');
  clone.removeAttribute('class');
  clone.removeAttribute('id');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await embeddedFonts();
  clone.insertBefore(style, clone.firstChild);

  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    // WebKit bug 219770: the first draw of an SVG image can miss its embedded fonts.
    // Draw once to a throwaway canvas, then draw a fresh image from the same blob.
    canvasOf(width, height).getContext('2d').drawImage(await loadImage(url), 0, 0, width, height);
    const img = await loadImage(url);
    const canvas = canvasOf(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const png = window.UPNG.encode([pixels.buffer], width, height, smaller ? 256 : 0);
    return new Blob([png], { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
