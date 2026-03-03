/**
 * app.js — Gemini Decoder SPA
 * Main application logic: file drop, base64 decode, sandboxed preview, download.
 */

const WORKER_THRESHOLD = 5 * 1024 * 1024; // 5 MB — use Web Worker above this

// ── DOM refs ─────────────────────────────────────────────────────────────────
const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');
const textarea      = document.getElementById('base64-input');
const decodeBtn     = document.getElementById('decode-btn');
const clearBtn      = document.getElementById('clear-btn');
const downloadBtn   = document.getElementById('download-btn');
const preview       = document.getElementById('preview-frame');
const progressWrap  = document.getElementById('progress-wrap');
const progressBar   = document.getElementById('progress-bar');
const progressLabel = document.getElementById('progress-label');
const statusMsg     = document.getElementById('status-msg');
const charCount     = document.getElementById('char-count');
const themeToggle   = document.getElementById('theme-toggle');
const previewPanel  = document.getElementById('preview-panel');
const placeholderMsg = document.getElementById('preview-placeholder');

// ── State ─────────────────────────────────────────────────────────────────────
let decodedHTML = '';
let activeWorker = null;

// ── Theme ─────────────────────────────────────────────────────────────────────
const savedTheme = localStorage.getItem('gd-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('gd-theme', next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
}

// ── Textarea character counter ────────────────────────────────────────────────
textarea.addEventListener('input', () => {
  const len = textarea.value.length;
  charCount.textContent = formatBytes(len);
  if (len > WORKER_THRESHOLD) {
    charCount.classList.add('warn');
    charCount.title = 'Large input — Web Worker will be used';
  } else {
    charCount.classList.remove('warn');
    charCount.title = '';
  }
});

// ── Drop Zone ─────────────────────────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadFile(fileInput.files[0]);
});

function loadFile(file) {
  setStatus(`Reading ${file.name} (${formatBytes(file.size)})…`, 'info');
  const reader = new FileReader();
  reader.onload = (e) => {
    textarea.value = e.target.result;
    textarea.dispatchEvent(new Event('input'));
    setStatus(`Loaded: ${file.name} (${formatBytes(file.size)})`, 'success');
  };
  reader.onerror = () => setStatus('Failed to read file.', 'error');
  reader.readAsText(file, 'utf-8');
}

// ── Decode ────────────────────────────────────────────────────────────────────
decodeBtn.addEventListener('click', startDecode);

textarea.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') startDecode();
});

function startDecode() {
  const raw = textarea.value.trim();
  if (!raw) {
    setStatus('Paste or drop a Base64 string first.', 'error');
    return;
  }

  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }

  const byteSize = raw.length; // rough size in chars ≈ bytes for base64

  if (byteSize >= WORKER_THRESHOLD) {
    decodeWithWorker(raw);
  } else {
    decodeInline(raw);
  }
}

function decodeInline(raw) {
  try {
    setProgress(0);
    const html = base64ToUTF8(raw);
    setProgress(100);
    renderPreview(html);
  } catch (err) {
    setStatus(`Decode error: ${err.message}`, 'error');
    hideProgress();
  }
}

function decodeWithWorker(raw) {
  setStatus('Decoding with Web Worker…', 'info');
  setProgress(0);
  decodeBtn.disabled = true;

  const workerUrl = getWorkerURL();
  const worker = new Worker(workerUrl);
  activeWorker = worker;
  const id = Date.now();

  worker.postMessage({ base64String: raw, id });

  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.id !== id) return;

    if (msg.type === 'progress') {
      setProgress(msg.percent);
    } else if (msg.type === 'done') {
      worker.terminate();
      activeWorker = null;
      decodeBtn.disabled = false;
      renderPreview(msg.result);
    } else if (msg.type === 'error') {
      worker.terminate();
      activeWorker = null;
      decodeBtn.disabled = false;
      hideProgress();
      setStatus(`Worker error: ${msg.message}`, 'error');
    }
  };

  worker.onerror = (err) => {
    worker.terminate();
    activeWorker = null;
    decodeBtn.disabled = false;
    hideProgress();
    setStatus(`Worker crashed: ${err.message}`, 'error');
  };
}

function getWorkerURL() {
  // Support both file:// and served origins
  const scripts = document.querySelectorAll('script[src]');
  for (const s of scripts) {
    if (s.src.includes('app.js')) {
      return s.src.replace('app.js', 'decoder.worker.js');
    }
  }
  // Fallback: same directory
  return './decoder.worker.js';
}

// ── Base64 decode (main thread, for small strings) ────────────────────────────
function base64ToUTF8(input) {
  let cleaned = input.replace(/\s/g, '');
  const dataUriMatch = cleaned.match(/^data:[^;]+;base64,(.+)$/);
  if (dataUriMatch) cleaned = dataUriMatch[1];

  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

// ── Render preview ────────────────────────────────────────────────────────────
function renderPreview(html) {
  decodedHTML = html;
  hideProgress();

  placeholderMsg.style.display = 'none';
  preview.style.display = 'block';
  downloadBtn.disabled = false;

  // Write into sandboxed iframe
  const sandbox = [
    'allow-scripts',
    'allow-same-origin', // needed for canvas / localStorage within the frame
  ].join(' ');
  preview.setAttribute('sandbox', sandbox);

  // Use srcdoc for safe injection
  preview.srcdoc = html;

  const size = formatBytes(new TextEncoder().encode(html).length);
  setStatus(`Rendered successfully · ${size}`, 'success');
}

// ── Clear ─────────────────────────────────────────────────────────────────────
clearBtn.addEventListener('click', () => {
  if (activeWorker) { activeWorker.terminate(); activeWorker = null; }
  textarea.value = '';
  charCount.textContent = '0 B';
  charCount.classList.remove('warn');
  decodedHTML = '';
  preview.srcdoc = '';
  preview.style.display = 'none';
  placeholderMsg.style.display = 'flex';
  downloadBtn.disabled = true;
  hideProgress();
  setStatus('', '');
  decodeBtn.disabled = false;
});

// ── Download ──────────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!decodedHTML) return;
  const blob = new Blob([decodedHTML], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gemini-output-${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Progress helpers ──────────────────────────────────────────────────────────
function setProgress(percent) {
  progressWrap.style.display = 'block';
  progressBar.style.width = `${percent}%`;
  progressBar.setAttribute('aria-valuenow', percent);
  progressLabel.textContent = `${percent}%`;
}

function hideProgress() {
  progressWrap.style.display = 'none';
  progressBar.style.width = '0%';
}

// ── Status helpers ────────────────────────────────────────────────────────────
function setStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status-msg ${type}`;
}

// ── Utility ───────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
