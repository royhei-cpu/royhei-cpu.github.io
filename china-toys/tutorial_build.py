#!/usr/bin/env python3
"""Record actual catalog interactions with English neural narration and publish media.
The video is a dated guided demonstration, not a completeness certification.
"""
from __future__ import annotations
import hashlib, json, os, re, subprocess, sys, time
from pathlib import Path
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'tutorial'
WORK=Path('/tmp/china-toys-tutorial-build')
QA=Path('/tmp/china-toys-tutorial-qa')
for p in (OUT,WORK,QA):p.mkdir(parents=True,exist_ok=True)
SCENES=[
('Start here','Welcome to China Toy Atlas. This tour shows you how to find blind boxes and squishy toys, read the details we have, and make a useful shortlist. You are looking at the actual catalog. It is a growing research directory, not a complete list of every product sold in China.'),
('Weekly updates','Start with this week\'s updates. Added to catalog means newly added here, not necessarily newly launched. New releases have release dates in the week shown. Price changes and back in stock refer to tracked shops. Click a number to see the matching items, and check the last completed update date.'),
('Choose a shop','Choose a retailer or shop to see its own listings. Here, select Top Toy\'s international store. The results and weekly counts change with your selection. The price belongs to the shop and market shown. An overseas store price must not be treated as a mainland China retail price.'),
('Search a brand or item','Reset the filters, then choose a brand or type a product name. In this example, search for Crybaby, Cry Me An Ocean. Product cards now put available facts first, such as material, size, character and design options. Missing wave numbers are not repeated as empty labels.'),
('Read all available details','Open Full product details. Read the shop description, available dimensions and materials, and follow their source links. Expand listed options to compare a single blind box with a full set or a specific character. Prices for different packs are not directly comparable. Source photographs may show example designs, not the guaranteed contents of one random box.'),
('Understand the dates','The information still to verify is kept separately. Missing facts are never guessed. A launch date is a release date supported by a source. A shop page date is when that retailer published its listing. They are different. Launches and waves shows supported dates and clearly marked estimates, with the market identified.'),
('Read the trend reason','Open Trending and read the reason on the card, not just the badge. A reported purchase counter, a dated demand report and a retailer\'s hot pick are different kinds of evidence. Possible product appeal is shown separately as interpretation. A shop recommendation does not prove nationwide popularity or measured sales growth.'),
('Save and export','Use the bookmark on a product photo to save it. Open Shortlist to review your saved items on this device. Download C S V exports the filtered list, including available specifications, source links and price options. The Full C S V link at the bottom downloads the whole catalog. You can open these files in Excel.'),
('Check coverage and share','Finally, open Brand coverage and item checks to see what is partial or missing. Weekly updates use the same website link. Check the actual completed-update date rather than assuming every shop was refreshed. Share this as a product-discovery tool, and verify the original listing before making a purchasing decision.')
]


def run(args):
    subprocess.run([str(x) for x in args],check=True)


