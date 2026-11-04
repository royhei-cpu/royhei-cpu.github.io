"""Read publisher-supplied news images and keep small, local copies for the site."""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
import re


def image_url(value, base):
    if not value:
        return ''
    url = urljoin(base, value or '')
    try:
        parts = urlsplit(url)
        if parts.scheme not in ('https', 'http') or not parts.hostname or parts.username:
            return ''
    except ValueError:
        return ''
    return url


class PublisherImages(HTMLParser):
    def __init__(self, base):
        super().__init__(convert_charrefs=True)
        self.base, self.meta, self.photos = base, [], []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta' and (attrs.get('property') or attrs.get('name', '')).lower() in ('og:image', 'og:image:secure_url', 'twitter:image'):
            url = image_url(attrs.get('content'), self.base)
            if url:
                self.meta.append(dict(url=url, alt=''))
        if tag == 'img':
            url = image_url(attrs.get('src') or attrs.get('data-src'), self.base)
            if not url or re.search(r'logo|favicon|tracking|pixel|spacer|qrcode|zxcode', url, re.I):
                return
            if any(str(attrs.get(key, '')).isdigit() and int(attrs[key]) < 80 for key in ('width', 'height')):
                return
            self.photos.append(dict(url=url, alt=attrs.get('alt', '').strip()[:240]))


def extract_image(markup, base, publisher, title, metadata_only=False):
    parser = PublisherImages(base)
    parser.feed(markup)
    candidates = parser.meta if metadata_only else parser.photos
    if not candidates:
        return None
    photo = dict(candidates[0])
    photo.update(alt=photo['alt'] or f'{publisher}: {title}', credit=publisher, kind='Article image', source_page=base)
    return photo


def article_image(item):
    try:
        request = Request(item['url'], headers={'User-Agent': 'Mozilla/5.0 ChinaToyAtlas/1.0'})
        with urlopen(request, timeout=10) as response:
            raw = response.read(2_000_000)
        return extract_image(raw.decode('utf-8', errors='replace'), item['url'], item['publisher'], item['title'], metadata_only=True)
    except Exception:
        return None


def enrich_feed_images(items, previous):
    old = {item['url']: item for item in previous}
    for item in items:
        if not item.get('image') and old.get(item['url'], {}).get('image'):
            item['image'] = old[item['url']]['image']
    missing = [item for item in items if not item.get('image')]
    with ThreadPoolExecutor(max_workers=4) as pool:
        for item, photo in zip(missing, pool.map(article_image, missing)):
            if photo:
                item['image'] = photo


def cache_photo(photo, root):
    """Unavailable images keep their source URL; the UI has a local fallback."""
    photo = dict(photo)
    if photo.get('src', '').startswith('images/') and (root / photo['src']).is_file():
        return photo
    url = image_url(photo.get('url'), '')
    if not url:
        return None
    folder = root / 'images' / 'news'
    folder.mkdir(parents=True, exist_ok=True)
    key = sha256(url.encode()).hexdigest()[:20]
    existing = next(folder.glob(key + '.*'), None)
    if existing:
        photo['src'] = existing.relative_to(root).as_posix()
        return photo
    try:
        request = Request(url, headers={'User-Agent': 'Mozilla/5.0 ChinaToyAtlas/1.0'})
        with urlopen(request, timeout=12) as response:
            raw = response.read(8_000_001)
        if len(raw) > 8_000_000:
            raise ValueError('Image too large')
        suffix = ('.jpg' if raw.startswith(b'\xff\xd8\xff') else '.png' if raw.startswith(b'\x89PNG\r\n\x1a\n') else '.webp' if raw[:4] == b'RIFF' and raw[8:12] == b'WEBP' else '.gif' if raw[:6] in (b'GIF87a', b'GIF89a') else None)
        if not suffix:
            raise ValueError('Not a supported photo')
        # Local development/QA has Pillow; publish also works with the stdlib alone.
        try:
            from PIL import Image, ImageOps
            image = ImageOps.exif_transpose(Image.open(BytesIO(raw)))
            image.thumbnail((1000, 800))
            canvas = Image.new('RGB', image.size, 'white')
            if image.mode == 'RGBA':
                canvas.paste(image, mask=image.getchannel('A'))
            else:
                canvas.paste(image.convert('RGB'))
            output = BytesIO()
            canvas.save(output, 'JPEG', quality=84, optimize=True)
            raw, suffix = output.getvalue(), '.jpg'
        except ImportError:
            pass
        path = folder / (key + suffix)
        path.write_bytes(raw)
        photo['src'] = path.relative_to(root).as_posix()
    except Exception:
        photo.pop('src', None)
    return photo


def prepare_images(items, root):
    with ThreadPoolExecutor(max_workers=6) as pool:
        photos = list(pool.map(lambda item: cache_photo(item['image'], root) if item.get('image') else None, items))
    for item, photo in zip(items, photos):
        if photo:
            item['image'] = photo
