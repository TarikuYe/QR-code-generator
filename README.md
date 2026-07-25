# QR Code Generator

🔗 **Live Demo:** [https://qr-code-generator-jgko.vercel.app](https://qr-code-generator-jgko.vercel.app)

A modern, responsive web application for generating QR codes from any text or URL. Built with **Python (Flask)** on the backend and **React + Vite** on the frontend.

## Features

- **Instant QR Code Generation** — Enter any text or URL and generate a QR code with one click.
- **No Page Reload** — Uses the Fetch API to communicate with the backend asynchronously.
- **Download as PNG** — Save generated QR codes as high-quality PNG images.
- **Responsive Design** — Works beautifully on desktop, tablet, and mobile devices.
- **Validation & Feedback** — Client-side and server-side validation with clear success/error messages.
- **Loading Indicator** — Visual feedback while the QR code is being generated.
- **Keyboard Support** — Press Enter to generate, auto-focus on the input field.

## Tech Stack

| Technology | Purpose |
|---|---|
| **Python 3** | Backend programming language |
| **Flask** | Web framework |
| **qrcode** | QR code generation library |
| **Pillow** | Image processing (required by qrcode) |
| **HTML5 / CSS3** | Frontend structure and styling |
| **JavaScript (Fetch API)** | Frontend interactivity |

## Project Structure

```
qr_code_generator/
├── app.py                     # Flask application (backend logic)
├── requirements.txt           # Python dependencies
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
├── static/
│   ├── css/
│   │   └── style.css          # Application stylesheet
│   ├── js/
│   │   └── script.js          # Frontend JavaScript
│   └── generated/             # Generated QR code images (auto-created)
└── templates/
    └── index.html             # Main HTML page
```

## Installation

### Prerequisites

- **Python 3.8 or higher** installed on your system.
- **pip** (Python package manager).

### Step 1: Clone or download the project

```bash
cd qr_code_generator
```

### Step 2: Create a virtual environment (recommended)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Run the application

```bash
python app.py
```

### Step 5: Open in your browser

Navigate to **http://127.0.0.1:5000** in your web browser.

## Usage

1. Enter text, a URL, or any string in the input field.
2. Click the **Generate** button (or press **Enter**).
3. The generated QR code appears instantly on the page.
4. Click **Download QR Code** to save the image as a PNG file.
5. Click **Generate New** to clear the result and start over.

### Examples of what you can encode

| Type | Example Input |
|---|---|
| Website URL | `https://example.com` |
| Plain text | `Hello, World!` |
| Email address | `mailto:user@example.com` |
| Phone number | `tel:+1234567890` |
| Wi-Fi credentials | `WIFI:T:WPA;S:MyNetwork;P:MyPassword;;` |
| Custom string | Any text you like |

## Extending the Application

The codebase is designed to be easy to extend. Here are some ideas:

- **QR Code Color Customization** — Add color pickers for fill and background colors.
- **Logo Embedding** — Overlay a logo image in the center of the QR code.
- **Size Selection** — Let users choose the QR code size (e.g., small, medium, large).
- **Batch Generation** — Upload a CSV file to generate multiple QR codes at once.
- **Error Correction Level** — Allow users to choose L, M, Q, or H levels.
- **History** — Keep a history of previously generated QR codes.

## Development

### Code Quality

- Python code follows **PEP 8** standards.
- JavaScript uses modern ES6+ syntax with `'use strict'` mode.
- CSS uses custom properties (design tokens) for consistent theming.
- Meaningful variable and function names throughout.
- Comprehensive error handling on both frontend and backend.

### Running in Development Mode

The application runs in debug mode by default, which provides:
- Automatic reloading when code changes.
- Detailed error pages for debugging.

To disable debug mode, change `app.run(debug=True)` to `app.run(debug=False)` in `app.py`.

## Deployment

For production deployment, use a WSGI server like **Gunicorn**:

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

Or use **Waitress** on Windows:

```bash
pip install waitress
waitress-serve --port=8000 app:app
```

## License

This project is open source and available under the MIT License.