def patch_sources():
    p=ROOT/'review_publish.py';text=p.read_text()
    if 'import source_copy' not in text:
        text=text.replace('import review_finalize as f','import review_finalize as f\nimport source_copy\nsource_copy.install(f.v)')
        text=text.replace('    f.main()\n','    f.main()\n    source_copy.export(R)\n')
        p.write_text(text)
    run([sys.executable,ROOT/'review_publish.py'])
    p=ROOT/'index.html';text=p.read_text()
    if 'catalog-guide.js' not in text:
        text=text.replace('</head>','<script src="catalog-guide.js?v=20261030-facts-tutorial-1" defer></script>\n</head>')
    if 'ATLAS_INITIAL_HASH' not in text:
        text=text.replace('<script src="catalog.js"','<script>window.ATLAS_INITIAL_HASH=location.hash;</script>\n<script src="catalog.js"')
    p.write_text(text)
    guide=ROOT/'catalog-guide.js';ui=guide.read_text().replace("if(location.hash==='#tutorial')","if(location.hash==='#tutorial'||window.ATLAS_INITIAL_HASH==='#tutorial')")
    ui=ui.replace('.header-links #exportButton{display:none}', '.header-links{width:100%;justify-content:space-between}.header-links #exportButton{display:inline-flex}.topbar-inner{flex-wrap:wrap;padding:12px 0}')
    guide.write_text(ui)
    p=ROOT.parent/'.github/workflows/publish.yml';text=p.read_text()
    if 'Copy China Toy tutorial and facts guide' not in text:
        needle='      - name: Configure Pages\n'
        assert needle in text
        text=text.replace(needle,'      - name: Copy China Toy tutorial and facts guide\n        run: |\n          if [ -f china-toys/catalog-guide.js ]; then cp china-toys/catalog-guide.js _site/china-toys/; fi\n          if [ -d china-toys/tutorial ]; then cp -R china-toys/tutorial _site/china-toys/tutorial; fi\n'+needle)
        p.write_text(text)
    run(['node','--check',ROOT/'catalog-guide.js'])
    run(['node','--check',ROOT/'app.js'])


def make_audio():
    from kokoro import KPipeline
    import torch
    torch.set_num_threads(2)
    pipe=KPipeline(lang_code='a',repo_id='hexgrad/Kokoro-82M',device='cpu')
    results=[]
    for i,(title,text) in enumerate(SCENES):
        chunks=[];spoken=[]
        for result in pipe(text,voice='am_fenrir',speed=0.96,split_pattern=r'\n+'):
            gs,ps,audio=result
            chunks.append(np.asarray(audio,dtype=np.float32));spoken.append(gs)
        assert chunks, 'Narration generation returned no audio'
        audio=np.concatenate([np.zeros(7200,dtype=np.float32),*chunks,np.zeros(16800,dtype=np.float32)])
        assert np.isfinite(audio).all() and np.sqrt(np.mean(audio**2))>0.004
        path=WORK/f'{i:02}.wav';sf.write(path,audio,24000,subtype='PCM_16')
        results.append({'index':i,'label':title,'text':text,'duration':len(audio)/24000,'audio':str(path),'tts_text':' '.join(spoken)})
        print('VOICE',i,title,results[-1]['duration'],flush=True)
    return results


BANNER='''({title,step})=>{
const s=document.createElement('style');s.textContent='html{scroll-behavior:auto!important;scroll-padding-top:106px}.tour-focus{outline:3px solid #c8954c!important;outline-offset:5px!important}.tour-banner{position:fixed;z-index:200000;left:0;top:0;width:100%;padding:15px 34px;background:#123d35;color:white;display:flex;align-items:center;gap:22px;font-family:Arial,sans-serif;box-shadow:0 3px 12px #0002;pointer-events:none}.tour-banner b{font-size:26px}.tour-banner span{font-size:14px;opacity:.85}.tour-pointer{position:fixed;z-index:300000;width:24px;height:24px;border:3px solid #c8954c;border-radius:50%;background:#ffffffbb;pointer-events:none;transform:translate(-50%,-50%);transition:left .35s ease,top .35s ease}';document.head.append(s);
const b=document.createElement('div');b.className='tour-banner';b.innerHTML='<span>CHINA TOY ATLAS<br>NARRATED GUIDE '+step+' / 9</span><b></b>';b.querySelector('b').textContent=title;document.body.append(b);
const c=document.createElement('div');c.id='tourPointer';c.className='tour-pointer';c.style.left='1500px';c.style.top='850px';document.body.append(c);
}'''


