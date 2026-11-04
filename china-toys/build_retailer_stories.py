"""Build sourced retailer stories/news; refresh only explicitly configured public feeds.
No credentials, guessed release dates, generated news or sales estimates are used.
"""
from pathlib import Path
from datetime import datetime, timezone, date
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
from concurrent.futures import ThreadPoolExecutor
from email.utils import parsedate_to_datetime
import argparse, hashlib, html, json, re
import xml.etree.ElementTree as ET
from product_scope import eligible
ROOT=Path(__file__).resolve().parent
TOPIC=re.compile(r'blind[ -]?box|squish|collectib|designer[ -]?toy|plush|sanrio|sonny[ -]?angel|pop[ -]?mart|top[ -]?toy|52toys|nanci|nommi|penny.?s[ -]?box|盲盒|捏捏|潮玩|毛绒|毛絨|ソニーエンジェル|フィギュア|ブラインド|新商品|発売',re.I)
OUTSIDE=re.compile(r'\blego\b|building[ -]blocks?|model[ -]kits?|\bcamera\b|tamagotchi|happy[ -]meal|\b(?:400|600|1000)%|calendar|カレンダー|積木|拼装|拼裝',re.I)
def plain(s):
    return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s or ''))).strip()
def valid_url(s):
    try:return urlsplit(s).scheme in ('https','http') and bool(urlsplit(s).hostname) and not urlsplit(s).username
    except ValueError:return False
def day(s):
    if not s:return None
    try:return datetime.fromisoformat(s.replace('Z','+00:00')).date().isoformat()
    except ValueError:
        try:return parsedate_to_datetime(s).date().isoformat()
        except (ValueError,TypeError):return None
def parse_feed(raw,feed,checked):
    doc=ET.fromstring(raw);entries=doc.findall('{http://www.w3.org/2005/Atom}entry') or doc.findall('./channel/item');items=[]
    for entry in entries:
        def value(key):
            e=entry.find('{http://www.w3.org/2005/Atom}'+key)
            if e is None:e=entry.find(key)
            return ''.join(e.itertext()).strip() if e is not None else ''
        title=plain(value('title'));summary=plain(value('summary') or value('description') or value('content'))
        if not TOPIC.search(title+' '+summary[:700]) or OUTSIDE.search(title):continue
        published=day(value('published') or value('pubDate'));date_kind='Published'
        if not published:published=day(value('updated'));date_kind='Updated by publisher'
        link=entry.find('{http://www.w3.org/2005/Atom}link');url=link.get('href','') if link is not None else value('link')
        if not valid_url(url) or not published:continue
        items.append(dict(id='feed-'+hashlib.sha256(url.encode()).hexdigest()[:16],retailer_ids=[feed['retailer_id']],title=title[:160],summary='Retailer-published journal entry. Open the original for its full story and any current terms.',published=published,date_kind=date_kind,market=feed.get('market','Source store market'),type='Retailer journal',url=url,publisher=feed['publisher'],checked=checked))
    return items[:35]
def refresh_feed(feed,prior,checked):
    try:
        assert valid_url(feed['url'])
        request=Request(feed['url'],headers={'User-Agent':'ChinaToyAtlas/1.0 (retailer news directory)'})
        with urlopen(request,timeout=12) as response:raw=response.read(2_000_001)
        if len(raw)>2_000_000:raise ValueError('Feed too large')
        items=parse_feed(raw,feed,checked)
        return dict(url=feed['url'],retailer_id=feed['retailer_id'],status='read',checked=checked,last_success=checked,items=items)
    except Exception as error:
        return dict(url=feed['url'],retailer_id=feed['retailer_id'],status='unavailable; retained dated cache' if prior.get('items') else 'unavailable',checked=checked,last_success=prior.get('last_success'),items=prior.get('items',[]),error=type(error).__name__)
