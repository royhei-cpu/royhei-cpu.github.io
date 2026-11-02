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
SCENES=json.loads(r'''[["Start here","Welcome to China Toy Atlas. Find Chinese blind boxes, squishies and character toys. Start with a brand, shop or character. Tap a product photo for details. This guide is still growing. Its product counts describe what we have collected, not everything a retailer sells."],["Browse a retailer in one tap","Open Retail chains and tap Top Toy. Its captured shop catalog opens immediately. There is no second product link to choose. These are international store listings, with that market's prices. Other retailers may have only a partial listing. A small count means our research is incomplete, not that the shop sells only a few toys."],["Find your character","Use Brand, Product type and the search box to narrow your choices. Here we select Pop Mart and search for Cry Me An Ocean. Reset filters returns to browsing. Use the Brands page to explore more makers. A character name and the company that makes it are different things."],["Read a product","Tap Full product details. Check the character, size, material and the pictured design. Open the shop options to see whether an offer is one random box, a full set, or a confirmed character. Keep the shop, country and currency in mind. A launch price can be historical. Follow the shop link for today's price and availability."],["Compare your picks","Select two to six products, then open Compare. The table places their photographs, prices, packs and available facts side by side. Compare the same pack and currency. Different character options can have different prices. Blank information means unconfirmed, not zero."],["Save and download","The bookmark saves favourites on this browser. Open Saved favourites to see them again. Download CSV exports the current filtered list. In Compare, Download comparison CSV saves your selected products, and Download photo sheet gives you an illustrated file. CSV contains photo links, not embedded images. You can open CSV in Excel."],["Understand this week and trends","This week shows the saved catalog period and latest source update. Expand it for changes and sources. Added to this guide does not necessarily mean a new product launch. Trending can mean reported demand or a shop's recommendation. Open the evidence to check the date and market. These signals do not automatically establish nationwide rankings or weekly sales growth."],["Music and button sounds","Music and click sounds begin after your first tap, when your browser allows audio. Choose Soft, Medium or Lively. Use Sound on to mute, and tap Sound off to enable it again. Your preference is remembered. Brands and Research also have these controls. Music pauses during the tutorial so you can hear the narration."],["What a partial listing means","Some shops have many captured products, while others have a small researched sample. Partial listing marks this difference. China release highlights are separate from an international shop catalog. The coverage notes explain remaining gaps. Check the original seller before buying, and use the dates shown to judge how recent each price or release is."]]''')


def run(args):
    subprocess.run([str(x) for x in args],check=True)


