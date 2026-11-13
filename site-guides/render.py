"""Build three narrated, 1080p guides from actual browser captures. No fabricated UI."""
import json,subprocess,textwrap,shutil,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
W=Path(sys.argv[1]);shots=Path(sys.argv[2]);scripts=json.loads((ROOT/'site-guides/scripts.json').read_text())
fontroot=Path('/usr/share/fonts/truetype/dejavu')
def font(n,b=False):return ImageFont.truetype(str(fontroot/('DejaVuSans-Bold.ttf' if b else 'DejaVuSans.ttf')),n)
def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(p)],text=True).strip())
def wrapped(d,s,x,y,f,width,color):
 line=''
 for word in s.split():
  c=(line+' '+word).strip()
  if d.textlength(c,font=f)>width and line:d.text((x,y),line,font=f,fill=color);y+=f.size*1.4;line=word
  else:line=c
 d.text((x,y),line,font=f,fill=color);return y+f.size*1.4
specs={
 'homecare':{'title':'Homecare','url':'royhei-cpu.github.io/home-care/','color':'#174c3d','bg':'#f6f5ef','dest':'home-care/site/videos','name':'homecare-guide.mp4','poster':'homecare-guide-poster.jpg','vtt':'homecare-guide.en.vtt','transcript':'homecare-guide-transcript.txt','shots':['homecare-home','homecare-search','homecare-compare','homecare-recommendations','homecare-news'],'steps':['Your merchant directory','Search the catalog','Compare your shortlist','White-label recommendations','News & global research'],'tips':[['Products, evidence and recommendations','One dedicated Homecare website'],['Choose a retailer first','Search a product or brand','Use category and brand filters'],['Select products → Compare selected','Check packs and source dates','Export CSV with photo links'],['Choose a product platform','Review real product references','Read proposed improvements and checks'],['News & updates for dated evidence','Global retailers for other countries','Catalog addition ≠ launch date']]},
 'luggage':{'title':'Luggage Atlas','url':'royhei-cpu.github.io/luggage-atlas/','color':'#24392c','bg':'#f5f1e7','dest':'luggage-atlas/tutorial','name':'luggage-guide.mp4','poster':'poster.jpg','vtt':'captions.vtt','transcript':'transcript.txt','shots':['luggage-home','luggage-search','luggage-compare','luggage-compare','luggage-news'],'steps':['The worldwide luggage edit','Find an exact offer','Compare up to four','Keep your comparison','Follow the daily edit'],'tips':[['Worldwide product research','Original travel artwork and photos'],['Search a brand or model','Check size, color and market','Read the photograph scope'],['Compare this offer → Compare','Keep original currencies visible','Check dimensions and source evidence'],['Export selected CSV','Includes source and photo links','Illustrated comparison also available'],['Read News & updates','Open the original source','Explore exterior and interior photos']]},
 'toy':{'title':'China Toy Atlas','url':'royhei-cpu.github.io/china-toys/','color':'#204b3e','bg':'#fff8f2','dest':'china-toys/tutorial','name':'China_Toy_Atlas_Tutorial.mp4','poster':'poster.jpg','vtt':'captions.vtt','transcript':'transcript.txt','shots':['toy-home','toy-search','toy-compare','toy-details','toy-news'],'steps':['Discover your next collectible','Search characters & shops','Build a comparison','Inspect and export','Stay curious. Stay current.'],'tips':[['Blind boxes, squishies and characters','Original collections and imagery'],['Search a character, brand or series','Filter by shop and product type','Reset all filters to start again'],['Select for comparison','Compare → Open side-by-side','Choose two to six products or offers'],['Keep pack, market and dates in view','Download comparison CSV or photo sheet','Random designs may differ from photos'],['Research & news → Daily updates','Explore Stories & news','Save products to your own collection']]}}
def ts(t):
 ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02}.{ms%1000:03}'
