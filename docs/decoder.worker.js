/**
 * decoder.worker.js
 * Web Worker for decoding large Base64 strings without blocking the UI.
 * Posts progress messages back to the main thread during chunked processing.
 *
 * Message protocol (in):
 *   { base64String: string, id: number }
 *
 * Message protocol (out):
 *   { type: 'progress', id, percent: 0–100 }
 *   { type: 'done',     id, result: string }
 *   { type: 'error',    id, message: string }
 */

// Process base64 in ~1 MB chunks aligned to 4-char boundaries.
// Each 4 base64 chars encode exactly 3 bytes; splitting on a 4-char boundary
// keeps every slice valid base64 that atob() can handle without padding tricks.
const CHUNK_CHARS = Math.floor((1024 * 1024) / 4) * 4; // 1 048 576 chars

self.onmessage = function (e) {
  const { base64String, id } = e.data;
  try {
    const result = decode(base64String, id);
    self.postMessage({ type: 'done', id, result });
  } catch (err) {
    self.postMessage({ type: 'error', id, message: err.message });
  }
};

function decode(input, id) {
  // 1. Strip whitespace (base64 lines are often wrapped at 76 chars)
  let cleaned = input.replace(/\s/g, '');

  // 2. Strip data-URI prefix, e.g. "data:text/html;base64,..."
  const dataUriMatch = cleaned.match(/^data:[^;]+;base64,(.+)$/);
  if (dataUriMatch) cleaned = dataUriMatch[1];

  const totalLen = cleaned.length;
  const chunkCount = Math.ceil(totalLen / CHUNK_CHARS);
  const byteArrays = [];

  for (let i = 0; i < chunkCount; i++) {
    const start = i * CHUNK_CHARS;
    const end = Math.min(start + CHUNK_CHARS, totalLen);
    const slice = cleaned.slice(start, end);

    // atob() requires the input length to be a multiple of 4 (or padded).
    // Because CHUNK_CHARS is already a multiple of 4 AND base64 total length
    // is always a multiple of 4, every slice (except possibly the last) is
    // aligned. The last slice may be short — padBase64 handles that.
    const binary = atob(padBase64(slice));
    const bytes = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j++) {
      bytes[j] = binary.charCodeAt(j);
    }
    byteArrays.push(bytes);

    // Report progress up to 90% during decode; reserve 10% for TextDecoder.
    self.postMessage({
      type: 'progress',
      id,
      percent: Math.round(((i + 1) / chunkCount) * 90),
    });
  }

  // Concatenate all byte arrays into one Uint8Array
  const totalBytes = byteArrays.reduce((sum, a) => sum + a.length, 0);
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const arr of byteArrays) {
    combined.set(arr, offset);
    offset += arr.length;
  }

  // Decode as UTF-8 — correctly handles Hebrew, Arabic, CJK, emoji, etc.
  const text = new TextDecoder('utf-8').decode(combined);

  self.postMessage({ type: 'progress', id, percent: 100 });
  return text;
}

/**
 * Ensures a base64 string has correct padding so atob() won't throw.
 * Standard base64 length must be divisible by 4; append '=' as needed.
 */
function padBase64(str) {
  const remainder = str.length % 4;
  if (remainder === 0) return str;
  return str + '='.repeat(4 - remainder);
}
