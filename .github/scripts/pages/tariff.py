"""Read the Tariff dashboard as static data. Never execute upstream code on the runner."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

ORIGIN = "https://tariff-signal-sourcing.lhei111.chatgpt.site/"
ASSET = re.compile(r"_next/static/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_.-]+\.(?:js|css|woff2?|png|svg|webp|jpe?g)")
MAX_FILE = 8 * 1024 * 1024
MAX_TOTAL = 32 * 1024 * 1024


class HTMLAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = set()

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in ("script", "img", "source") and values.get("src"):
            self.paths.add(values["src"])
        if tag == "link" and values.get("href"):
            if set(values.get("rel", "").split()) & {"stylesheet", "modulepreload", "preload", "icon"}:
                self.paths.add(values["href"])


def local_path(base, value):
    if value.startswith("//") or urlsplit(value).scheme or ".." in value.split("/") or "%" in value:
        raise ValueError(f"Unsupported asset: {value}")
    parsed = urlsplit(urljoin("/" + base, value))
    path = parsed.path.lstrip("/")
    if not ASSET.fullmatch(path) or parsed.query or parsed.fragment:
        raise ValueError(f"Unrecognized static asset: {value}")
    return path


def dependencies(name, body):
    if name == "index.html":
        document = body.decode()
        if "<title>Tariff Signal | U.S. Import Exposure</title>" not in document or "<h1" not in document or "</html>" not in document:
            raise ValueError("Unexpected Tariff homepage")
        parser = HTMLAssets()
        parser.feed(document)
        paths = {local_path(name, value) for value in parser.paths}
        if not any(p.endswith(".css") for p in paths) or not any(p.endswith(".js") for p in paths):
            raise ValueError("Missing style or application bundle")
        return paths
    if name.endswith((".js", ".css")):
        source = body.decode()
        if source.lstrip().startswith("<"):
            raise ValueError(f"HTML served for {name}")
        if name.endswith(".js"):
            subprocess.run(["node", "--input-type=module", "--check"], input=body, check=True)
            # Vite's literal imports and module-preload dependency table.
            values = re.findall(r"""["'`]((?:\./|/?_next/static/)[^"'`\s]+?\.(?:js|css|woff2?|png|svg|webp|jpe?g))["'`]""", source)
            return {local_path(name, "/" + v if v.startswith("_next/") else v) for v in values}
        urls = re.findall(r"""url\(\s*["']?([^"')\s]+)""", source)
        urls += re.findall(r"""@import\s+["']([^"']+)["']""", source)
        return {local_path(name, v) for v in urls if not v.startswith(("data:", "#"))}
    return set()


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise ValueError("Unexpected mirror redirect")


def download(name):
    url = ORIGIN if name == "index.html" else ORIGIN + name
    req = Request(url, headers={"User-Agent": "Tariff-Signal-Mirror", "Cache-Control": "no-cache"})
    with build_opener(NoRedirect).open(req, timeout=12) as response:
        body = response.read(MAX_FILE + 1)
        length = response.headers.get("Content-Length")
        if length is not None and len(body) != int(length):
            raise ValueError(f"Incomplete response: {name}")
        return body


def snapshot(reader, target):
    target.mkdir(parents=True, exist_ok=False)
    seen = set()
    todo = {"index.html"}
    total = 0
    while todo:
        name = todo.pop()
        body = reader(name)
        total += len(body)
        if not 0 < len(body) <= MAX_FILE or total > MAX_TOTAL or len(seen) >= 128:
            raise ValueError("Unexpected mirror size")
        dest = target / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(body)
        seen.add(name)
        todo.update(dependencies(name, body) - seen)


def stage(source, destination):
    if source.is_symlink():
        raise ValueError("Invalid snapshot directory")

    def read(name):
        path = source / name
        if path.resolve() != source.resolve() / name or not path.is_file():
            raise ValueError(f"Missing or unsafe snapshot file: {name}")
        return path.read_bytes()

    snapshot(read, destination)
    (destination / ".nojekyll").touch()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=("refresh", "stage"))
    parser.add_argument("target", type=Path)
    parser.add_argument("--source", type=Path, default=Path("tariff-signal"))
    args = parser.parse_args()
    if args.mode == "refresh":
        snapshot(download, args.target)
    else:
        stage(args.source, args.target)
