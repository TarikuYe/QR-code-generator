import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, QrCode, Download, Share2, Copy, Check, History,
  LayoutTemplate, AlertCircle, CheckCircle, Upload, RotateCcw,
  Palette, Settings, Image, Sparkles, Smartphone, MapPin, Video,
  Users, PartyPopper, ExternalLink, Ticket, Trash2, Grid3x3,
  Droplets, Maximize2, ChevronDown, Link, Type, Mail, Phone,
  MessageSquare, Wifi, CreditCard, Calendar, User, Zap, Shield,
  FileDown, Globe, ArrowRight, Star, Lock, Layers,
} from 'lucide-react';
import { QR_TYPES, buildQRData } from './utils/qrTypes';
import { TEMPLATES } from './utils/templates';
import { generateQR, generatePDF } from './utils/api';
import { useHistory } from './hooks/useHistory';
import './styles/index.css';

/* ─────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────── */
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}

function useDebounce(value, delay = 550) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ─────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────── */
async function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const fadeUp = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } };
const fadeIn  = { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } };

/* ═══════════════════════════════════════════════════════════
   APP ROOT
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [dark, toggleDark] = useDarkMode();
  const { items: historyItems, add: addHistory, remove: removeHistory, clear: clearHistory } = useHistory();
  const [activeTab, setActiveTab] = useState('generate');

  /* Generator state */
  const [qrType, setQrType] = useState('url');
  const [formValues, setFormValues] = useState({});
  const [fillColor, setFillColor] = useState('#6366f1');
  const [backColor, setBackColor] = useState('#ffffff');
  const [moduleStyle, setModuleStyle] = useState('square');
  const [eyeStyle, setEyeStyle] = useState('standard');
  const [gradient, setGradient] = useState('none');
  const [gradientColor, setGradientColor] = useState('#8b5cf6');
  const [gradientDir, setGradientDir] = useState('horizontal');
  const [qrSize, setQrSize] = useState('medium');
  const [errorCorrection, setErrorCorrection] = useState('H');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [downloadSize, setDownloadSize] = useState('512');

  /* UI state */
  const [imageUrl, setImageUrl] = useState(null);
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verification, setVerification] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [shareSupported] = useState(!!navigator.share);

  const fileInputRef = useRef(null);

  /* Build QR data */
  const qrData = useMemo(() => {
    try { return buildQRData(qrType, formValues); } catch { return ''; }
  }, [qrType, formValues]);
  const debouncedData = useDebounce(qrData);

  /* Auto-generate */
  useEffect(() => {
    if (!debouncedData) { setImageUrl(null); setImageDataUrl(null); setVerification(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setVerification('scanning');
      try {
        const result = await generateQR({
          data: debouncedData, fill_color: fillColor, back_color: backColor,
          error_correction: errorCorrection, module_style: moduleStyle,
          eye_style: eyeStyle, gradient, gradient_color: gradientColor,
          gradient_direction: gradientDir, qr_size: qrSize, logo: logoFile,
        });
        if (cancelled) return;
        setImageUrl(result.image_url);
        setImageDataUrl(result.image_url.startsWith('data:') ? result.image_url : null);
        setVerification('valid');
        const typeObj = QR_TYPES.find(t => t.id === qrType);
        addHistory({ data: debouncedData.slice(0, 80), type: typeObj?.label || qrType, imageUrl: result.image_url });
      } catch {
        if (!cancelled) setVerification('invalid');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedData, fillColor, backColor, errorCorrection, moduleStyle, eyeStyle, gradient, gradientColor, gradientDir, qrSize, logoFile]);

  const handleFormChange = useCallback((key, val) => setFormValues(prev => ({ ...prev, [key]: val })), []);
  const handleTemplate = useCallback((tpl) => {
    setQrType(tpl.type); setFormValues(tpl.values || {}); setShowTemplates(false);
  }, []);
  const handleLogoFile = useCallback((file) => {
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);
  const clearLogo = useCallback(() => {
    setLogoFile(null); setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const displayUrl = imageDataUrl || imageUrl;

  const handleDownloadPNG = useCallback(async () => {
    if (!displayUrl) return;
    const res = await fetch(displayUrl);
    downloadBlob(await res.blob(), `qr_${Date.now()}.png`);
  }, [displayUrl]);

  const handleDownloadSVG = useCallback(async () => {
    if (!qrData) return;
    try {
      const res = await fetch('/generate/svg', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: qrData, fill_color: fillColor, back_color: backColor, error_correction: errorCorrection, qr_size: qrSize }),
      });
      downloadBlob(new Blob([await res.text()], { type: 'image/svg+xml' }), `qr_${Date.now()}.svg`);
    } catch {}
  }, [qrData, fillColor, backColor, errorCorrection, qrSize]);

  const handleDownloadPDF = useCallback(async () => {
    if (!qrData) return;
    try {
      const blob = await generatePDF({ data: qrData, fill_color: fillColor, back_color: backColor, error_correction: errorCorrection, qr_size: qrSize });
      downloadBlob(blob, `qr_${Date.now()}.pdf`);
    } catch {}
  }, [qrData, fillColor, backColor, errorCorrection, qrSize]);

  const handleCopyImage = useCallback(async () => {
    if (!displayUrl) return;
    try {
      const blob = await (await fetch(displayUrl)).blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [displayUrl]);

  const handleShare = useCallback(async () => {
    if (!displayUrl) return;
    try {
      const blob = await (await fetch(displayUrl)).blob();
      const file = new File([blob], `qr_${Date.now()}.png`, { type: 'image/png' });
      await navigator.share({ title: 'QR Code', text: qrData, files: [file] });
    } catch {}
  }, [displayUrl, qrData]);

  const scrollTo = (sel) => document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const currentType = QR_TYPES.find(t => t.id === qrType) || QR_TYPES[0];

  return (
    <motion.div {...fadeIn}>
      <Header
        dark={dark} toggleDark={toggleDark} activeTab={activeTab} setActiveTab={setActiveTab}
        historyCount={historyItems.length} scrollTo={scrollTo} setShowTemplates={setShowTemplates}
      />

      <Hero onGenerate={() => scrollTo('.generator-layout')} />

      <section className="main-section" id="generate">
        <div className="container">
          <div className="generator-layout">
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
              <LeftPanel
                qrType={qrType} setQrType={setQrType}
                formValues={formValues} setFormValues={setFormValues} handleFormChange={handleFormChange}
                currentType={currentType}
                fillColor={fillColor} setFillColor={setFillColor}
                backColor={backColor} setBackColor={setBackColor}
                moduleStyle={moduleStyle} setModuleStyle={setModuleStyle}
                eyeStyle={eyeStyle} setEyeStyle={setEyeStyle}
                gradient={gradient} setGradient={setGradient}
                gradientColor={gradientColor} setGradientColor={setGradientColor}
                gradientDir={gradientDir} setGradientDir={setGradientDir}
                qrSize={qrSize} setQrSize={setQrSize}
                errorCorrection={errorCorrection} setErrorCorrection={setErrorCorrection}
                logoPreview={logoPreview} handleLogoFile={handleLogoFile}
                clearLogo={clearLogo} fileInputRef={fileInputRef}
                showTemplates={showTemplates} setShowTemplates={setShowTemplates}
                handleTemplate={handleTemplate}
                downloadSize={downloadSize} setDownloadSize={setDownloadSize}
              />
            </motion.div>

            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }}>
              <RightPanel
                displayUrl={displayUrl} loading={loading} verification={verification} qrData={qrData}
                handleDownloadPNG={handleDownloadPNG} handleDownloadSVG={handleDownloadSVG}
                handleDownloadPDF={handleDownloadPDF} handleShare={handleShare}
                handleCopyImage={handleCopyImage} copied={copied} shareSupported={shareSupported}
                downloadSize={downloadSize} setDownloadSize={setDownloadSize}
                fillColor={fillColor} backColor={backColor}
                moduleStyle={moduleStyle} eyeStyle={eyeStyle} gradient={gradient}
              />
            </motion.div>
          </div>
        </div>
      </section>

      <HistorySection items={historyItems} onRemove={removeHistory} onClear={clearHistory} />
      <FeaturesSection />
      <FAQSection />
      <Footer />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════════════ */
function Header({ dark, toggleDark, activeTab, setActiveTab, historyCount, scrollTo, setShowTemplates }) {
  const nav = (tab, sel) => { setActiveTab(tab); scrollTo(sel); };
  return (
    <header className="header">
      <div className="header-inner">
        <a href="#" className="header-logo">
          <span className="header-logo-mark"><QrCode /></span>
          <span>QR Studio</span>
        </a>

        <nav className="header-nav">
          <button
            className={`header-nav-link ${activeTab === 'generate' ? 'active' : ''}`}
            onClick={() => nav('generate', '.generator-layout')}
          >Generate</button>
          <button
            className={`header-nav-link ${activeTab === 'templates' ? 'active' : ''} hide-xs`}
            onClick={() => { setActiveTab('templates'); setShowTemplates(true); scrollTo('.generator-layout'); }}
          >Templates</button>
          <button
            className={`header-nav-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => nav('history', '.history-section')}
          >
            History{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
          <button
            className="header-nav-link hide-xs"
            onClick={() => scrollTo('.features-section')}
          >Features</button>
        </nav>

        <div className="header-actions">
          <button className="theme-toggle" onClick={toggleDark} aria-label="Toggle theme">
            {dark ? <Sun /> : <Moon />}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════════ */
function Hero({ onGenerate }) {
  return (
    <section className="hero">
      <div className="hero-bg">
        <div className="hero-noise" />
        <div className="hero-grid" />
        <div className="hero-orb hero-orb-1" />
        <div className="hero-orb hero-orb-2" />
        <div className="hero-orb hero-orb-3" />
      </div>

      <motion.div className="hero-content"
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
      >
        <motion.div className="hero-badge"
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
        >
          <Sparkles /> Free &amp; Open Source
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <span className="hero-title-plain">Generate </span>
          <span className="hero-title-gradient">Beautiful QR Codes</span>
          <br />
          <span className="hero-title-plain">in Seconds</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
          Create high-quality, fully customizable QR codes for websites, WiFi networks,
          contact cards, events, payments, and more — instantly.
        </motion.p>

        <motion.div className="hero-actions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <button className="btn btn-primary btn-lg" onClick={onGenerate}>
            <Zap size={18} /> Start Generating
          </button>
          <button className="btn btn-ghost btn-lg" onClick={() => document.querySelector('.features-section')?.scrollIntoView({ behavior: 'smooth' })}>
            See Features <ArrowRight size={16} />
          </button>
        </motion.div>

        <motion.div className="hero-stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          {[
            { num: '10+', label: 'QR Types' },
            { num: '21', label: 'Templates' },
            { num: 'PNG/SVG/PDF', label: 'Export Formats' },
            { num: '100%', label: 'Free & Open Source' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-8">
              {i > 0 && <div className="hero-stat-divider" />}
              <div className="hero-stat">
                <span className="hero-stat-num">{s.num}</span>
                <span className="hero-stat-label">{s.label}</span>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   LEFT PANEL
═══════════════════════════════════════════════════════════ */
function LeftPanel({
  qrType, setQrType, formValues, setFormValues, handleFormChange, currentType,
  fillColor, setFillColor, backColor, setBackColor,
  moduleStyle, setModuleStyle, eyeStyle, setEyeStyle,
  gradient, setGradient, gradientColor, setGradientColor, gradientDir, setGradientDir,
  qrSize, setQrSize, errorCorrection, setErrorCorrection,
  logoPreview, handleLogoFile, clearLogo, fileInputRef,
  showTemplates, setShowTemplates, handleTemplate,
  downloadSize, setDownloadSize,
}) {
  const [accordion, setAccordion] = useState('colors');
  const toggle = (key) => setAccordion(a => a === key ? null : key);

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon"><QrCode /></span>
          QR Code Generator
        </div>
      </div>

      {/* ── QR Type ── */}
      <div className="qr-types-wrap">
        <div className="qr-types-label">Type</div>
        <div className="qr-types">
          {QR_TYPES.map(t => (
            <button
              key={t.id}
              className={`qr-type-btn ${qrType === t.id ? 'active' : ''}`}
              onClick={() => { setQrType(t.id); setFormValues({}); }}
              title={t.label}
            >
              <t.icon />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Templates ── */}
      <button className="templates-trigger" onClick={() => setShowTemplates(s => !s)}>
        <span className="templates-trigger-icon"><LayoutTemplate /> Quick Templates</span>
        <ChevronDown size={15} style={{ transition: 'transform .22s', transform: showTemplates ? 'rotate(180deg)' : 'none' }} />
      </button>
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
          >
            <div className="templates-grid">
              {TEMPLATES.map(t => (
                <button key={t.id} className="template-card" onClick={() => handleTemplate(t)}>
                  <t.icon />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form Fields ── */}
      <div className="qr-form">
        {currentType.fields.map(f => (
          <div key={f.key} className="input-group">
            <label className="input-label">
              {f.label}
              {f.required && <span style={{ color: 'var(--error)', marginLeft: 2 }}>*</span>}
            </label>
            {f.type === 'textarea' ? (
              <textarea className="input-field" placeholder={f.placeholder}
                value={formValues[f.key] || ''} onChange={e => handleFormChange(f.key, e.target.value)} rows={3} />
            ) : f.type === 'select' ? (
              <select className="input-field" value={formValues[f.key] || (f.options?.[0] || '')}
                onChange={e => handleFormChange(f.key, e.target.value)}>
                {(f.options || []).map(o => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input className="input-field" type={f.type || 'text'} placeholder={f.placeholder}
                value={formValues[f.key] || ''} onChange={e => handleFormChange(f.key, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      {/* ── Appearance Accordion ── */}
      <div className="appearance-section">
        <div className="appearance-accordion">
          <AccordionGroup icon={<Palette />} label="Colors" open={accordion === 'colors'} onToggle={() => toggle('colors')}>
            <div className="appearance-row">
              <div className="color-pick-group">
                <span className="color-pick-label">Foreground</span>
                <div className="color-swatch-input">
                  <input type="color" value={fillColor} onChange={e => setFillColor(e.target.value)} />
                  <span className="hex-text">{fillColor}</span>
                </div>
              </div>
              <div className="color-pick-group">
                <span className="color-pick-label">Background</span>
                <div className="color-swatch-input">
                  <input type="color" value={backColor} onChange={e => setBackColor(e.target.value)} />
                  <span className="hex-text">{backColor}</span>
                </div>
              </div>
            </div>
            <div className="color-pick-group">
              <span className="color-pick-label">Quick Presets</span>
              <div className="color-presets">
                {[
                  { f: '#6366f1', b: '#ffffff' }, { f: '#000000', b: '#ffffff' },
                  { f: '#0f172a', b: '#f8fafc' }, { f: '#7c3aed', b: '#ffffff' },
                  { f: '#dc2626', b: '#ffffff' }, { f: '#059669', b: '#ffffff' },
                  { f: '#ffffff', b: '#0f172a' }, { f: '#fbbf24', b: '#1e293b' },
                ].map((p, i) => (
                  <button key={i}
                    className={`color-preset ${fillColor === p.f && backColor === p.b ? 'active' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${p.f} 50%, ${p.b} 50%)` }}
                    onClick={() => { setFillColor(p.f); setBackColor(p.b); }}
                    title={`${p.f} / ${p.b}`}
                  />
                ))}
              </div>
            </div>
          </AccordionGroup>

          <AccordionGroup icon={<Grid3x3 />} label="Pattern" open={accordion === 'pattern'} onToggle={() => toggle('pattern')}>
            <div className="appearance-row">
              <div className="color-pick-group">
                <span className="color-pick-label">Module Style</span>
                <div className="style-picker">
                  {[{ id: 'square', icon: '■' }, { id: 'rounded', icon: '▣' }, { id: 'dots', icon: '●' }, { id: 'diamond', icon: '◆' }].map(s => (
                    <button key={s.id} className={`style-card ${moduleStyle === s.id ? 'active' : ''}`} onClick={() => setModuleStyle(s.id)}>
                      <span className="style-card-icon">{s.icon}</span>
                      <span className="style-card-label">{s.id}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="color-pick-group">
                <span className="color-pick-label">Eye Style</span>
                <div className="style-picker">
                  {[{ id: 'standard', icon: '⊞' }, { id: 'rounded', icon: '⊟' }, { id: 'circle', icon: '◎' }].map(s => (
                    <button key={s.id} className={`style-card ${eyeStyle === s.id ? 'active' : ''}`} onClick={() => setEyeStyle(s.id)}>
                      <span className="style-card-icon">{s.icon}</span>
                      <span className="style-card-label">{s.id}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </AccordionGroup>

          <AccordionGroup icon={<Droplets />} label="Gradient" open={accordion === 'gradient'} onToggle={() => toggle('gradient')}>
            <div className="style-picker">
              {['none', 'linear', 'radial'].map(v => (
                <button key={v} className={`style-card ${gradient === v ? 'active' : ''}`} onClick={() => setGradient(v)}>
                  <span className="style-card-label">{v === 'none' ? 'Off' : v}</span>
                </button>
              ))}
            </div>
            {gradient !== 'none' && (
              <>
                <div className="gradient-visual">
                  <div className="gradient-bar" style={{
                    background: gradientDir === 'vertical'
                      ? `linear-gradient(0deg, ${fillColor}, ${gradientColor})`
                      : gradientDir === 'diagonal'
                        ? `linear-gradient(135deg, ${fillColor}, ${gradientColor})`
                        : `linear-gradient(90deg, ${fillColor}, ${gradientColor})`
                  }} />
                  {[['horizontal', '↔'], ['vertical', '↕'], ['diagonal', '↗']].map(([d, icon]) => (
                    <button key={d} className={`gradient-dir-btn ${gradientDir === d ? 'active' : ''}`}
                      onClick={() => setGradientDir(d)} title={d}>{icon}</button>
                  ))}
                </div>
                <div className="appearance-row">
                  <div className="color-pick-group">
                    <span className="color-pick-label">To Color</span>
                    <div className="color-swatch-input">
                      <input type="color" value={gradientColor} onChange={e => setGradientColor(e.target.value)} />
                      <span className="hex-text">{gradientColor}</span>
                    </div>
                  </div>
                  <div className="color-pick-group">
                    <span className="color-pick-label">From Color</span>
                    <div className="color-swatch-input" style={{ opacity: 0.6 }}>
                      <input type="color" value={fillColor} disabled />
                      <span className="hex-text">{fillColor}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </AccordionGroup>

          <AccordionGroup icon={<Maximize2 />} label="Size & Error Correction" open={accordion === 'size'} onToggle={() => toggle('size')}>
            <div className="appearance-row">
              <div className="color-pick-group">
                <span className="color-pick-label">QR Size</span>
                <div className="style-picker">
                  {[{ id: 'small', label: 'S' }, { id: 'medium', label: 'M' }, { id: 'large', label: 'L' }, { id: 'xlarge', label: 'XL' }].map(s => (
                    <button key={s.id} className={`style-card ${qrSize === s.id ? 'active' : ''}`} onClick={() => setQrSize(s.id)}>
                      <span className="style-card-label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="color-pick-group">
                <span className="color-pick-label">Error Correction</span>
                <select className="appearance-select" value={errorCorrection} onChange={e => setErrorCorrection(e.target.value)}>
                  <option value="L">Low (7%)</option>
                  <option value="M">Medium (15%)</option>
                  <option value="Q">Quartile (25%)</option>
                  <option value="H">High (30%)</option>
                </select>
              </div>
            </div>
          </AccordionGroup>

          <AccordionGroup icon={<Image />} label="Logo" open={accordion === 'logo'} onToggle={() => toggle('logo')}>
            {!logoPreview ? (
              <div className="logo-dropzone"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleLogoFile(e.dataTransfer.files[0]); }}
              >
                <Upload size={22} />
                <p className="logo-dropzone-text">Click or drag to upload</p>
                <p className="logo-dropzone-hint">PNG, JPG, WebP — max 4 MB</p>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }} onChange={e => handleLogoFile(e.target.files[0])} />
              </div>
            ) : (
              <div className="logo-preview">
                <img src={logoPreview} alt="Logo" />
                <div className="logo-preview-info"><div className="logo-preview-name">Logo uploaded</div></div>
                <button className="btn btn-ghost btn-xs" onClick={clearLogo}><RotateCcw size={13} /></button>
              </div>
            )}
          </AccordionGroup>

          <AccordionGroup icon={<Settings />} label="Settings" open={accordion === 'settings'} onToggle={() => toggle('settings')}>
            <div className="settings-grid">
              <div className="color-pick-group">
                <span className="color-pick-label">Download Size</span>
                <select className="appearance-select" value={downloadSize} onChange={e => setDownloadSize(e.target.value)}>
                  <option value="256">256 px</option>
                  <option value="512">512 px</option>
                  <option value="1024">1024 px</option>
                  <option value="2048">2048 px</option>
                </select>
              </div>
            </div>
          </AccordionGroup>
        </div>
      </div>
    </div>
  );
}

/* ── Accordion helper ── */
function AccordionGroup({ icon, label, open, onToggle, children }) {
  return (
    <div className="appearance-group">
      <button className="appearance-toggle" onClick={onToggle}>
        {icon}
        {label}
        <ChevronDown size={14} className={`chevron ${open ? 'open' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="appearance-body"
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RIGHT PANEL — PREVIEW
═══════════════════════════════════════════════════════════ */
function RightPanel({
  displayUrl, loading, verification, qrData,
  handleDownloadPNG, handleDownloadSVG, handleDownloadPDF,
  handleShare, handleCopyImage, copied, shareSupported,
  downloadSize, setDownloadSize,
  fillColor, backColor, moduleStyle, eyeStyle, gradient,
}) {
  const vMap = {
    valid:    { icon: CheckCircle, text: 'Valid & scannable', cls: 'valid' },
    invalid:  { icon: AlertCircle, text: 'Generation failed — check input', cls: 'invalid' },
    warning:  { icon: AlertCircle, text: 'Content may be too complex', cls: 'warning' },
    scanning: { icon: QrCode,      text: 'Generating…', cls: 'scanning' },
  };
  const v = vMap[verification];

  return (
    <div className="preview-card">
      {/* Top bar */}
      <div className="preview-topbar">
        <span className="preview-topbar-label">Preview</span>
        <div className="preview-topbar-actions">
          {v && (
            <motion.span className={`verification-badge ${v.cls}`} {...fadeIn}>
              <v.icon size={12} /> {v.text}
            </motion.span>
          )}
        </div>
      </div>

      {/* QR Display */}
      <div className="preview-area">
        {loading ? (
          <div className="preview-generating">
            <div className="preview-spinner" />
            <p>Generating…</p>
          </div>
        ) : displayUrl ? (
          <motion.div
            key={displayUrl} className="preview-qr-wrap"
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
          >
            <img src={displayUrl} alt="Generated QR Code" />
          </motion.div>
        ) : (
          <div className="preview-empty">
            <div className="preview-empty-icon"><QrCode /></div>
            <p className="preview-empty-title">No QR code yet</p>
            <p className="preview-empty-hint">Fill in the fields on the left to generate your QR code</p>
          </div>
        )}
      </div>

      {/* Info strip */}
      {displayUrl && (
        <div className="preview-info-strip">
          <span className="preview-info-dot" />
          <span className="preview-info-label">
            {downloadSize}px · {fillColor}/{backColor} · {moduleStyle}/{eyeStyle}{gradient !== 'none' ? ` · ${gradient}` : ''}
          </span>
        </div>
      )}

      {/* Download + Actions */}
      {displayUrl && (
        <div className="preview-actions-wrap">
          <div className="preview-meta-row">
            <div className="preview-size-picker">
              {['256', '512', '1024', '2048'].map(s => (
                <button key={s} className={`preview-size-btn ${downloadSize === s ? 'active' : ''}`}
                  onClick={() => setDownloadSize(s)}>{s}</button>
              ))}
            </div>
            <div className="preview-icon-actions">
              <button className="preview-action-btn" onClick={handleCopyImage} title="Copy image" disabled={!displayUrl}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
              {shareSupported && (
                <button className="preview-action-btn" onClick={handleShare} title="Share">
                  <Share2 size={13} />
                </button>
              )}
              <button className="preview-action-btn" onClick={() => window.open(displayUrl, '_blank')} title="Open full size">
                <ExternalLink size={13} />
              </button>
            </div>
          </div>

          <div className="download-row">
            <button className="download-btn download-btn-primary" onClick={handleDownloadPNG}>
              <Download size={13} /> PNG
            </button>
            <button className="download-btn" onClick={handleDownloadSVG}>
              <FileDown size={13} /> SVG
            </button>
            <button className="download-btn" onClick={handleDownloadPDF}>
              <FileDown size={13} /> PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   HISTORY SECTION
═══════════════════════════════════════════════════════════ */
function HistorySection({ items, onRemove, onClear }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="history-section container" id="history">
      <div className="history-header">
        <div className="panel-title" style={{ margin: 0 }}>
          <span className="panel-title-icon"><History /></span>
          Generation History
          <span className="text-muted text-sm" style={{ fontWeight: 400 }}>({items.length})</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
            {open ? 'Collapse' : `Show All (${items.length})`}
          </button>
          {items.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={onClear}>
              <Trash2 size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
          >
            {items.length === 0 ? (
              <div className="history-empty">No history yet. Generate your first QR code above.</div>
            ) : (
              <div className="history-grid">
                {items.map((item, i) => (
                  <motion.div key={i} className="history-card"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025 }}
                  >
                    {item.imageUrl && (
                      <div className="history-thumb">
                        <img src={item.imageUrl} alt="QR" />
                      </div>
                    )}
                    <div className="history-card-body">
                      <span className="history-type">{item.type}</span>
                      <span className="history-data truncate">{item.data}</span>
                      <span className="history-time">{new Date(item.time).toLocaleString()}</span>
                    </div>
                    <button className="history-remove" onClick={() => onRemove(i)} title="Remove">
                      <Trash2 />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEATURES SECTION
═══════════════════════════════════════════════════════════ */
const FEATURES = [
  { icon: Palette,    title: 'Full Customization',    desc: 'Choose colors, gradients, module shapes, eye styles, and embed your own logo.' },
  { icon: Zap,        title: 'Instant Generation',    desc: 'QR codes generate automatically as you type — no button clicks needed.' },
  { icon: FileDown,   title: 'Multiple Formats',      desc: 'Download in PNG, SVG, or PDF — perfect for print and digital use alike.' },
  { icon: Shield,     title: 'Private & Secure',      desc: 'All processing happens on your own server. No data is stored or tracked.' },
  { icon: Layers,     title: '10 QR Types',           desc: 'URLs, contacts, WiFi, events, email, SMS, WhatsApp, location, and more.' },
  { icon: LayoutTemplate, title: '21 Templates',      desc: 'Jump-start with ready-made presets for business, social, events, and more.' },
];

function FeaturesSection() {
  return (
    <section className="features-section" id="features">
      <div className="features-bg-grad" />
      <div className="container">
        <div className="section-header">
          <div className="section-eyebrow">Everything You Need</div>
          <h2 className="section-title">Professional QR generation,<br />simplified.</h2>
          <p className="section-subtitle">Everything you need to create beautiful, high-quality QR codes — with zero friction.</p>
        </div>
        <div className="features-grid">
          {FEATURES.map((f, i) => (
            <motion.div key={i} className="feature-card"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.07 }}
            >
              <div className="feature-icon"><f.icon /></div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FAQ SECTION
═══════════════════════════════════════════════════════════ */
const FAQS = [
  { q: 'Are the QR codes free to use?', a: 'Yes — completely free for personal and commercial use. No watermarks, no limits, no account required.' },
  { q: 'What QR types are supported?', a: 'URL, plain text, email, phone, SMS, WhatsApp, WiFi, vCard/contact, GPS location, and calendar events (iCal).' },
  { q: 'Can I embed a logo in my QR code?', a: 'Yes. Upload any PNG, JPG, or WebP image and it will be centered inside the QR code with a clean white background circle.' },
  { q: 'What is error correction?', a: 'Error correction lets a QR code remain scannable even when partially damaged or covered. High (30%) is recommended when using logos or complex designs.' },
  { q: 'Which download format should I use?', a: 'PNG is great for web and digital use. SVG is ideal for print and scaling to any size. PDF is convenient for sharing and embedding in documents.' },
  { q: 'Is my data kept private?', a: 'Yes. QR codes are generated server-side and returned directly to you. No content is logged or stored beyond the current session.' },
];

function FAQSection() {
  const [open, setOpen] = useState(null);
  return (
    <section className="faq-section" id="faq">
      <div className="container">
        <div className="section-header">
          <div className="section-eyebrow">Got Questions?</div>
          <h2 className="section-title">Frequently Asked Questions</h2>
        </div>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div key={i} className={`faq-item ${open === i ? 'open' : ''}`}>
              <button className="faq-question" onClick={() => setOpen(open === i ? null : i)}>
                {f.q}
                <ChevronDown className="faq-q-icon" />
              </button>
              <AnimatePresence>
                {open === i && (
                  <motion.div className="faq-answer"
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
                  >
                    {f.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="footer">
      <div className="footer-glow" />
      <div className="footer-body">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="footer-logo-mark"><QrCode size={17} /></span>
                QR Studio
              </div>
              <p className="footer-desc">
                A free, open-source QR code generator for individuals and businesses.
                Create beautiful, customizable QR codes in seconds — no sign-up required.
              </p>
              <div className="footer-badges">
                <span className="footer-badge">Free</span>
                <span className="footer-badge">Open Source</span>
                <span className="footer-badge">No Sign-up</span>
                <span className="footer-badge">Privacy First</span>
              </div>
            </div>

            <div className="footer-links">
              <div className="footer-col">
                <h4>Generate</h4>
                {[['URL / Link', Globe], ['WiFi Network', Wifi], ['Contact Card', User], ['Calendar Event', Calendar]].map(([label, Icon]) => (
                  <a key={label} href="#generate"><Icon size={13} />{label}</a>
                ))}
              </div>
              <div className="footer-col">
                <h4>Tools</h4>
                {[['Templates', LayoutTemplate], ['History', History], ['Download PNG', Download], ['Download SVG', FileDown]].map(([label, Icon]) => (
                  <a key={label} href="#generate"><Icon size={13} />{label}</a>
                ))}
              </div>
              <div className="footer-col">
                <h4>Info</h4>
                {[['Features', Star], ['FAQ', AlertCircle], ['Privacy', Lock], ['Open Source', ExternalLink]].map(([label, Icon]) => (
                  <a key={label} href="#"><Icon size={13} />{label}</a>
                ))}
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} QR Studio. Built with React &amp; Flask.</span>
            <div className="footer-bottom-links">
              <a href="#">Privacy</a>
              <span className="footer-dot">·</span>
              <a href="#">Terms</a>
              <span className="footer-dot">·</span>
              <a href="#">Open Source</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