def build(refresh=False,root=ROOT,as_of=None):
    today=as_of or datetime.now(timezone.utc).date().isoformat();date.fromisoformat(today)
    seed=json.loads((root/'retailer-stories.json').read_text());catalog=json.loads((root/'catalog.json').read_text());chains=json.loads((root/'chain-assortments.json').read_text())
    profiles=seed['retailers'];by_id={r['id']:r for r in profiles}
    assert len(by_id)==len(profiles)
    assert {s['id'] for s in catalog['sources']} <= {s for r in profiles for s in r['source_ids']},'A configured source needs a retailer profile'
    assert {c['id'] for c in chains['chains']} <= {c for r in profiles for c in r['chain_ids']},'A retail chain needs a profile'
    for r in profiles:
        assert r['background'] and r['background_sources'] and all(valid_url(s['url']) for s in r['background_sources'])
    cache_path=root/'retailer-news-cache.json';cache=json.loads(cache_path.read_text()) if cache_path.exists() else {'feeds':[]};old={f['url']:f for f in cache['feeds']}
    feeds=[dict(f,publisher=by_id[f['retailer_id']]['name'],market=by_id[f['retailer_id']]['market']) for f in seed['feeds']]
    if refresh:
        with ThreadPoolExecutor(max_workers=6) as pool:collected=list(pool.map(lambda f:refresh_feed(f,old.get(f['url'],{}),today),feeds))
        cache={'feeds':collected};cache_path.write_text(json.dumps(cache,ensure_ascii=False,indent=2)+'\n')
    news=list(seed['curated_updates'])
    source_map={s['id']:s for s in chains['sources']};grouped={}
    for p in chains['products']:
        if not eligible(p) or p.get('evidence_type')!='official_sale_announcement':continue
        src=source_map.get(p.get('source_id'),{})
        if not day(src.get('published_date')) or not valid_url(src.get('url','')):continue
        bucket=grouped.setdefault(src['url'],dict(source=src,products=[],retailers=set()))
        bucket['products'].append(p)
        bucket['retailers'].update(r['id'] for r in profiles if set(r['chain_ids'])&set(p.get('chain_ids',[])))
    for url,g in grouped.items():
        if not g['retailers']:continue
        src=g['source'];p=g['products'][0];detail=re.split(r'(?<=[.!?])\s+',p.get('summary',''))[0];detail=detail if len(detail)<=230 else detail[:220].rsplit(' ',1)[0]+'…';names=', '.join(by_id[id]['name'] for id in sorted(g['retailers']));release=p.get('release') or {}
        news.append(dict(id='release-'+src['id'],retailer_ids=sorted(g['retailers']),title=p['name']+(' and other series' if len(g['products'])>1 else '')+' · retail release',summary='The source names '+names+' for this '+p['category'].lower()+' release. '+detail,published=src['published_date'],event_date=release.get('date'),market='Mainland China',type='Release announcement',url=url,publisher=src.get('publisher','Manufacturer / retailer'),checked=src.get('checked'),product_ids=[x['id'] for x in g['products']]))
    for f in cache['feeds']:news.extend(f.get('items',[]))
    # Deduplicate by original article URL, preserving curated summaries and merging retailer tags.
    unique={}
    for item in news:
        if OUTSIDE.search(item.get('title','')) or not day(item.get('published')) or item['published']>today or not valid_url(item.get('url','')):continue
        if not set(item['retailer_ids'])<=set(by_id):raise ValueError('Unknown retailer tag')
        if item['url'] in unique:unique[item['url']]['retailer_ids']=sorted(set(unique[item['url']]['retailer_ids']+item['retailer_ids']))
        else:unique[item['url']]=dict(item,date_kind=item.get('date_kind','Published'))
    news=sorted(unique.values(),key=lambda n:(n['published'],n['id']),reverse=True)
    result=dict(version=1,generated=today,feeds_checked=max((f['checked'] for f in cache['feeds']),default=None),background_reviewed=seed['reviewed'],catalog_updated=catalog.get('updated'),scope=seed['scope'],retailers=profiles,updates=news,feed_health=[{k:v for k,v in f.items() if k!='items'} for f in cache['feeds']],methods='Company news, retailer journals, manufacturer release announcements and catalog observations are separate. No new post does not mean no retailer activity. Store stock and launch dates require their own evidence. Public configured journals are checked during the existing site build; background stories and curated announcements retain their review dates.')
    (root/'retailer-stories-data.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(root/'retailer-stories-data.js').write_text('window.ATLAS_RETAILER_STORIES='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
    # Keep these assets present and cache-busted after the existing catalog generators run.
    index=root/'index.html'
    if index.exists():
        text=index.read_text()
        for file in ['retailer-stories-data.js','retailer-stories.js','retailer-stories.css','simple-navigation.js']:
            path=root/file
            if not path.exists():continue
            version=hashlib.sha256(path.read_bytes()).hexdigest()[:12]
            if re.search(re.escape(file)+r'\?v=[^"\s]+',text):text=re.sub(re.escape(file)+r'\?v=[^"\s]+',file+'?v='+version,text)
            elif file!='simple-navigation.js':
                tag=('<link rel="stylesheet" href="'+file+'?v='+version+'">' if file.endswith('.css') else '<script src="'+file+'?v='+version+'" defer></script>')
                text=text.replace('</head>',tag+'\n</head>')
        index.write_text(text)
    print('Retailer stories:',len(profiles),'profiles;',len(news),'dated updates;',sum(f['status']=='read' for f in cache['feeds']),'read public feeds')
    return result
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--refresh-feeds',action='store_true');args=parser.parse_args();build(args.refresh_feeds)
