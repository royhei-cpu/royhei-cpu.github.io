"""Package a completed guide, captions, chapter links and reusable source receipts."""
import argparse,base64,hashlib,html,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
SITE=ROOT.parent/'site'
def stamp(t):
 ms=round(t*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02d}:{m:02d}:{s:02d}.{ms:03d}'
def main():
 p=argparse.ArgumentParser();p.add_argument('--work',required=True,type=Path);a=p.parse_args()
 guide=json.loads((ROOT/'guide-scenes.json').read_text());timeline=json.loads((a.work/'timeline.json').read_text());video=(a.work/'Homecare_Workspace_Guide.mp4').read_bytes()
 assert timeline['sourceRelease']==guide['release'];assert len(video)>100000
 old=json.loads((ROOT/'manifest.json').read_text());encoded=base64.b64encode(video).decode();parts=[]
 for i,start in enumerate(range(0,len(encoded),262144)):
  name=f'part-{i:03d}.b64';(ROOT/name).write_text(encoded[start:start+262144]);parts.append(name)
 for name in old['parts']:
  if name not in parts:(ROOT/name).unlink()
 vtt='WEBVTT\n\n'+''.join(f"{stamp(c['start'])} --> {stamp(c['end'])}\n{c['text']}\n\n" for c in timeline['cues'])
 (SITE/'videos/tutorial.en.vtt').write_text(vtt.rstrip()+'\n')
 (ROOT/'timeline.json').write_text(json.dumps({k:v for k,v in timeline.items() if k!='cues'}|{'cues':[{k:v for k,v in c.items() if k!='image'} for c in timeline['cues']]},indent=2))
 sources={}
 for name in ['ui-src/upgrade.jsx','ui-src/upgrade-model.js','ui-src/workshop-ui.jsx','ui-src/workshop-logic.js','ui-src/workshop-reference-evidence.json','ui-src/workshop-visuals.json','ui-src/workshop-page.jsx','ui-src/workshop-viewer.js','ui-src/audio-ui.jsx','homecare-upgrade-build.mjs','ui-src/navigation-model.js','ui-src/navigation-runtime.js','ui-src/navigation.css','navigation-build.mjs']:
  sources[name]=hashlib.sha256((ROOT.parent/name).read_bytes()).hexdigest()
 chapters=[]
 for i,s in enumerate(guide['scenes']):
  cues=[c for c in timeline['cues'] if c['scene']==i];chapters.append({'id':s['id'],'title':s['title'],'url':s['url'],'start':cues[0]['start'],'end':cues[-1]['holdEnd']})
 voice_source={'engine':'macOS built-in speech','voice':timeline['voice'],'locale':'en_US','wordsPerMinute':160,'playbackSpeed':1.0,'approval':'User approved the built-in English voice fallback.'} if timeline['voice']!='none' else None
 manifest={'duration':timeline['duration'],'size':len(video),'base64':len(encoded),'sha256':hashlib.sha256(video).hexdigest(),'updated':guide['updated'],'release':guide['release'],'interfaceCommit':guide['interfaceCommit'],'interfaceSources':sources,'format':guide['format'],'voice':timeline['voice'],'voiceSource':voice_source,'navigationReview':old.get('navigationReview'),'captions':'Burned-in English captions; WebVTT also available as a download.','parts':parts,'chapters':chapters}
 (ROOT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 version=guide['release'];duration=f"{int(timeline['duration'])//60}:{int(timeline['duration'])%60:02d}"
 narration='No spoken narration.' if timeline['voice']=='none' else 'Spoken English narration.'
 nav=''.join(f'<span>{html.escape(t)}</span>' for t in guide['navigation'])
 chapter_html=''.join(f'<li><button type="button" data-time="{c["start"]:.3f}"><time>{int(c["start"])//60}:{int(c["start"])%60:02d}</time><span>{html.escape(c["title"])}</span></button><a href="{html.escape(c["url"],quote=True)}">Open section ↗</a></li>' for c in chapters)
 instructions=''.join(f'<details><summary>{i+1:02d}. {html.escape(s["title"])}</summary><p>{html.escape(s["speech"])}</p><p>{html.escape(s.get("notes",""))}</p><a href="{html.escape(s["url"],quote=True)}">Open this section ↗</a></details>' for i,s in enumerate(guide['scenes']))
 page=f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Homecare | Current website video guide</title><meta name="description" content="Guide to Homecare global listings, China filters, national-brand photo comparisons, White Label Workshop, specs, BOM and pricing."><link rel="stylesheet" href="/home-care/tutorial.css?v={version}"></head>
<body><main><header><a class="brand" href="/home-care/">Homecare</a><a href="/home-care/">Back to website ↗</a></header><p class="eyebrow">VIDEO GUIDE · UPDATED 4 NOVEMBER 2026</p><h1>Get to know your Homecare workspace.</h1><p class="intro">Browse global products, compare national brands and develop a white-label proposal.</p><p class="format">{duration} · Illustrated feature guide with real product photos and A0/A1 Blender renders. English captions are shown in the video. {narration} This guide uses the current menu labels; it is not a screen recording.</p><p class="hc-navigation-note">{html.escape(guide.get("navigationNote",""))} <a href="/home-care/help.html">Read the quick guide →</a></p><video id="guide-video" controls playsinline preload="metadata" poster="/home-care/videos/tutorial-poster.jpg?v={version}" aria-label="Homecare current website guide"><source src="/home-care/videos/Homecare_Workspace_Guide.mp4?v={version}" type="video/mp4">Your browser cannot play this video. Use Download video below.</video><p id="chapter-status" role="status" aria-live="polite"></p><div class="actions"><a class="primary" href="/home-care/downloads/Homecare_Workspace_Guide.mp4?v={version}" download="Homecare_Workspace_Guide.mp4">Download video ↓</a><a href="/home-care/videos/tutorial.en.vtt?v={version}" download>Download English captions ↓</a><a href="#written-guide">Read the written guide ↓</a></div><div class="guide-layout"><section aria-labelledby="chapters-title"><h2 id="chapters-title">Jump to a chapter.</h2><ol class="chapters">{chapter_html}</ol></section><aside><h2>Tools covered in this guide.</h2><div class="navigation">{nav}</div><p>Start with products and evidence. Opportunities is the final item.</p><p>All product prices, source dates and development estimates retain their own qualifications. This guide does not refresh retailer offers.</p><p>On iPhone, use full-screen playback for larger text. To save the MP4, tap Download video and then Share → Save to Files if the browser opens a player.</p></aside></div><section id="written-guide"><p class="eyebrow">STEP-BY-STEP REFERENCE</p><h2>Use the website at your own pace.</h2>{instructions}</section><footer><a href="/home-care/workshop/laundry-sorter.html#wl-real-products">Open White Label Workshop ↗</a><p>Product-photo credits: Joseph Joseph, Brabantia and the recorded retailer sources linked in the website. The laundry sorter has an A1 visualization; the other concepts retain A0 schematic studies. Engineering targets remain unvalidated. <a href="/home-care/tutorial-sources.json">Guide sources and release details</a>.</p></footer></main><script src="/home-care/tutorial.js?v={version}" defer></script></body></html>'''
 (SITE/'tutorial.html').write_text(page)
 receipt={'updated':guide['updated'],'release':version,'interfaceCommit':guide['interfaceCommit'],'format':guide['format'],'voice':timeline['voice'],'voiceSource':voice_source,'navigationReview':old.get('navigationReview'),'reviewLimitations':{'liveBrowserCapture':'Unavailable: admin security-policy check did not permit browser access. No alternative browser capture used.','audioListening':timeline.get('listeningReview','not_performed')},'chapters':chapters,'photos':json.loads((ROOT/'reference-images/sources.json').read_text()),'benchmarkPhotos':{k:v for k,v in json.loads((ROOT.parent/'ui-src/workshop-reference-evidence.json').read_text())['references'].items() if k in ['jj-tota','brabantia-bo']}}
 (SITE/'tutorial-sources.json').write_text(json.dumps(receipt,indent=2)+'\n')
 from PIL import Image
 Image.open(a.work/'scene-06.png').convert('RGB').save(SITE/'videos/tutorial-poster.jpg',quality=86,optimize=True)
 print(json.dumps({'duration':timeline['duration'],'size':len(video),'parts':len(parts),'sha256':manifest['sha256']}))
if __name__=='__main__':main()
