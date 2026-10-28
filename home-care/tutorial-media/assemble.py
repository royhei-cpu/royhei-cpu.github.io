"""Build the narrated MP4 from committed transport chunks; no external downloads."""
from pathlib import Path
import base64, hashlib, json
root = Path(__file__).resolve().parent
manifest = json.loads((root / "manifest.json").read_text())
encoded = "".join((root / name).read_text().strip() for name in manifest["parts"])
video = base64.b64decode(encoded, validate=True)
assert len(video) == manifest["size"], "Narrated tutorial length mismatch"
assert hashlib.sha256(video).hexdigest() == manifest["sha256"], "Narrated tutorial checksum mismatch"
for folder in ("videos", "downloads"):
    target = root.parent / "site" / folder / "Home_Care_Catalog_Excel_Tutorial.mp4"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(video)
print("Narrated tutorial assembled:", len(video), "bytes")
