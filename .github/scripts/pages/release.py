"""Check built catalogs against their source commit, then check public bytes against that build."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen

ROOT = Path.cwd()
SITE = ROOT / "_site"
MANIFEST = "pages-release.json"
TOYS = "china-toys"
HOME = "home-care"
LUGGAGE = "luggage-atlas"
sys.path.insert(0, str(ROOT / TOYS))


def check(condition, message):
    if not condition:
        raise ValueError(message)


def committed(path):
    return subprocess.check_output(["git", "show", f"HEAD:{path}"]).decode()


def read_json(path):
    return json.loads(path.read_bytes())


def extract(text, prefix):
    _, found, tail = text.partition(prefix)
    check(found, f"Missing data marker {prefix}")
    return json.JSONDecoder().raw_decode(tail)[0]


def as_map(records):
    mapped = {r["id"]: r for r in records}
    check(records and len(mapped) == len(records), "Empty or duplicate record IDs")
    return mapped


def home_records():
    packed = extract((SITE / HOME / "index.html").read_text(), "const ITEMS=(()=>{const p=")
    return [{k: packed["pool"][i] for k, i in zip(packed["keys"], row) if i >= 0}
            for row in packed["rows"]]


def match_records(expected, built, keys, label):
    check(expected.keys() == built.keys(), f"{label}: product IDs differ from source")
    for uid, source in expected.items():
        for key in keys:
            check(source.get(key) == built[uid].get(key), f"{label}: {uid} field {key} differs")


def catalogs():
    from apply_chain_coverage import apply as apply_chain
    from apply_source_audit import apply as apply_audit
    from product_scope import eligible

    home = ROOT / HOME / "site"
    expected = as_map(extract(committed("home-care/site/index.html"), "const ITEMS="))
    review = home / "catalog-review"
    parts = [home / "catalog-additions.json", *(review / f for f in read_json(review / "index.json")["files"])]
    for part in parts:
        for record in read_json(part):
            expected.setdefault(record["id"], record)
    for patch in read_json(review / "category-cross-listings.json"):
        expected[patch["id"]].update(patch)
    actual = as_map(home_records())
    match_records(expected, actual, ("name", "url", "retailer", "category", "displayPrice", "price",
                                      "observedPrice", "priceObservedDate", "checkedDate"), HOME)

    source = apply_chain(json.loads(committed("china-toys/catalog.json")))
    apply_audit(source, read_json(ROOT / TOYS / "source-audit.json"))
    toy = read_json(SITE / TOYS / "catalog.json")
    match_records(as_map([p for p in source["products"] if eligible(p)]), as_map(toy["products"]),
                  ("name", "brand", "listings", "launch", "sales"), TOYS)
    luggage = read_json(SITE / LUGGAGE / "data.json")
    check(luggage == json.loads(committed("luggage-atlas/data.json")), "Luggage source mismatch")
    for path, prefix, expected_data in [(f"{TOYS}/catalog.js", "window.TOY_ATLAS=", toy),
                                        (f"{LUGGAGE}/data.js", "window.ATLAS=", luggage)]:
        js = (SITE / path).read_text()
        check(js.startswith(prefix) and json.loads(js[len(prefix):].rstrip(";\n")) == expected_data,
              f"Browser data differs: {path}")
    return {"home_records": len(actual), "toy_records": len(toy["products"]),
            "luggage_offers": len(luggage["prices"]), "luggage_brands": len(luggage["brands"])}


class Scripts(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        if tag == "script" and (src := dict(attrs).get("src")):
            self.urls.append(src)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def manifest():
    counts = catalogs()
    paths = {"", "home-care/", "china-toys/", "luggage-atlas/", "dog-club/", "pawlish/",
             "china-toys/catalog.json", "china-toys/catalog.csv", "china-toys/chain-assortments.json",
             "luggage-atlas/data.json"}
    paths.update(str(p.relative_to(SITE)) for p in (SITE / "_next").rglob("*") if p.is_file())
    for directory, names in [(TOYS, {"catalog.js", "chain-assortments-data.js"}),
                             (LUGGAGE, {"data.js", "weekly.js"})]:
        scripts = Scripts()
        scripts.feed((SITE / directory / "index.html").read_text())
        resolved = [urljoin(directory + "/", s) for s in scripts.urls]
        for name in names:
            found = [p for p in resolved if urlsplit(p).path == directory + "/" + name]
            check(len(found) == 1, f"Expected a single {name} script on {directory}/")
            paths.add(found[0])
    files = {}
    for path in sorted(paths):
        disk = SITE / urlsplit(path).path
        if disk.is_dir():
            disk /= "index.html"
        files[path] = sha(disk.read_bytes())
    content = {"commit": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
               "counts": counts, "sha256": files}
    (SITE / MANIFEST).write_text(json.dumps(content, indent=2) + "\n")
    print(json.dumps({k: content[k] for k in ("commit", "counts")}))


def verify(base, attempts=12, delay=30):
    body = (SITE / MANIFEST).read_bytes()
    expected = {**json.loads(body)["sha256"], MANIFEST: sha(body)}

    def matches(path):
        url = base.rstrip("/") + "/" + path
        try:
            request = Request(url, headers={"Cache-Control": "no-cache", "Accept-Encoding": "identity"})
            with urlopen(request, timeout=20) as response:
                return response.geturl() == url and sha(response.read()) == expected[path]
        except OSError:
            return False

    pending = list(expected)
    for attempt in range(attempts):
        with ThreadPoolExecutor(max_workers=8) as pool:
            pending = [p for p, ok in zip(pending, pool.map(matches, pending)) if not ok]
        if not pending:
            print(f"Verified {len(expected)} public routes and files against the staged release.")
            return
        print("Awaiting matching public bytes:", [p or "/" for p in pending], flush=True)
        if attempt + 1 < attempts:
            time.sleep(delay)
    raise RuntimeError(f"Public release verification failed for {pending}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("manifest", "verify"))
    parser.add_argument("--base", default="https://royhei-cpu.github.io/")
    args = parser.parse_args()
    if args.mode == "manifest":
        manifest()
    else:
        verify(args.base)
