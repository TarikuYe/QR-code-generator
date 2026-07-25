const API_BASE = '';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }
  if (!res.ok) {
    try { const d = await res.json(); throw new Error(d.error || 'Request failed'); }
    catch { throw new Error(`HTTP ${res.status}`); }
  }
  return res;
}

export async function generateQR(params) {
  const { data, fill_color, back_color, error_correction, module_style, eye_style, gradient, gradient_color, gradient_direction, qr_size, logo } = params;
  const fd = new FormData();
  fd.append('data', data || '');
  fd.append('fill_color', fill_color || '#2563eb');
  fd.append('back_color', back_color || '#ffffff');
  fd.append('error_correction', error_correction || 'H');
  fd.append('module_style', module_style || 'square');
  fd.append('eye_style', eye_style || 'standard');
  fd.append('gradient', gradient || 'none');
  fd.append('gradient_color', gradient_color || '#000000');
  fd.append('gradient_direction', gradient_direction || 'horizontal');
  fd.append('qr_size', qr_size || 'medium');
  if (logo) fd.append('logo', logo);
  const res = await fetch(`${API_BASE}/generate`, { method: 'POST', body: fd });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || 'Generation failed');
  return result;
}

export async function generateSVG(params) {
  return request('/generate/svg', {
    method: 'POST',
    body: JSON.stringify(params),
  }).then(r => r.text ? r.text() : r);
}

export async function generatePDF(params) {
  const res = await fetch(`${API_BASE}/generate/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
  return res.blob();
}
