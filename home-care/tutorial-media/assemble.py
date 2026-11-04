"""Build the narrated MP4 from committed transport chunks; no external downloads."""
from pathlib import Path
import argparse, base64, hashlib, json
root = Path(__file__).resolve().parent
manifest = json.loads((root / "manifest.json").read_text())
encoded = "".join((root / name).read_text().strip() for name in manifest["parts"])
video = base64.b64decode(encoded, validate=True)
assert len(video) == manifest["size"], "Narrated tutorial length mismatch"
assert hashlib.sha256(video).hexdigest() == manifest["sha256"], "Narrated tutorial checksum mismatch"
parser=argparse.ArgumentParser()
parser.add_argument('--site-dir',type=Path,default=root.parent/'site')
args=parser.parse_args()
for folder in ("videos", "downloads"):
    for name in ('Homecare_Workspace_Guide.mp4','Home_Care_Catalog_Excel_Tutorial.mp4'):
        target = args.site_dir / folder / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(video)
print("Current Homecare tutorial assembled:", len(video), "bytes")
