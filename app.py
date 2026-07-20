from __future__ import annotations

import io
import os
import re
import time
import uuid
import zipfile
from io import BytesIO

import qrcode
import qrcode.image.svg
from flask import Flask, jsonify, render_template, request, send_file
from PIL import Image, ImageDraw

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024

GENERATED_DIR = os.path.join("static", "generated")
os.makedirs(GENERATED_DIR, exist_ok=True)

_now = time.time()
for _fname in os.listdir(GENERATED_DIR):
    _fpath = os.path.join(GENERATED_DIR, _fname)
    if os.path.isfile(_fpath) and _fname.endswith(".png"):
        if _now - os.path.getmtime(_fpath) > 3600:
            try:
                os.remove(_fpath)
            except OSError:
                pass

ALLOWED_LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}

ERROR_CORRECTION_MAP = {
    "L": qrcode.constants.ERROR_CORRECT_L,
    "M": qrcode.constants.ERROR_CORRECT_M,
    "Q": qrcode.constants.ERROR_CORRECT_Q,
    "H": qrcode.constants.ERROR_CORRECT_H,
}


def generate_qr_filename() -> str:
    unique_id = uuid.uuid4().hex
    return f"qr_{unique_id}.png"


def embed_logo(qr_image: Image.Image, logo_image: Image.Image) -> Image.Image:
    qr_image = qr_image.convert("RGBA")
    qr_width, qr_height = qr_image.size
    logo_size = int(qr_width * 0.22)
    logo_image = logo_image.convert("RGBA")
    logo_image.thumbnail((logo_size, logo_size), Image.LANCZOS)
    logo_w, logo_h = logo_image.size
    pos_x = (qr_width - logo_w) // 2
    pos_y = (qr_height - logo_h) // 2
    circle_radius = max(logo_w, logo_h) // 2 + 8
    circle_center = (qr_width // 2, qr_height // 2)
    circle = Image.new("RGBA", (qr_width, qr_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(circle)
    draw.ellipse(
        [
            circle_center[0] - circle_radius,
            circle_center[1] - circle_radius,
            circle_center[0] + circle_radius,
            circle_center[1] + circle_radius,
        ],
        fill=(255, 255, 255, 255),
    )
    result = Image.alpha_composite(qr_image, circle)
    result.paste(logo_image, (pos_x, pos_y), logo_image)
    return result.convert("RGB")


def parse_color(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def lerp_color(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def is_finder_pattern(row: int, col: int, n: int) -> bool:
    if row < 7 and col < 7:
        return True
    if row < 7 and col >= n - 7:
        return True
    if row >= n - 7 and col < 7:
        return True
    return False


def draw_custom_qr(
    matrix: list,
    box_size: int,
    border: int,
    fill_color: str,
    back_color: str,
    module_style: str = "square",
    eye_style: str = "standard",
    gradient: str = "none",
    gradient_color: str = "#000000",
    gradient_direction: str = "horizontal",
) -> Image.Image:
    n = len(matrix)
    total_pixels = (n + 2 * border) * box_size
    fill_rgb = parse_color(fill_color)
    back_rgb = parse_color(back_color)
    grad_rgb = parse_color(gradient_color)

    img = Image.new("RGB", (total_pixels, total_pixels), back_rgb)
    draw = ImageDraw.Draw(img)

    module_coords: list[tuple[int, int, int, int, int, int]] = []

    for row in range(n):
        for col in range(n):
            if not matrix[row][col]:
                continue
            x0 = (col + border) * box_size
            y0 = (row + border) * box_size
            x1 = x0 + box_size
            y1 = y0 + box_size
            module_coords.append((row, col, x0, y0, x1, y1))

    for row, col, x0, y0, x1, y1 in module_coords:
        if gradient != "none":
            if gradient_direction == "horizontal":
                t = col / max(n - 1, 1)
            elif gradient_direction == "vertical":
                t = row / max(n - 1, 1)
            elif gradient_direction == "diagonal":
                t = (row + col) / (2 * max(n - 1, 1))
            else:
                t = 0
            color = lerp_color(grad_rgb, fill_rgb, t)
        else:
            color = fill_rgb

        if is_finder_pattern(row, col, n) and eye_style != "standard":
            continue
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        if module_style == "rounded":
            r = box_size * 0.3
            draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=color)
        elif module_style == "dots":
            r = box_size * 0.4
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
        elif module_style == "diamond":
            s = box_size * 0.45
            draw.polygon(
                [(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)],
                fill=color,
            )
        else:
            draw.rectangle([x0, y0, x1, y1], fill=color)

    if eye_style != "standard":
        eye_color = fill_rgb
        for r0, c0 in [(0, 0), (0, n - 7), (n - 7, 0)]:
            x0_eye = (c0 + border) * box_size
            y0_eye = (r0 + border) * box_size
            size = 7 * box_size
            if eye_style == "rounded":
                draw.rounded_rectangle(
                    [x0_eye, y0_eye, x0_eye + size, y0_eye + size],
                    radius=box_size * 0.5,
                    fill=eye_color,
                )
            elif eye_style == "circle":
                draw.ellipse(
                    [x0_eye, y0_eye, x0_eye + size, y0_eye + size],
                    fill=eye_color,
                )
            inner_pad = box_size
            if eye_style in ("rounded", "circle"):
                draw.rectangle(
                    [
                        x0_eye + inner_pad,
                        y0_eye + inner_pad,
                        x0_eye + size - inner_pad,
                        y0_eye + size - inner_pad,
                    ],
                    fill=back_rgb,
                )
                center_size = 3 * box_size
                ccx = x0_eye + (size - center_size) // 2
                ccy = y0_eye + (size - center_size) // 2
                if eye_style == "rounded":
                    draw.rounded_rectangle(
                        [ccx, ccy, ccx + center_size, ccy + center_size],
                        radius=box_size * 0.4,
                        fill=eye_color,
                    )
                else:
                    draw.ellipse(
                        [ccx, ccy, ccx + center_size, ccy + center_size],
                        fill=eye_color,
                    )

    return img


def create_qr(
    data: str,
    fill_color: str = "#000000",
    back_color: str = "#ffffff",
    box_size: int = 10,
    error_correction: int = qrcode.constants.ERROR_CORRECT_H,
    module_style: str = "square",
    eye_style: str = "standard",
    gradient: str = "none",
    gradient_color: str = "#000000",
    gradient_direction: str = "horizontal",
) -> Image.Image:
    qr = qrcode.QRCode(
        version=1,
        error_correction=error_correction,
        box_size=box_size,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)

    if module_style != "square" or eye_style != "standard" or gradient != "none":
        return draw_custom_qr(
            qr.modules,
            box_size,
            qr.border,
            fill_color,
            back_color,
            module_style,
            eye_style,
            gradient,
            gradient_color,
            gradient_direction,
        )
    return qr.make_image(fill_color=fill_color, back_color=back_color)


def generate_svg(
    data: str,
    fill_color: str = "#000000",
    back_color: str = "#ffffff",
    error_correction: int = qrcode.constants.ERROR_CORRECT_H,
    box_size: int = 10,
) -> str:
    qr = qrcode.QRCode(
        version=1,
        error_correction=error_correction,
        box_size=box_size,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(
        image_factory=qrcode.image.svg.SvgPathImage,
        fill_color=fill_color,
        back_color=back_color,
    )
    buf = io.StringIO()
    img.save(buf)
    return buf.getvalue()


def generate_pdf_bytes(
    data: str,
    fill_color: str = "#000000",
    back_color: str = "#ffffff",
    error_correction: int = qrcode.constants.ERROR_CORRECT_H,
    box_size: int = 10,
) -> bytes:
    from fpdf import FPDF

    qr_img = create_qr(data, fill_color, back_color, error_correction=error_correction, box_size=box_size)
    buf = io.BytesIO()
    qr_img.save(buf, "PNG")
    buf.seek(0)

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.add_page()
    pdf.set_font("Helvetica", size=20)
    pdf.cell(0, 20, text="QR Code", align="C", new_x="LMARGIN", new_y="NEXT")
    page_w = pdf.w - 2 * pdf.l_margin
    img_w = min(page_w, 120)
    x = (page_w - img_w) / 2 + pdf.l_margin
    pdf.image(buf, x=x, y=40, w=img_w, h=img_w)
    pdf.set_font("Helvetica", size=12)
    pdf.set_xy(pdf.l_margin, 40 + img_w + 20)
    pdf.multi_cell(0, 8, text=f"Data: {data}")
    return pdf.output()


@app.route("/")
def index():
    return render_template("index.html")


SIZE_MAP = {
    "small": 5,
    "medium": 10,
    "large": 15,
    "xlarge": 20,
}

def _parse_common_params():
    if request.content_type and request.content_type.startswith("multipart/form-data"):
        data = request.form.get("data", "").strip()
        fill_color = request.form.get("fill_color", "#000000")
        back_color = request.form.get("back_color", "#ffffff")
        ec_str = request.form.get("error_correction", "H").strip().upper()
        logo_file = request.files.get("logo")
        module_style = request.form.get("module_style", "square")
        eye_style = request.form.get("eye_style", "standard")
        gradient = request.form.get("gradient", "none")
        gradient_color = request.form.get("gradient_color", "#000000")
        gradient_direction = request.form.get("gradient_direction", "horizontal")
        qr_size = request.form.get("qr_size", "medium")
    else:
        request_data = request.get_json()
        if not request_data:
            return None, (jsonify({"error": "Invalid JSON."}), 400)
        data = request_data.get("data", "").strip()
        fill_color = request_data.get("fill_color", "#000000")
        back_color = request_data.get("back_color", "#ffffff")
        ec_str = request_data.get("error_correction", "H").strip().upper()
        logo_file = None
        module_style = request_data.get("module_style", "square")
        eye_style = request_data.get("eye_style", "standard")
        gradient = request_data.get("gradient", "none")
        gradient_color = request_data.get("gradient_color", "#000000")
        gradient_direction = request_data.get("gradient_direction", "horizontal")
        qr_size = request_data.get("qr_size", "medium")

    box_size = SIZE_MAP.get(qr_size, 10)
    return {
        "data": data,
        "fill_color": fill_color,
        "back_color": back_color,
        "ec_str": ec_str,
        "logo_file": logo_file,
        "module_style": module_style,
        "eye_style": eye_style,
        "gradient": gradient,
        "gradient_color": gradient_color,
        "gradient_direction": gradient_direction,
        "box_size": box_size,
    }, None


@app.route("/generate", methods=["POST"])
def generate():
    try:
        parsed, err = _parse_common_params()
        if err:
            return err
        data = parsed["data"]
        if not data:
            return jsonify({"error": "Please enter text or a URL to generate a QR code."}), 400
        if len(data) > 2048:
            return jsonify({"error": "Input is too long. Please limit to 2048 characters."}), 400

        fill_color = parsed["fill_color"]
        back_color = parsed["back_color"]
        if fill_color.strip().lower() == back_color.strip().lower():
            return jsonify({"error": "Fill and background colors must be different."}), 400

        ec = ERROR_CORRECTION_MAP.get(parsed["ec_str"])
        if ec is None:
            return jsonify({"error": f"Invalid error correction '{parsed['ec_str']}'."}), 400

        qr_image = create_qr(
            data,
            fill_color=fill_color,
            back_color=back_color,
            box_size=parsed["box_size"],
            error_correction=ec,
            module_style=parsed["module_style"],
            eye_style=parsed["eye_style"],
            gradient=parsed["gradient"],
            gradient_color=parsed["gradient_color"],
            gradient_direction=parsed["gradient_direction"],
        )

        logo_file = parsed["logo_file"]
        if logo_file and logo_file.filename:
            logo_file.seek(0, os.SEEK_END)
            file_size = logo_file.tell()
            logo_file.seek(0)
            if file_size > 4 * 1024 * 1024:
                return jsonify({"error": "Logo file is too large. Maximum size is 4 MB."}), 400
            ext = os.path.splitext(logo_file.filename)[1].lower()
            if ext not in ALLOWED_LOGO_EXTENSIONS:
                return jsonify({"error": f"Unsupported image format '{ext}'."}), 400
            try:
                logo_image = Image.open(logo_file)
                qr_image = embed_logo(qr_image, logo_image)
            except Exception:
                return jsonify({"error": "Could not process the logo image."}), 400

        filename = generate_qr_filename()
        filepath = os.path.join(GENERATED_DIR, filename)
        qr_image.save(filepath, "PNG")
        image_url = os.path.join("static", "generated", filename).replace("\\", "/")
        return jsonify({"image_url": image_url})

    except Exception as exc:
        return jsonify({"error": f"An unexpected error occurred: {str(exc)}"}), 500


@app.route("/generate/svg", methods=["POST"])
def generate_svg_route():
    try:
        parsed, err = _parse_common_params()
        if err:
            return err
        data = parsed["data"]
        if not data:
            return jsonify({"error": "Please enter text or a URL."}), 400
        ec = ERROR_CORRECTION_MAP.get(parsed["ec_str"], qrcode.constants.ERROR_CORRECT_H)
        svg_content = generate_svg(data, parsed["fill_color"], parsed["back_color"], ec, parsed["box_size"])
        return svg_content, 200, {"Content-Type": "image/svg+xml"}
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/generate/pdf", methods=["POST"])
def generate_pdf_route():
    try:
        parsed, err = _parse_common_params()
        if err:
            return err
        data = parsed["data"]
        if not data:
            return jsonify({"error": "Please enter text or a URL."}), 400
        ec = ERROR_CORRECTION_MAP.get(parsed["ec_str"], qrcode.constants.ERROR_CORRECT_H)
        pdf_bytes = generate_pdf_bytes(data, parsed["fill_color"], parsed["back_color"], ec, parsed["box_size"])
        return send_file(
            BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name="qr_code.pdf",
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@app.route("/generate/bulk", methods=["POST"])
def generate_bulk():
    try:
        data_lines = []
        if request.content_type and "multipart" in request.content_type:
            raw = request.form.get("data", "").strip()
            logo_file = request.files.get("logo")
        else:
            req_data = request.get_json()
            if not req_data:
                return jsonify({"error": "Invalid JSON."}), 400
            raw = req_data.get("data", "").strip()
            logo_file = None

        lines = [l.strip() for l in raw.split("\n") if l.strip()]
        if not lines:
            return jsonify({"error": "Please provide at least one item."}), 400
        if len(lines) > 50:
            return jsonify({"error": "Maximum 50 items per bulk generation."}), 400

        if request.content_type and "multipart" in request.content_type:
            qr_size = request.form.get("qr_size", "medium")
        else:
            qr_size = req_data.get("qr_size", "medium")
        box_size = SIZE_MAP.get(qr_size, 10)

        zip_buf = BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for i, item in enumerate(lines):
                qr_image = create_qr(item, box_size=box_size)
                if logo_file and logo_file.filename:
                    logo_file.seek(0)
                    try:
                        limg = Image.open(logo_file)
                        qr_image = embed_logo(qr_image, limg)
                    except Exception:
                        pass
                buf = BytesIO()
                qr_image.save(buf, "PNG")
                buf.seek(0)
                safe_name = re.sub(r"[^\w\-_. ]", "_", item[:30])
                zf.writestr(f"qr_{i+1}_{safe_name}.png", buf.getvalue())

        zip_buf.seek(0)
        return send_file(
            zip_buf,
            mimetype="application/zip",
            as_attachment=True,
            download_name="qr_codes.zip",
        )
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    app.run(debug=True)
