"""Stage Pawlish for Pages without copying credentials or account data."""
import concurrent.futures
import hashlib
import json
import pathlib
import shutil
import sys
import time
import urllib.request

source = pathlib.Path(__file__).resolve().parent
target = pathlib.Path(sys.argv[1]).resolve()
manifest = json.loads((source / 'assets-manifest.json').read_text())
origin = 'https://pawlish-ryans-english-dog.lhei111.chatgpt.site'
assert manifest['source'] == origin and manifest['release'] == 30
target.mkdir(parents=True, exist_ok=True)
for name in ['index.html', 'connect.html', 'guest-host.js', 'connect.css', 'connect.js', 'key-input.js', 'voice-check.html', 'voice-check.js', 'microphone.js', 'styles.css', 'voice-check.css']:
    shutil.copyfile(source / name, target / name)

class SameSiteOnly(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, msg, headers, newurl):
        raise RuntimeError('Unexpected redirect while fetching a public asset')

def download(entry):
    name = pathlib.PurePosixPath(entry['path'])
    if not str(name).startswith('assets/') or '..' in name.parts or name.is_absolute():
        raise RuntimeError('Invalid asset path')
    if not 0 <= entry['size'] <= 20 * 1024 * 1024:
        raise RuntimeError('Invalid asset size')
    opener = urllib.request.build_opener(SameSiteOnly)
    for attempt in range(3):
        try:
            request = urllib.request.Request(origin + '/' + str(name), headers={'User-Agent': 'Pawlish-GitHub-Release/30'})
            with opener.open(request, timeout=35) as response:
                body = response.read(entry['size'] + 1)
            if len(body) != entry['size'] or hashlib.sha256(body).hexdigest() != entry['sha256']:
                raise RuntimeError('Asset integrity check failed: ' + str(name))
            destination = target / str(name)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(body)
            return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)

with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
    list(pool.map(download, manifest['files']))
(target / '.nojekyll').touch()
print('Pawlish staged:', len(manifest['files']), 'verified audio, image and font assets.')
