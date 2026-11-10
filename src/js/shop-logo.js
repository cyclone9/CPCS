// Reads the shop logo the user picks, entirely in the page: never fetched, uploaded, stored or logged.
// The result is a data: URL, because the card is exported as an SVG drawn through <img>, and an SVG image
// can't load blob: subresources.
import { base64 } from './export.js';

export const MAX_BYTES = 5 * 1024 * 1024;
// Three times the card's logo box (220 × 84): sharp at 2× export without carrying a camera-sized PNG around.
export const PNG_MAX_W = 660;
export const PNG_MAX_H = 252;

const SVG_NS = 'http://www.w3.org/2000/svg';
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** reason: 'type' (not PNG or SVG), 'size' (over MAX_BYTES) or 'broken' (can't be read or drawn). */
export class ShopLogoError extends Error {
  constructor(reason) {
    super(reason);
    this.reason = reason;
  }
}

/** The types a file's name and MIME type say it is: a subset of 'png' and 'svg'. */
export function claimedTypes(name, mime) {
  const ext = /\.([^.]+)$/.exec(name ?? '')?.[1].toLowerCase();
  const claims = new Set();
  if (ext === 'png' || mime === 'image/png') claims.add('png');
  if (ext === 'svg' || mime === 'image/svg+xml') claims.add('svg');
  return claims;
}

/**
 * 'png' or 'svg' when the name or MIME type claims that type and the bytes agree, otherwise null.
 * @param {Uint8Array} bytes
 * @param {string} name
 * @param {string} mime may be '' (some systems don't set one)
 */
export function sniffLogo(bytes, name, mime) {
  const claims = claimedTypes(name, mime);
  let found = null;
  if (bytes.length >= 8 && PNG_SIGNATURE.every((b, i) => bytes[i] === b)) found = 'png';
  else if (looksLikeSvg(bytes)) found = 'svg';
  return found && claims.has(found) ? found : null;
}

function looksLikeSvg(bytes) {
  const text = new TextDecoder().decode(bytes).trimStart();
  return text.startsWith('<') && /<svg[\s>]/.test(text);
}

/**
 * The SVG's own box from its viewBox, or from plain numeric width and height when it has none.
 * @returns {{x: number, y: number, w: number, h: number}|null}
 */
export function svgBox(viewBox, width, height) {
  const vb = viewBox?.trim().split(/[\s,]+/).map(Number);
  if (vb?.length === 4 && vb.every(Number.isFinite) && vb[2] > 0 && vb[3] > 0) return { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  const px = (v) => {
    const m = /^\s*(\d+(?:\.\d+)?|\.\d+)(?:px)?\s*$/.exec(v ?? '');
    return m ? Number(m[1]) : 0;
  };
  const w = px(width);
  const h = px(height);
  return w > 0 && h > 0 ? { x: 0, y: 0, w, h } : null;
}

/** The size a PNG is scaled down to, aspect kept, so it fits PNG_MAX_W × PNG_MAX_H; unchanged if it already does. */
export function pngFit(w, h) {
  const scale = Math.min(1, PNG_MAX_W / w, PNG_MAX_H / h);
  return scale < 1 ? { w: Math.max(1, Math.round(w * scale)), h: Math.max(1, Math.round(h * scale)), scaled: true } : { w, h, scaled: false };
}

async function decoded(src) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}

async function svgLogo(bytes) {
  const doc = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'image/svg+xml');
  const root = doc.documentElement;
  if (doc.querySelector('parsererror') || root.localName !== 'svg' || root.namespaceURI !== SVG_NS) throw new ShopLogoError('broken');
  // Scripts never run in an image anyway; <foreignObject> makes Safari taint the export canvas.
  for (const node of doc.querySelectorAll('script, foreignObject')) node.remove();
  const box = svgBox(root.getAttribute('viewBox'), root.getAttribute('width'), root.getAttribute('height'));
  if (!box) throw new ShopLogoError('broken');
  root.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
  // An intrinsic size, so the image has one in every browser.
  root.setAttribute('width', box.w);
  root.setAttribute('height', box.h);
  const href = `data:image/svg+xml;base64,${base64(new TextEncoder().encode(new XMLSerializer().serializeToString(doc)))}`;
  await decoded(href);
  return { href, width: box.w, height: box.h };
}

async function pngLogo(file) {
  const url = URL.createObjectURL(file);
  let img;
  try {
    img = await decoded(url);
  } finally {
    URL.revokeObjectURL(url);
  }
  if (!img.naturalWidth || !img.naturalHeight) throw new ShopLogoError('broken');
  const size = pngFit(img.naturalWidth, img.naturalHeight);
  if (size.scaled) {
    const canvas = document.createElement('canvas');
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, size.w, size.h);
    return { href: canvas.toDataURL('image/png'), width: size.w, height: size.h };
  }
  return { href: `data:image/png;base64,${base64(await file.arrayBuffer())}`, width: size.w, height: size.h };
}

/**
 * @param {File} file
 * @returns {Promise<{href: string, width: number, height: number}>} href is a data: URL
 * @throws {ShopLogoError}
 */
export async function readShopLogo(file) {
  if (!claimedTypes(file.name, file.type).size) throw new ShopLogoError('type');
  if (file.size > MAX_BYTES) throw new ShopLogoError('size');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffLogo(bytes, file.name, file.type);
  if (!type) throw new ShopLogoError('type');
  try {
    return type === 'png' ? await pngLogo(file) : await svgLogo(bytes);
  } catch (err) {
    throw err instanceof ShopLogoError ? err : new ShopLogoError('broken');
  }
}