def patch_sources():
    # Tutorial production must not regenerate or overwrite researched catalog data.
    run(['node','--check',ROOT/'catalog-guide.js'])
    run(['node','--check',ROOT/'retail-chains.js'])

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
                page.evaluate(BANNER,{'title':info['label'],'step':i+1})
                start=time.monotonic();duration=info['duration']
                def at(fraction):
                    remaining=start+duration*fraction-time.monotonic()
                    if remaining>0:page.wait_for_timeout(round(remaining*1000))
                def chains():
                    page.locator('#atlasBrandNav a[href="#retailChains"]').click()
                if i==0:
                    page.evaluate('scrollTo(0,0)')
                    at(.25);click('.collector-help summary')
                    at(.65);scroll('#browseToys');focus('#retailer')
                elif i==1:
                    chains();at(.15)
                    page.get_by_role('tab',name='TOP TOY',exact=True).click()
                    assert 'TOP TOY' in page.locator('#resultsTitle').inner_text()
                    checks.append('One TOP TOY tab click opens its shop catalog')
                    at(.45);scroll('#results');focus('#resultsHint')
                    at(.70);scroll('.product-card');focus('.price-caption')
                elif i==2:
                    scroll('#browseToys');at(.12)
                    page.locator('#brandSelect').select_option('POP MART')
                    at(.35);scroll('#search');page.locator('#search').fill('Cry Me An Ocean')
                    at(.65);scroll('.product-card');focus('.product-title')
                elif i==3:
                    find_example();at(.10);click('.card-footer button[data-open]')
                    at(.35);scroll('.detail-content');focus('#detailTitle')
                    if page.locator('.review-options').count():
                        at(.55);scroll('.review-options');click('.review-options summary')
                    at(.80);scroll('.offer');focus('.offer')
                elif i==4:
                    scroll('#catalogGrid');at(.10)
                    page.locator('[data-compare-select]').nth(0).click()
                    at(.25);page.locator('[data-compare-select]').nth(1).click()
                    at(.40);click('#compareDockOpen')
                    assert page.locator('#compareDialog').is_visible()
                    checks.append('Two products open side-by-side comparison')
                    at(.60);focus('#compareScroll')
                    at(.82);focus('#compareExport')
                elif i==5:
                    find_example();scroll('.product-card');at(.10);click('.save-button')
                    at(.25);click('[data-view="saved"]');scroll('#results')
                    at(.45);scroll('#exportButton')
                    with page.expect_download() as dl:page.locator('#exportButton').click()
                    dl.value.save_as(str(QA/'favourites-export.csv'))
                    checks.append('Saved favourites CSV exported')
                    at(.65);page.locator('#resetFilters').click()
                    page.locator('[data-compare-select]').nth(0).click()
                    page.locator('[data-compare-select]').nth(1).click()
                    click('#compareDockOpen');focus('#comparePhotoExport')
                elif i==6:
                    scroll('#weeklyOverview');at(.15);click('.dashboard-weekly-details summary')
                    at(.38);focus('.dashboard-weekly-details')
                    at(.55);page.locator('[data-view="trending"]').first.click()
                    scroll('.product-card')
                    reasons=page.locator('.product-card details').filter(has=page.locator('.review-reason'))
                    if reasons.count():reasons.first.locator('summary').click()
                    at(.80);focus('.card-badge')
                elif i==7:
                    page.evaluate('scrollTo(0,0)');at(.15);focus('#atlasSound')
                    page.locator('#atlasSoundLevel').select_option('lively')
                    at(.42);focus('#atlasSoundLevel')
                    at(.65);page.locator('#atlasSound').click()
                    at(.80);focus('#watchTutorialButton')
                elif i==8:
                    chains();at(.20);page.get_by_role('tab',name='X11',exact=True).click()
                    scroll('.chain-partial-label');focus('.chain-partial-label')
                    at(.52);scroll('.ca-product');focus('.ca-count')
                    at(.78);scroll('#chainCoverageAudit');click('#chainCoverageAudit summary')
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
    (OUT/'chapters.json').write_text(json.dumps({'duration':duration,'chapters':chapters,'recorded':'2026-11-02','voice':'English synthetic male narration','captions':'Sentence timings proportional within each narrated chapter'},indent=2))
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
    audit={'duration_seconds':float(probe['format']['duration']),'bytes':video.stat().st_size,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'resolution':'1920x1080','narration':'Kokoro am_fenrir, English','full_decode':'passed','captions':'Optional, proportionally timed sentences','scope':'Actual website interactions, recorded 2026-11-02; not a product-data certification'}
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
                page.locator('#atlasSound').click()
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
    meta=make_audio();record_scenes(meta);audit=assemble(meta)
    guide=ROOT/'catalog-guide.js'
    guide.write_text(guide.read_text().replace('20261031-2','20261102-collector-tour').replace('Recorded examples are dated; live prices can change.','Updated 2 November 2026: one-tap retailers, comparison, exports and sound. Prices in recorded examples can change.'))
    index=ROOT/'index.html'
    text=index.read_text()
    text=re.sub(r'catalog-guide\\.js\\?v=[^" ]+', 'catalog-guide.js?v='+hashlib.sha256(guide.read_bytes()).hexdigest()[:12], text)
    index.write_text(text)
    playback_qa()
    print('TUTORIAL_COMPLETE '+json.dumps(audit),flush=True)

if __name__=='__main__':main()
