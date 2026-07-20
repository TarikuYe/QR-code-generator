'use strict';

const $ = (s, p) => (p || document).querySelector(s);
const $$ = (s, p) => [...(p || document).querySelectorAll(s)];

const dom = {
    input: $('#qr-input'),
    generateBtn: $('#generate-btn'),
    downloadPng: $('#download-png-btn'),
    downloadSvg: $('#download-svg-btn'),
    downloadPdf: $('#download-pdf-btn'),
    shareBtn: $('#share-btn'),
    newBtn: $('#new-btn'),
    qrImage: $('#qr-image'),
    msgArea: $('#message-area'),
    placeholder: $('#result-placeholder'),
    resultContent: $('#result-content'),
    fillColor: $('#fill-color'),
    fillHex: $('#fill-hex'),
    fillSwatch: $('#fill-swatch'),
    backColor: $('#back-color'),
    backHex: $('#back-hex'),
    backSwatch: $('#back-swatch'),
    swapColors: $('#swap-colors-btn'),
    errorCorrection: $('#error-correction'),
    moduleStyleBtns: $$('#module-style .opt-btn'),
    eyeStyleBtns: $$('#eye-style .opt-btn'),
    gradientBtns: $$('#gradient-style .opt-btn'),
    qrSizeBtns: $$('#qr-size .opt-btn'),
    gradientOpts: $('#gradient-options'),
    gradientColor: $('#gradient-color'),
    gradientHex: $('#gradient-hex'),
    gradientSwatch: $('#gradient-swatch'),
    gradientDirection: $('#gradient-direction'),
    logoInput: $('#logo-input'),
    logoDropzone: $('#logo-dropzone'),
    logoArea: $('#logo-upload-area'),
    logoPreview: $('#logo-preview'),
    logoPreviewImg: $('#logo-preview-img'),
    logoPreviewName: $('#logo-preview-name'),
    logoRemoveBtn: $('#logo-remove-btn'),
    tabBtns: $$('.tab-btn'),
    tabPanes: $$('.tab-pane'),
    historyBadge: $('#history-badge'),
    historyList: $('#history-list'),
    clearHistoryBtn: $('#clear-history-btn'),
    scanCameraBtn: $('#scan-camera-btn'),
    scanUpload: $('#scan-upload'),
    scannerContainer: $('#scanner-container'),
    scannerVideo: $('#scanner-video'),
    scannerCanvas: $('#scanner-canvas'),
    scanStopBtn: $('#scan-stop-btn'),
    scanResult: $('#scan-result'),
    scanText: $('#scan-text'),
    bulkInput: $('#bulk-input'),
    bulkGenerateBtn: $('#bulk-generate-btn'),
};

let _logoFile = null;
let _currentImageUrl = null;
let _scanStream = null;
let _scanRaf = null;

/* ── Utility ── */
function escapeHtml(t) {
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
}

function msg(text, type) {
    dom.msgArea.innerHTML = '';
    if (!text) return;
    const icon = type === 'success'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    dom.msgArea.innerHTML = `<div class="msg msg-${type}">${icon}<span>${escapeHtml(text)}</span></div>`;
}

function setLoading(v) {
    dom.generateBtn.classList.toggle('loading', v);
    dom.generateBtn.disabled = v;
    dom.input.disabled = v;
}

function getActiveValue(btns) {
    const b = btns.find(b => b.classList.contains('active'));
    return b ? b.dataset.value : 'square';
}

function updateColorDisplay(picker, hex, swatch) {
    const c = picker.value;
    hex.textContent = c;
    swatch.style.background = c;
}

function resetUI() {
    dom.msgArea.innerHTML = '';
    dom.placeholder.style.display = 'flex';
    dom.resultContent.style.display = 'none';
    dom.downloadPng.disabled = true;
    dom.downloadSvg.disabled = true;
    dom.downloadPdf.disabled = true;
    dom.shareBtn.disabled = true;
    dom.input.classList.remove('error');
    dom.input.focus();
    dom.fillColor.value = '#6c5ce7';
    dom.backColor.value = '#ffffff';
    updateColorDisplay(dom.fillColor, dom.fillHex, dom.fillSwatch);
    updateColorDisplay(dom.backColor, dom.backHex, dom.backSwatch);
    dom.errorCorrection.value = 'H';
    dom.gradientColor.value = '#000000';
    updateColorDisplay(dom.gradientColor, dom.gradientHex, dom.gradientSwatch);
    dom.gradientDirection.value = 'horizontal';
    _currentImageUrl = null;
    clearLogo();
}

