"""Preserve three independent interfaces and retire only development tools."""
import hashlib,re,shutil,json
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[3]
SITE=ROOT/'_site'
def redirect(title,target):
 return f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><meta http-equiv="refresh" content="0;url={target}"><p><a href="{target}">{title}</a></p></html>'
for sid in ['home-care','luggage-atlas','china-toys']:
 site=SITE/sid
 # Keep all original research photographs, including reference photos previously used in workshops.
 retired={'home-care':['workshop-assets','workshop-models'], 'luggage-atlas':['models','vendor','design-source'], 'china-toys':['retail','vendor']}[sid]
 for name in retired:
  if (site/name).is_dir():shutil.rmtree(site/name)
 target='/home-care/?view=opportunities' if sid=='home-care' else './#directory' if sid=='luggage-atlas' else './#explore'
 for name in ['studio.html','open-story.html','workshop.html','planogram.html']:
  if (site/name).exists():(site/name).write_text(redirect('Open '+sid.replace('-',' '),target))
 if sid=='home-care':
  manifest=json.loads((site/'ui-assets/manifest.json').read_text())
  if manifest.get('assets'):
   allowed=set(manifest['assets'])|{'manifest.json'}
   for asset in (site/'ui-assets').iterdir():
    if asset.is_file() and asset.name not in allowed:asset.unlink()
  for p in (site/'workshop').glob('*.html'):p.write_text(redirect('Homecare white-label recommendations',target))
 if sid=='china-toys':
  for stem in ['retail-pack-data','planogram','retail-data','retail-brand-data','retail-artwork','retail-studio','workshop-flow']:
   for ext in ['.js','.css']:(site/(stem+ext)).unlink(missing_ok=True)
 # Content-derived cache keys keep original application assets fresh after data/UI updates.
 def version(m):
  attr,url=m.group(1),m.group(2);path=urlsplit(url).path
  if path.startswith(('http:','https:','//','data:')):return m.group(0)
  p=SITE/path.lstrip('/') if path.startswith('/') else site/path
  if p.is_file() and p.suffix in ['.js','.css']:
   return attr+'="'+path+'?v='+hashlib.sha256(p.read_bytes()).hexdigest()[:12]+'"'
  return m.group(0)
 for p in site.glob('*.html'):
  p.write_text(re.sub(r'(src|href)="([^"]+)"',version,p.read_text()))
 print('Preserved original interface:',sid)
