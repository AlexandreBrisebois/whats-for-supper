#!/usr/bin/env python3
"""Generate public synthetic recipe fixtures and qualify the production native worker.

200 DPI PNG is an evaluation profile. This report does not qualify a NAS, a phone,
AI extraction accuracy, or a final production budget. Never uses household data.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import time
import zlib


def pdf(path, pages, width=612, height=792, raster=None):
    objects = [b"", b"", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"]
    image_id = None
    if raster:
        w, h, data = raster
        image_id = len(objects) + 1
        data = zlib.compress(data)
        objects.append(f"<< /Type /XObject /Subtype /Image /Width {w} /Height {h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length {len(data)} >>\nstream\n".encode() + data + b"\nendstream")
    ids = []
    for lines in pages:
        page_id = len(objects) + 1
        ids.append(page_id)
        if raster:
            stream = f"q 540 0 0 720 36 36 cm /Scan Do Q".encode()
        else:
            commands = ["BT /F1 10 Tf 40 740 Td 15 TL"]
            for line in lines:
                escaped = line.encode("cp1252").replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
                commands.append("(" + escaped.decode("latin1") + ") Tj T*")
            commands.append("ET")
            stream = "\n".join(commands).encode("latin1")
        resources = "/Font << /F1 3 0 R >>" + (f" /XObject << /Scan {image_id} 0 R >>" if image_id else "")
        objects.append(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] /Resources << {resources} >> /Contents {page_id + 1} 0 R >>".encode())
        objects.append(f"<< /Length {len(stream)} >>\nstream\n".encode() + stream + b"\nendstream")
    objects[0] = b"<< /Type /Catalog /Pages 2 0 R >>"
    objects[1] = f"<< /Type /Pages /Count {len(pages)} /Kids [{' '.join(str(i) + ' 0 R' for i in ids)}] >>".encode()
    result = bytearray(b"%PDF-1.7\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(result))
        result += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
    start = len(result)
    result += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n".encode()
    for offset in offsets[1:]:
        result += f"{offset:010d} 00000 n \n".encode()
    result += f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode()
    path.write_bytes(result)


def prepare(root):
    root.mkdir(parents=True, exist_ok=True)
    english = ["Lemon chicken - one recipe", "Ingredients: 1 1/2 cups rice; 250 g chicken; 1/4 tsp salt", "Steps: 1. Rinse rice. 2. Simmer 18 min. 3. Rest 5 min.", "Small quantities: 0.5 mL; 3/4 cup; 180 C; 2 tbsp"]
    french = ["Poulet rôti au citron - même recette", "Ingrédients : 1 1/2 tasse de riz; 250 g de poulet", "Étapes : 1. Rincer. 2. Cuire 18 min. 3. Reposer 5 min."]
    pdf(root / "text.pdf", [english])
    pdf(root / "bilingual.pdf", [english, french])
    pdf(root / "cover.pdf", [["Supper: cover page, recipe follows"], english, french, ["Serving and ordered final step: serve warm."]])
    pdf(root / "ten.pdf", [[f"Page {i + 1} of one recipe", *english] for i in range(10)])
    pdf(root / "eleven.pdf", [[f"Page {i + 1}", *english] for i in range(11)])
    pdf(root / "giant.pdf", [english], width=1000000, height=1000000)
    pdf(root / "multiple-recipes-unsupported.pdf", [english, ["A different recipe: tomato soup"]])
    (root / "corrupt.pdf").write_bytes(b"%PDF-1.7 corrupt source retained for Retry/Delete")
    from PIL import Image, ImageDraw, ImageFont
    image = Image.new("RGB", (1800, 2400), "white")
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 34)
    for i, line in enumerate(english + french):
        draw.text((80, 100 + 90 * i), line, fill="black", font=font)
    pdf(root / "scanned.pdf", [english], raster=(*image.size, image.tobytes()))
    subprocess.run(["qpdf", "--encrypt", "", "qualification-owner", "256", "--", str(root / "text.pdf"), str(root / "encrypted.pdf")], check=True)
    (root / "fixture-notes.md").write_text("Synthetic single-recipe text, scanned, bilingual, cover, ten-page, and invalid fixtures. Multiple-recipes fixture is unsupported; no detection/splitting is expected. Inspect output PNGs for quantities/units/order and phone readability; automated PNG assertions do not establish AI extraction accuracy.\n")


LIMITS = {"Dpi": 200, "MaxDimension": 4096, "MaxPixels": 16777216, "MaxOutputBytes": 67108864, "MaxResidentBytes": 536870912, "TimeoutSeconds": 60}


def run(root, image):
    cases = {"text": 1, "scanned": 1, "bilingual": 2, "cover": 4, "ten": 10, "eleven": 0, "giant": 0, "corrupt": 0, "encrypted": 0, "multiple-recipes-unsupported": 2}
    report = {"profile": LIMITS, "profileStatus": "evaluation only; final NAS budgets and readability/extraction checks pending", "image": image, "architecture": subprocess.check_output(["docker", "image", "inspect", "--format", "{{.Architecture}}", image], text=True).strip(), "cases": []}
    failed = False
    for name, expected in cases.items():
        source = root / (name + ".pdf")
        original = hashlib.sha256(source.read_bytes()).hexdigest()
        output = root / (name + "-pages")
        output.mkdir(exist_ok=True)
        output.chmod(0o777)
        container = subprocess.check_output(["docker", "create", "--network=none", "--memory=512m", "--memory-swap=512m", "--cpus=1", "--pids-limit=64", "--read-only", "--tmpfs", "/tmp:rw,size=32m", "-v", f"{source.resolve()}:/fixture.pdf:ro", "-v", f"{output.resolve()}:/pages:rw", image, "--render-pdf", "/fixture.pdf", "/pages", json.dumps(LIMITS)], text=True).strip()
        peak = 0
        started = time.monotonic()
        try:
            subprocess.run(["docker", "start", container], check=True, stdout=subprocess.DEVNULL)
            wait = subprocess.Popen(["docker", "wait", container], stdout=subprocess.PIPE, text=True)
            while wait.poll() is None:
                if time.monotonic() - started > 65:
                    subprocess.run(["docker", "kill", container], check=True, stdout=subprocess.DEVNULL)
                    wait.wait(timeout=10)
                    raise TimeoutError(name)
                pid = subprocess.check_output(["docker", "inspect", "--format", "{{.State.Pid}}", container], text=True).strip()
                try:
                    group = Path(f"/proc/{pid}/cgroup").read_text().split("::", 1)[1].strip()
                    peak = max(peak, int(Path("/sys/fs/cgroup", group.lstrip("/"), "memory.peak").read_text()))
                except (OSError, ValueError, IndexError):
                    pass
                time.sleep(0.05)
            exit_code = int(wait.communicate()[0].strip())
            files = sorted(output.glob("*.png"), key=lambda p: int(p.stem))
            dimensions = []
            for file in files:
                data = file.read_bytes()
                assert data[:8] == b"\x89PNG\r\n\x1a\n"
                dimensions.append(struct.unpack(">II", data[16:24]))
            valid = (exit_code == 0 and len(files) == expected and [p.name for p in files] == [f"{i}.png" for i in range(expected)]) if expected else exit_code != 0 and not files
            valid = valid and original == hashlib.sha256(source.read_bytes()).hexdigest()
            report["cases"].append({"fixture": name, "passed": valid, "exitCode": exit_code, "inputBytes": source.stat().st_size, "pages": len(files), "dimensions": dimensions, "outputBytes": sum(p.stat().st_size for p in files), "elapsedSeconds": round(time.monotonic() - started, 3), "sampledCgroupPeakBytes": peak or None, "sourceSha256": original, "logs": subprocess.check_output(["docker", "logs", container], text=True, stderr=subprocess.STDOUT).strip()})
            failed |= not valid
        finally:
            subprocess.run(["docker", "rm", "-f", container], check=True, stdout=subprocess.DEVNULL)
    (root / "qualification.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["prepare", "run"])
    parser.add_argument("--directory", type=Path, required=True)
    parser.add_argument("--image", default="wfs-pdf-qualification:local")
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.directory)
    else:
        run(args.directory, args.image)