/* ── Color ── */
dom.fillColor.addEventListener('input', () => updateColorDisplay(dom.fillColor, dom.fillHex, dom.fillSwatch));
dom.backColor.addEventListener('input', () => updateColorDisplay(dom.backColor, dom.backHex, dom.backSwatch));
dom.gradientColor.addEventListener('input', () => updateColorDisplay(dom.gradientColor, dom.gradientHex, dom.gradientSwatch));

dom.swapColors.addEventListener('click', () => {
    [dom.fillColor.value, dom.backColor.value] = [dom.backColor.value, dom.fillColor.value];
    updateColorDisplay(dom.fillColor, dom.fillHex, dom.fillSwatch);
    updateColorDisplay(dom.backColor, dom.backHex, dom.backSwatch);
});

/* ── Opt button groups ── */
$$('#module-style, #eye-style, #gradient-style, #qr-size').forEach(group => {
    group.addEventListener('click', e => {
        const btn = e.target.closest('.opt-btn');
        if (!btn) return;
        $$('.opt-btn', group).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (group.id === 'gradient-style') {
            dom.gradientOpts.style.display = btn.dataset.value === 'none' ? 'none' : 'flex';
        }
    });
});

/* ── Logo ── */
dom.logoDropzone.addEventListener('click', () => dom.logoInput.click());
dom.logoInput.addEventListener('change', () => {
    if (dom.logoInput.files && dom.logoInput.files[0]) showLogoPreview(dom.logoInput.files[0]);
});
dom.logoRemoveBtn.addEventListener('click', clearLogo);

let _dragCounter = 0;
dom.logoArea.addEventListener('dragenter', e => { e.preventDefault(); _dragCounter++; dom.logoArea.classList.add('dragover'); });
dom.logoArea.addEventListener('dragleave', e => { e.preventDefault(); _dragCounter--; if (!_dragCounter) dom.logoArea.classList.remove('dragover'); });
dom.logoArea.addEventListener('dragover', e => e.preventDefault());
dom.logoArea.addEventListener('drop', e => {
    e.preventDefault();
    dom.logoArea.classList.remove('dragover');
    _dragCounter = 0;
    const f = e.dataTransfer.files[0];
    if (f) showLogoPreview(f);
});

function validateLogoFile(file) {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { msg('Unsupported image format. Use PNG, JPG, GIF, or WebP.', 'error'); return false; }
    if (file.size > 4 * 1024 * 1024) { msg('Logo file is too large (max 4 MB).', 'error'); return false; }
    return true;
}

function showLogoPreview(file) {
    if (!file) return;
    if (!validateLogoFile(file)) { _logoFile = null; dom.logoInput.value = ''; return; }
    _logoFile = file;
    const r = new FileReader();
    r.onload = e => {
        dom.logoPreviewImg.src = e.target.result;
        dom.logoPreviewName.textContent = file.name;
        dom.logoDropzone.style.display = 'none';
        dom.logoPreview.style.display = 'flex';
    };
    r.readAsDataURL(file);
}

function clearLogo() {
    _logoFile = null;
    dom.logoInput.value = '';
    dom.logoPreviewImg.src = '';
    dom.logoPreviewName.textContent = '';
    dom.logoDropzone.style.display = '';
    dom.logoPreview.style.display = 'none';
}

/* ── Generate QR ── */
async function generateQRCode() {
    const data = dom.input.value.trim();
    dom.msgArea.innerHTML = '';
    dom.input.classList.remove('error');

    if (!data) { dom.input.classList.add('error'); msg('Please enter text or a URL.', 'error'); dom.input.focus(); return; }
    if (data.length > 2048) { dom.input.classList.add('error'); msg('Input is too long (max 2048 chars).', 'error'); dom.input.focus(); return; }

    const fillColor = dom.fillColor.value;
    const backColor = dom.backColor.value;
    if (fillColor.toLowerCase() === backColor.toLowerCase()) { msg('Fill and background colors must be different.', 'error'); return; }

    const ec = dom.errorCorrection.value;
    const moduleStyle = getActiveValue(dom.moduleStyleBtns);
    const eyeStyle = getActiveValue(dom.eyeStyleBtns);
    const gradient = getActiveValue(dom.gradientBtns);
    const gradientColor = dom.gradientColor.value;
    const gradientDirection = dom.gradientDirection.value;
    const qrSize = getActiveValue(dom.qrSizeBtns);

    setLoading(true);

    const fd = new FormData();
    fd.append('data', data);
    fd.append('fill_color', fillColor);
    fd.append('back_color', backColor);
    fd.append('error_correction', ec);
    fd.append('module_style', moduleStyle);
    fd.append('eye_style', eyeStyle);
    fd.append('gradient', gradient);
    fd.append('gradient_color', gradientColor);
    fd.append('gradient_direction', gradientDirection);
    fd.append('qr_size', qrSize);
    if (_logoFile) fd.append('logo', _logoFile);

    try {
        const res = await fetch('/generate', { method: 'POST', body: fd });
        const result = await res.json();
        if (!res.ok) { msg(result.error || 'Generation failed.', 'error'); dom.input.classList.add('error'); return; }
        displayQRCode(result.image_url);
        saveHistory(data, result.image_url);
        msg('QR code generated successfully!', 'success');
    } catch (err) {
        msg('Network error. Check your connection.', 'error');
        console.error(err);
    } finally {
        setLoading(false);
    }
}