for site,cfg in specs.items():
 dest=ROOT/cfg['dest'];dest.mkdir(exist_ok=True,parents=True);clock=0;chapters=[];vtt=['WEBVTT',''];clips=[]
 for i,para in enumerate(scripts[site]):
  audio=W/f'{site}-{i}.mp3';dur=duration(audio)+.35
  canvas=Image.new('RGB',(1920,1080),cfg['bg']);d=ImageDraw.Draw(canvas)
  d.rectangle((0,0,1920,9),fill=cfg['color']);d.text((48,31),cfg['title'],font=font(33,True),fill=cfg['color']);d.text((1180,39),cfg['url'],font=font(22),fill=cfg['color']);d.line((48,93,1872,93),fill='#d8dacf',width=2)
  d.text((48,145),f'0{i+1} / QUICK GUIDE',font=font(23,True),fill='#a65039' if site=='toy' else '#846e41')
  y=wrapped(d,cfg['steps'][i],48,205,font(42,True),460,cfg['color'])+46
  for tip in cfg['tips'][i]:
   d.ellipse((48,y+8,59,y+19),fill=cfg['color']);y=wrapped(d,tip,80,y,font(28),420,cfg['color'])+30
  d.text((48,940),'Search · Compare · Updates',font=font(21),fill='#63756b');d.text((48,978),'Guide refreshed 13 November 2026',font=font(18),fill='#63756b')
  screenshot=Image.open(shots/(cfg['shots'][i]+'.jpg')).convert('RGB');screenshot.thumbnail((1316,905),Image.Resampling.LANCZOS);x=562+(1316-screenshot.width)//2;y=122+(905-screenshot.height)//2
  d.rounded_rectangle((x-8,y-8,x+screenshot.width+8,y+screenshot.height+8),radius=16,fill='white',outline='#d2d8ce',width=2);canvas.paste(screenshot,(x,y))
  frame=W/f'{site}-{i}.png';canvas.save(frame)
  if i==0:canvas.save(dest/cfg['poster'],quality=90)
  clip=W/f'{site}-{i}.mp4';clips.append(clip)
  vf=f"fade=t=in:st=0:d=0.22,drawbox=x=0:y=1064:w=1920:h=16:color=0xdadfd5:t=fill,drawbox=x=0:y=1064:w=iw*(t/{dur}):h=16:color=0x315a47:t=fill,format=yuv420p"
  # The progress accent and gentle scene transition keep screen text stable and readable.
  subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-loop','1','-i',str(frame),'-i',str(audio),'-t',str(dur),'-vf',vf,'-af','apad=pad_dur=0.35','-r','24','-c:v','libx264','-preset','veryfast','-crf','26','-tune','stillimage','-threads','2','-c:a','aac','-b:a','112k','-movflags','+faststart',str(clip)],check=True)
  chapters.append({'start':round(clock,3),'label':cfg['steps'][i]})
  for event in json.loads((W/f'{site}-{i}.json').read_text()):
   if event['type']!='SentenceBoundary':continue
   start=clock+event['offset']/1e7;end=min(clock+dur,start+event['duration']/1e7)
   vtt.extend([f'{ts(start)} --> {ts(end)}','\n'.join(textwrap.wrap(event['text'],86)),''])
  clock+=duration(clip);print(site,i,round(clock,1),flush=True)
 concat=W/f'{site}-concat.txt';concat.write_text(''.join("file '"+str(c)+"'\n" for c in clips))
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(concat),'-c','copy','-movflags','+faststart',str(dest/cfg['name'])],check=True)
 (dest/cfg['vtt']).write_text('\n'.join(vtt));(dest/cfg['transcript']).write_text(cfg['title']+' — tutorial\n\n'+'\n\n'.join(scripts[site])+'\n');(dest/'chapters.json').write_text(json.dumps({'chapters':chapters},indent=2)+'\n')
 (dest/'guide-verification.json').write_text(json.dumps({'updated':'2026-11-13','website':cfg['url'],'duration':round(clock,3),'resolution':[1920,1080],'voice':'en-US-GuyNeural','visuals':'Actual browser captures of the restored website','chapters':chapters},indent=2)+'\n')
 print('DONE',site,clock,(dest/cfg['name']).stat().st_size,flush=True)
