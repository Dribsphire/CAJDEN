// Shrinks photos in the browser before they are uploaded, so a 6MB phone
// photo becomes a ~300-500KB image that still looks sharp on the site.
// Doing it client-side means the server needs no image library (GD/Imagick).

const MAX_DIMENSION = 1920;       // longest side, in pixels
const JPEG_QUALITY = 0.85;
const SKIP_BELOW_BYTES = 400 * 1024; // already small and within bounds: leave untouched

/**
 * Returns a resized File, or the original file when resizing isn't needed or
 * isn't possible (unsupported type, decode failure, or the result is bigger).
 */
export async function resizeImage(file, { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;

  let bitmap;
  try {
    // 'from-image' applies the phone's EXIF rotation so portraits stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  const { width, height } = bitmap;
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  if (scale === 1 && file.size <= SKIP_BELOW_BYTES) { bitmap.close?.(); return file; }

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  // PNGs keep their format (they may be logos with transparency);
  // photos are written as JPEG/WEBP to match what was uploaded.
  const type = file.type === 'image/png' ? 'image/png' : file.type;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, quality));
  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name, { type, lastModified: Date.now() });
}

export function resizeImages(files, options) {
  return Promise.all([...files].map(f => resizeImage(f, options)));
}