function displayQRCode(url) {
    _currentImageUrl = url;
    dom.placeholder.style.display = 'none';
    dom.resultContent.style.display = 'block';
    dom.qrImage.src = `${url}?t=${Date.now()}`;
    dom.qrImage.alt = 'Generated QR Code';
    dom.downloadPng.disabled = false;
    dom.downloadSvg.disabled = false;
    dom.downloadPdf.disabled = false;
    dom.shareBtn.disabled = false;
}

/* ── Download handlers ── */
dom.downloadPng.addEventListener('click', () => {
    if (!_currentImageUrl) return;
    const a = document.createElement('a');
    a.href = _currentImageUrl;
    a.download = `qr_code_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

dom.downloadSvg.addEventListener('click', async () => {
    if (!_currentImageUrl) return;
    dom.downloadSvg.disabled = true;
    const data = dom.input.value.trim();
    try {
        const res = await fetch('/generate/svg', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data,
                fill_color: dom.fillColor.value,
                back_color: dom.backColor.value,
                error_correction: dom.errorCorrection.value,
                qr_size: getActiveValue(dom.qrSizeBtns),
            }),
        });
        if (!res.ok) { msg('Failed to generate SVG.', 'error'); return; }
        const svgText = await res.text();
        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr_code_${Date.now()}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
        msg('Error downloading SVG.', 'error');
    } finally {
        dom.downloadSvg.disabled = false;
    }
});

dom.downloadPdf.addEventListener('click', async () => {
    if (!_currentImageUrl) return;
    dom.downloadPdf.disabled = true;
    const data = dom.input.value.trim();
    try {
        const res = await fetch('/generate/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data,
                fill_color: dom.fillColor.value,
                back_color: dom.backColor.value,
                error_correction: dom.errorCorrection.value,
                qr_size: getActiveValue(dom.qrSizeBtns),
            }),
        });
        if (!res.ok) { msg('Failed to generate PDF.', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr_code_${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
        msg('Error downloading PDF.', 'error');
    } finally {
        dom.downloadPdf.disabled = false;
    }
});

/* ── Share ── */
dom.shareBtn.addEventListener('click', async () => {
    if (!_currentImageUrl) return;
    try {
        const res = await fetch(_currentImageUrl);
        const blob = await res.blob();
        const file = new File([blob], `qr_code_${Date.now()}.png`, { type: 'image/png' });
        if (navigator.share) {
            await navigator.share({
                title: 'QR Code',
                text: dom.input.value.trim(),
                files: [file],
            });
        } else if (navigator.clipboard) {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob }),
            ]);
            msg('QR code image copied to clipboard!', 'success');
        } else {
            const a = document.createElement('a');
            a.href = _currentImageUrl;
            a.download = `qr_code_${Date.now()}.png`;
            a.click();
            msg('Downloaded — share the file manually.', 'success');
        }
    } catch (err) {
        if (err.name !== 'AbortError') msg('Share failed.', 'error');
    }
});

/* ── Generate New ── */
dom.newBtn.addEventListener('click', resetUI);
dom.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); generateQRCode(); } });
dom.input.addEventListener('input', () => dom.input.classList.remove('error'));
dom.generateBtn.addEventListener('click', generateQRCode);

/* ── Tabs ── */
dom.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        dom.tabBtns.forEach(b => b.classList.remove('active'));
        dom.tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        $(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
});

/* ── History (localStorage) ── */
function getHistory() {
    try { return JSON.parse(localStorage.getItem('qr_history') || '[]'); } catch { return []; }
}

function saveHistory(text, url) {
    const h = getHistory();
    h.unshift({ text: text.slice(0, 100), url, time: Date.now() });
    if (h.length > 50) h.length = 50;
    localStorage.setItem('qr_history', JSON.stringify(h));
    renderHistory();
}

function renderHistory() {
    const h = getHistory();
    dom.historyBadge.textContent = h.length;
    dom.historyBadge.style.display = h.length ? 'inline' : 'none';
    dom.clearHistoryBtn.style.display = h.length ? 'inline-flex' : 'none';

    if (!h.length) {
        dom.historyList.innerHTML = '<p class="empty-state">No history yet. Generate a QR code to get started.</p>';
        return;
    }

    dom.historyList.innerHTML = h.map((item, i) => `
        <div class="history-item" data-index="${i}">
            <div class="history-thumb"><img src="${item.url}?t=${Date.now()}" alt="" loading="lazy" /></div>
            <div class="history-info">
                <div class="history-text">${escapeHtml(item.text)}</div>
                <div class="history-time">${new Date(item.time).toLocaleString()}</div>
            </div>
            <div class="history-actions">
                <button class="btn btn-tiny btn-ghost" data-action="load">Load</button>
                <button class="btn btn-tiny btn-ghost" data-action="delete">✕</button>
            </div>
        </div>
    `).join('');

    dom.historyList.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', e => {
            const action = e.target.dataset.action;
            const idx = parseInt(el.dataset.index);
            const hh = getHistory();
            if (isNaN(idx) || !hh[idx]) return;
            if (action === 'delete') {
                hh.splice(idx, 1);
                localStorage.setItem('qr_history', JSON.stringify(hh));
                renderHistory();
                return;
            }
            if (action === 'load' || !e.target.closest('.history-actions')) {
                const item = hh[idx];
                dom.input.value = item.text;
                const tabBtn = dom.tabBtns.find(b => b.dataset.tab === 'generate');
                if (tabBtn) tabBtn.click();
                generateQRCode();
            }
        });
    });
}

dom.clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Clear all history?')) {
        localStorage.removeItem('qr_history');
        renderHistory();
    }
});

renderHistory();

/* ── Scanner ── */
dom.scanCameraBtn.addEventListener('click', startCamera);
dom.scanStopBtn.addEventListener('click', stopCamera);
dom.scanUpload.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code) {
            dom.scanResult.style.display = 'flex';
            dom.scanText.textContent = code.data;
            msg('QR code decoded successfully!', 'success');
        } else {
            msg('No QR code found in the image.', 'error');
            dom.scanResult.style.display = 'none';
        }
    };
    img.src = URL.createObjectURL(file);
    dom.scanUpload.value = '';
});

async function startCamera() {
    try {
        _scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        dom.scannerVideo.srcObject = _scanStream;
        dom.scannerContainer.style.display = 'block';
        dom.scanCameraBtn.disabled = true;
        dom.scanResult.style.display = 'none';
        scanFrame();
    } catch (err) {
        msg('Camera access denied or not available.', 'error');
    }
}

function scanFrame() {
    if (!_scanStream) return;
    const video = dom.scannerVideo;
    const canvas = dom.scannerCanvas;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const code = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code) {
            dom.scanResult.style.display = 'flex';
            dom.scanText.textContent = code.data;
            stopCamera();
            msg('QR code scanned successfully!', 'success');
            return;
        }
    }
    _scanRaf = requestAnimationFrame(scanFrame);
}

function stopCamera() {
    if (_scanRaf) { cancelAnimationFrame(_scanRaf); _scanRaf = null; }
    if (_scanStream) {
        _scanStream.getTracks().forEach(t => t.stop());
        _scanStream = null;
    }
    dom.scannerVideo.srcObject = null;
    dom.scannerContainer.style.display = 'none';
    dom.scanCameraBtn.disabled = false;
}

/* ── Bulk ── */
dom.bulkGenerateBtn.addEventListener('click', async () => {
    const data = dom.bulkInput.value.trim();
    if (!data) { msg('Please enter at least one item.', 'error'); return; }
    const lines = data.split('\n').filter(l => l.trim());
    if (lines.length > 50) { msg('Maximum 50 items per bulk generation.', 'error'); return; }
    dom.bulkGenerateBtn.disabled = true;
    dom.bulkGenerateBtn.textContent = 'Generating...';
    try {
        const res = await fetch('/generate/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data }),
        });
        if (!res.ok) {
            const err = await res.json();
            msg(err.error || 'Bulk generation failed.', 'error');
            return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qr_codes_${Date.now()}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        msg(`Generated ${lines.length} QR codes!`, 'success');
    } catch (err) {
        msg('Network error during bulk generation.', 'error');
    } finally {
        dom.bulkGenerateBtn.disabled = false;
        dom.bulkGenerateBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Generate &amp; Download ZIP`;
    }
});

/* ── Init ── */
dom.input.focus();
