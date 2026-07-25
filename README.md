# QR Studio — Professional QR Code Generator

🔗 **Live Demo:** [https://qr-code-generator-jgko.vercel.app](https://qr-code-generator-jgko.vercel.app)

A modern, full-stack QR code generator built with **Python (Flask)** and **React + Vite**. Create beautiful, fully customizable QR codes for URLs, WiFi, contacts, events, payments, and more — instantly, for free.

---

## Features

- **10 QR Types** — URL, Text, Email, Phone, SMS, WhatsApp, WiFi, Contact (vCard), Location, Calendar Event
- **21 Quick Templates** — Business card, LinkedIn, Instagram, WiFi login, event ticket, and more
- **Full Customization** — Foreground/background colors, color presets, gradients (linear/radial), module styles (square, rounded, dots, diamond), eye styles (standard, rounded, circle)
- **Logo Embedding** — Upload a PNG, JPG, or WebP logo to embed in the center of your QR code
- **Multiple Export Formats** — Download as PNG, SVG, or PDF
- **Generation History** — Last 50 QR codes saved to localStorage with thumbnails
- **Dark Mode** — System-aware, persisted to localStorage
- **Copy & Share** — Copy image to clipboard or share via Web Share API
- **Instant Preview** — QR code auto-generates as you type (debounced)
- **Privacy First** — No data stored server-side; all processing is ephemeral

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3, Flask |
| **QR Generation** | qrcode, Pillow |
| **PDF Export** | fpdf2 |
| **Frontend** | React 19, Vite 8 |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Deployment** | Vercel (Python serverless + static) |

---

## Project Structure

```
qr_code_generator/
├── app.py                        # Flask app — QR generation, serving React dist
├── api/
│   └── index.py                  # Vercel serverless entry point
├── requirements.txt              # Python dependencies
├── vercel.json                   # Vercel deployment config
├── frontend/
│   ├── src/
│   │   ├── App.jsx               # Main React app (all UI components)
│   │   ├── styles/index.css      # Design system & component styles
│   │   ├── utils/
│   │   │   ├── api.js            # Fetch wrappers for backend endpoints
│   │   │   ├── qrTypes.js        # QR type definitions & data builders
│   │   │   └── templates.js      # Quick-start template presets
│   │   └── hooks/
│   │       └── useHistory.js     # localStorage history hook
│   ├── dist/                     # Production build (committed for Vercel)
│   ├── index.html                # HTML entry point
│   ├── vite.config.js            # Vite config with dev proxy
│   └── package.json
├── static/
│   └── generated/                # Temporarily saved QR PNGs (auto-cleaned)
└── templates/
    └── index.html                # Legacy fallback HTML (no React build)
```

---

## Local Development

### Prerequisites

- Python 3.8+
- Node.js 18+

### 1. Clone the repo

```bash
git clone https://github.com/TarikuYe/QR-code-generator.git
cd QR-code-generator
```

### 2. Set up the Python backend

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
# Running at http://127.0.0.1:5000
```

### 3. Set up the React frontend

```bash
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
# API calls are proxied to http://127.0.0.1:5000
```

Open **http://localhost:5173** in your browser.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/generate` | Generate QR as PNG (base64 data URL) |
| `POST` | `/generate/svg` | Generate QR as SVG |
| `POST` | `/generate/pdf` | Generate QR as PDF |
| `POST` | `/generate/bulk` | Generate up to 50 QR codes as a ZIP |

### `/generate` request (multipart/form-data)

| Field | Type | Default | Description |
|---|---|---|---|
| `data` | string | — | Content to encode (required) |
| `fill_color` | string | `#6366f1` | Foreground hex color |
| `back_color` | string | `#ffffff` | Background hex color |
| `error_correction` | L/M/Q/H | `H` | Error correction level |
| `module_style` | string | `square` | `square`, `rounded`, `dots`, `diamond` |
| `eye_style` | string | `standard` | `standard`, `rounded`, `circle` |
| `gradient` | string | `none` | `none`, `linear`, `radial` |
| `gradient_color` | string | `#000000` | Gradient end color |
| `gradient_direction` | string | `horizontal` | `horizontal`, `vertical`, `diagonal` |
| `qr_size` | string | `medium` | `small`, `medium`, `large`, `xlarge` |
| `logo` | file | — | Optional logo image (PNG/JPG/WebP, max 4 MB) |

---

## Deployment

The project is deployed on **Vercel** using a Python serverless function for the API and serving the pre-built React `dist/` as static files.

All traffic routes through `api/index.py` (Flask):
- `/generate*` and `/static/*` → handled by Flask
- Everything else → serves `frontend/dist/index.html` (React SPA)

To deploy your own instance:

```bash
npm i -g vercel
vercel --prod
```

---

## License

MIT — free for personal and commercial use.