def record_scenes(meta):
    server=subprocess.Popen([sys.executable,'-m','http.server','8785','--directory',str(ROOT.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    errors=[];checks=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            for info in meta:
                i=info['index'];context=browser.new_context(viewport={'width':1600,'height':900},record_video_dir=str(WORK/'recordings'),record_video_size={'width':1600,'height':900},accept_downloads=True)
                page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto('http://127.0.0.1:8785/china-toys/',wait_until='domcontentloaded');page.wait_for_selector('.product-card');page.wait_for_timeout(350)
                def scroll(sel):
                    page.locator(sel).first.evaluate('(e)=>e.scrollIntoView({block:"center",behavior:"instant"})');page.wait_for_timeout(250)
                def focus(sel):
                    page.evaluate('document.querySelectorAll(".tour-focus").forEach(e=>e.classList.remove("tour-focus"))')
                    el=page.locator(sel).first;el.evaluate('(e)=>e.classList.add("tour-focus")');rect=el.bounding_box()
                    if rect:page.evaluate('p=>{const e=document.getElementById("tourPointer");if(e){e.style.left=p.x+"px";e.style.top=p.y+"px"}}',{'x':rect['x']+min(rect['width']*.5,180),'y':rect['y']+min(rect['height']*.5,55)})
                def click(sel):
                    focus(sel);page.wait_for_timeout(400);page.locator(sel).first.click();page.wait_for_timeout(300)
                def reset():
                    page.locator('.view-tab[data-view="catalog"]').click();page.locator('#resetFilters').click();page.wait_for_timeout(200)
                def find_example():
                    reset();page.locator('#brandSelect').select_option('POP MART')
                    page.locator('#search').fill('Cry Me An Ocean');page.wait_for_timeout(300);assert page.locator('.product-card').count()>0
                if i==0:page.evaluate('scrollTo(0,0)')
                elif i==1:scroll('#weeklyOverview')
                elif i==2:scroll('.retailer-section')
                elif i==3:scroll('.retailer-section')
                elif i in (4,5):
                    find_example();page.locator('.card-footer button[data-open]').first.click();page.wait_for_selector('.review-details');scroll('.review-details')
                elif i==6:
                    reset();page.locator('.view-tab[data-view="trending"]').click();page.wait_for_selector('.review-reason');scroll('.review-reason')
                elif i==7:find_example();scroll('.product-card')
                elif i==8:scroll('#brandCoverageReview')
                page.evaluate(BANNER,{'title':info['label'],'step':i+1})
                start=time.monotonic();duration=info['duration']
                def at(fraction):
                    remaining=start+duration*fraction-time.monotonic()
                    if remaining>0:page.wait_for_timeout(round(remaining*1000))
                if i==0:
                    at(.32);scroll('#weeklyOverview');focus('#weeklyOverview')
                    at(.7);scroll('.retailer-section');focus('#retailer')
                elif i==1:
                    at(.12);focus('[data-weekly="added"]');at(.30);focus('[data-weekly="launch"]');at(.5);focus('[data-weekly="price"]');at(.63);focus('[data-weekly="restock"]');at(.77);click('[data-weekly="launch"]');scroll('#results')
                elif i==2:
                    at(.18);focus('#retailer');page.select_option('#retailer','toptoy');page.wait_for_timeout(400)
                    assert 'TOP TOY' in page.locator('#resultsTitle').inner_text();checks.append('TOP TOY retailer filter changes results')
                    at(.46);scroll('.product-card');focus('.price-caption');at(.74);focus('.card-facts')
                elif i==3:
                    at(.10);focus('#brandSelect');page.select_option('#brandSelect','POP MART');at(.27);scroll('#search');focus('#search');page.locator('#search').press_sequentially('Cry Me An Ocean',delay=45);page.wait_for_timeout(300)
                    at(.55);scroll('.product-card');focus('.review-spec');at(.76);focus('.card-facts')
                elif i==4:
                    at(.10);focus('.review-details');at(.35);scroll('.review-options');click('.review-options summary');at(.58);focus('.review-options table');at(.77);scroll('.review-photos');focus('.review-photos')
                elif i==5:
                    at(.12);scroll('.info-gaps');click('.info-gaps summary');at(.36);page.locator('#closeProduct').click();page.locator('#resetFilters').click();page.locator('.view-tab[data-view="timeline"]').click();scroll('#timelinePanel');at(.62);focus('.timeline-item');at(.82);focus('#contextNote')
                elif i==6:
                    at(.12);focus('.review-reason');at(.58)
                    if page.locator('.review-appeal').count():scroll('.review-appeal');focus('.review-appeal')
                    at(.8);scroll('.review-reason')
                elif i==7:
                    at(.13);click('.product-card .save-button');at(.28);click('.view-tab[data-view="saved"]');scroll('#catalogGrid');at(.50);scroll('#exportButton');focus('#exportButton')
                    with page.expect_download() as dl:page.locator('#exportButton').click()
                    dl.value.save_as(str(QA/'shortlist-export.csv'));checks.append('Shortlist CSV download completed')
                    at(.76);scroll('footer');focus('footer a[href="catalog.csv"]')
                elif i==8:
                    at(.10);click('#brandCoverageReview>summary');at(.30);scroll('.review-table-wrap');focus('.review-table-wrap');at(.64);page.locator('#brandCoverageReview>summary').click();scroll('#weeklyOverview');focus('#lastUpdated')
                at(.90)
                page.screenshot(path=str(QA/f'chapter-{i+1:02}.png'))
                at(1.0)
                await_path=page.video
                context.close();path=await_path.path()
                probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-of','json',str(path)]))
                actual=float(probe['format']['duration']);trim=max(0,actual-duration)
                segment=WORK/f'segment-{i:02}.mp4'
                run(['ffmpeg','-y','-loglevel','error','-ss',f'{trim:.3f}','-i',path,'-i',info['audio'],'-t',f'{duration:.3f}','-vf','scale=1920:1080:flags=lanczos,fps=25','-c:v','libx264','-preset','fast','-crf','25','-pix_fmt','yuv420p','-profile:v','main','-level','4.0','-c:a','aac','-b:a','96k','-ac','2','-ar','48000','-af','loudnorm=I=-16:TP=-1.5:LRA=7','-movflags','+faststart',segment])
                info['segment']=str(segment);print('CHAPTER',i,'saved',flush=True)
            browser.close()
        assert not errors, errors
    finally:server.terminate()
    return checks


def stamp(s):
    ms=round(s*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'


def assemble(meta):
    playlist=WORK/'concat.txt';playlist.write_text(''.join("file '"+x['segment']+"'\n" for x in meta))
    video=OUT/'China_Toy_Atlas_Tutorial.mp4'
    run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',playlist,'-c','copy','-movflags','+faststart',video])
    run(['ffmpeg','-v','error','-i',video,'-f','null','-'])
    duration=0;chapters=[];vtt=['WEBVTT',''];transcript=[]
    for x in meta:
        chapters.append({'start':round(duration,3),'label':x['label']})
        transcript+= [x['label'],x['text'],'']
        sentences=re.split(r'(?<=[.!?])\s+',x['text']);words=sum(len(s.split()) for s in sentences);pos=duration+.3
        for sentence in sentences:
            length=(x['duration']-1)*len(sentence.split())/words
            vtt.extend([f'{stamp(pos)} --> {stamp(pos+length)}',sentence,'']);pos+=length
        duration+=x['duration']
    (OUT/'chapters.json').write_text(json.dumps({'duration':duration,'chapters':chapters,'recorded':'2026-10-30','voice':'English synthetic male narration','captions':'Sentence timings proportional within each narrated chapter'},indent=2))
    (OUT/'transcript.txt').write_text('\n'.join(transcript))
    (OUT/'captions.vtt').write_text('\n'.join(vtt))
    (QA/'narration-generation.json').write_text(json.dumps(meta,indent=2))
    run(['ffmpeg','-y','-loglevel','error','-ss','6','-i',video,'-frames:v','1',WORK/'poster-frame.jpg'])
    im=Image.open(WORK/'poster-frame.jpg').convert('RGB');im.thumbnail((1280,720))
    draw=ImageDraw.Draw(im);draw.rectangle((0,0,1280,150),fill='#123d35')
    f='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';font=ImageFont.truetype(f,44);small=ImageFont.truetype(f,23)
    draw.text((38,26),'How to use China Toy Atlas',font=font,fill='white');draw.text((40,94),'Narrated walkthrough • Products, prices, trends and exports',font=small,fill='#e5f1e9')
    draw.ellipse((580,300,700,420),fill='#123d35');draw.polygon([(629,326),(629,394),(672,360)],fill='white');im.save(OUT/'poster.jpg',quality=90)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]))
    assert any(s['codec_type']=='audio' for s in probe['streams'])
    assert any(s.get('width')==1920 and s.get('height')==1080 for s in probe['streams'])
    assert video.stat().st_size<95_000_000
    audit={'duration_seconds':float(probe['format']['duration']),'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'resolution':'1920x1080','narration':'Kokoro am_fenrir, English','full_decode':'passed','captions':'Optional, proportionally timed sentences','scope':'Actual website interactions, recorded 2026-10-30; not a product-data certification'}
    (QA/'video-check.json').write_text(json.dumps(audit,indent=2));return audit


def playback_qa():
    server=subprocess.Popen([sys.executable,'-m','http.server','8785','--directory',str(ROOT.parent)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    errors=[];checks=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch()
            for width,height in [(1440,1000),(390,844)]:
                page=browser.new_page(viewport={'width':width,'height':height});page.on('pageerror',lambda e:errors.append(str(e)))
                page.goto('http://127.0.0.1:8785/china-toys/#tutorial',wait_until='domcontentloaded');page.wait_for_selector('#atlasTutorialVideo');page.wait_for_timeout(500)
                assert page.locator('#tutorial').get_attribute('open') is not None
                page.locator('#atlasTutorialVideo').evaluate('(v)=>{v.muted=false;v.volume=1;return v.play()}');page.wait_for_timeout(1600)
                media=page.locator('#atlasTutorialVideo').evaluate('(v)=>({time:v.currentTime,duration:v.duration,muted:v.muted,paused:v.paused,error:v.error?.message,ready:v.readyState})')
                assert media['time']>0 and not media['paused'] and not media['muted'] and not media.get('error'),media
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.screenshot(path=str(QA/f'embedded-tutorial-{width}.png'));checks.append({'viewport':[width,height],'unmuted_video_playback':media})
                page.locator('#atlasTutorialVideo').evaluate('(v)=>v.pause()');page.locator('#tutorial>summary').click()
                page.locator('#search').fill('Cry Me An Ocean');page.wait_for_timeout(300);page.locator('#catalogGrid').scroll_into_view_if_needed();page.screenshot(path=str(QA/f'facts-first-{width}.png'))
                text=page.locator('.card-facts').all_inner_texts();assert not any(re.search(r'Not (?:disclosed|documented|numbered)',x) for x in text)
                page.locator('.card-footer button[data-open]').first.click();page.wait_for_selector('.info-gaps');page.locator('.review-details').scroll_into_view_if_needed();page.screenshot(path=str(QA/f'full-details-{width}.png'))
                assert page.locator('.review-options').count()>0
                page.close()
            browser.close()
        assert not errors, errors
    finally:server.terminate()
    (QA/'browser-check.json').write_text(json.dumps({'checks':checks,'errors':errors,'browser':'Chromium on GitHub Actions','limitations':'No physical iPhone or subjective audio-listening test'},indent=2))
    return checks


def main():
    patch_sources()
    meta=make_audio();record_scenes(meta);audit=assemble(meta);playback_qa()
    print('TUTORIAL_COMPLETE '+json.dumps(audit),flush=True)

if __name__=='__main__':main()
