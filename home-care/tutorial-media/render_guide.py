"""Render the dated Homecare feature guide from real product assets and timed cues.

No web/browser capture or generated interface imagery is used. Install Pillow,
numpy and imageio-ffmpeg, then run this file with --help for reproducible options.
"""
import argparse, bisect, hashlib, json, math, os, re, shutil, subprocess, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parent
SITE=ROOT.parent/'site'
GUIDE=json.loads((ROOT/'guide-scenes.json').read_text())
W,H=GUIDE['style']['width'],GUIDE['style']['height']
INK='#153f34';MUTED='#55695c';ACCENT='#a65e3f';BG='#f7f5ef';SAGE='#e5ebdd'
FONTDIR=Path('/System/Library/Fonts/Supplemental')
FONTS={}
def font(size,bold=False,serif=False):
 key=(size,bold,serif)
 if key not in FONTS:
  name=('Georgia' if serif else 'Arial')+(' Bold' if bold else '')+'.ttf'
  FONTS[key]=ImageFont.truetype(str(FONTDIR/name),size)
 return FONTS[key]

def wrap(text,f,width):
 words=text.split();lines=[];line=''
 for word in words:
  candidate=(line+' '+word).strip()
  if f.getlength(candidate)>width and line:lines.append(line);line=word
  else:line=candidate
 if line:lines.append(line)
 return lines

def text(d,xy,value,size=36,color=INK,bold=False,serif=False,width=1700,spacing=10):
 f=font(size,bold,serif);x,y=xy
 for line in wrap(value,f,width):d.text((x,y),line,font=f,fill=color);y+=size+spacing
 return y

def photo(im,rel,box):
 p=Path(rel);p=p if p.is_absolute() else SITE/p
 img=Image.open(p).convert('RGBA');img.thumbnail((box[2]-box[0],box[3]-box[1]))
 x=box[0]+(box[2]-box[0]-img.width)//2;y=box[1]+(box[3]-box[1]-img.height)//2
 im.paste(img,(x,y),img)

def label(d,x,y,value,active=False,width=730):
 d.rounded_rectangle((x,y,x+width,y+68),radius=8,fill=INK if active else SAGE)
 text(d,(x+22,y+16),value,29,'white' if active else INK,bold=active,width=width-40)

def base(scene,index):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 text(d,(90,55),'HOMECARE / VIDEO GUIDE',23,ACCENT,bold=True)
 text(d,(90,112),scene['title'],76,serif=True,width=1720)
 d.line((90,232,1830,232),fill='#cbd5c4',width=2)
 text(d,(90,1035),'Illustrated feature guide · 4 November 2026',19,MUTED)
 text(d,(1710,1035),f'{index+1:02d} / 12',19,MUTED)
 return im,d

def draw_scene(index,phase=9,caption=''):
 s=GUIDE['scenes'][index];im,d=base(s,index);kind=s['kind']
 if kind=='intro':
  for i,t in enumerate(['Browse the market','Compare real products','Develop a proposal']):
   text(d,(100,332+i*138),f'0{i+1}',28,ACCENT,bold=True)
   text(d,(175,318+i*138),t,46,bold=True,width=770)
  photo(im,s['asset'],(1000,270,1790,850));text(d,(1050,837),'A0 concept render · engineering targets',22,MUTED)
 elif kind=='navigation':
  for i,t in enumerate(GUIDE['navigation']):
   x=100 if i<4 else 1040;y=280+(i if i<4 else i-4)*132
   label(d,x,y,t,active=i==6,width=780)
  text(d,(1040,730),'Opportunities is the final item.',30,ACCENT,bold=True,width=780)
 elif kind=='global':
  text(d,(100,278),'Global retailers & items',42,bold=True)
  for i,t in enumerate(['Country / market','Retailer','Find an item']):label(d,100+i*580,355,t,active=i==0,width=535)
  for i,name in enumerate(['china-taobao.webp','china-tmall.webp','china-jd.jpg']):
   photo(im,ROOT/'reference-images'/name,(130+i*555,468,630+i*555,788))
  for i,t in enumerate(['Taobao · David','Tmall · David','JD.com · Joybos']):text(d,(180+i*555,805),t,25,MUTED)
 elif kind=='shortlist':
  labels=['Select to compare','Compare selected','Export selected CSV']
  for i,t in enumerate(labels):
   x=120+i*585;d.ellipse((x,320,x+76,396),fill=INK);text(d,(x+23,337),str(i+1),33,'white',bold=True)
   text(d,(x,445),t,42,bold=True,width=510)
   if i<2:d.line((x+130,357,x+520,357),fill='#b0bfa6',width=5)
  text(d,(120,650),'CSV opens in Excel.',48,serif=True)
  text(d,(120,740),'Photos are links in the spreadsheet.',33,MUTED)
 elif kind=='analysis':
  text(d,(100,290),'Match the comparison context.',44,bold=True)
  for i,t in enumerate(['Same retailer','Same metric','Same reporting period','Same snapshot date']):
   x=110+(i%2)*870;y=405+(i//2)*150;label(d,x,y,t,width=790)
  text(d,(110,765),'Missing sales = unknown.   Coverage ≠ market share.',36,ACCENT,bold=True,width=1680)
 elif kind=='categories':
  text(d,(100,282),'Home-care subcategory → Product concept',38,bold=True)
  for i,(asset,t) in enumerate([('drying-rack.jpg','Laundry care'),('pantry-canisters.jpg','Storage & organization'),('recycling-station.jpg','Waste & recycling')]):
   photo(im,'workshop-assets/'+asset,(100+i*590,390,650+i*590,760));text(d,(120+i*590,790),t,30,bold=True,width=535)
  text(d,(110,857),'Real products → Why & what changes → Design & costs',29,ACCENT,bold=True)
 elif kind=='benchmarks':
  for i,(asset,t,note) in enumerate([('workshop-reference-photos/jj-tota.webp','Joseph Joseph','Tota Twin 90 L · Black · variant matched'),('workshop-reference-photos/brabantia-bo.webp','Brabantia','Bo Laundry Bin Hi · White · range reference')]):
   photo(im,asset,(100+i*880,280,915+i*880,690));text(d,(110+i*880,714),t,35,bold=True,width=815);text(d,(110+i*880,770),note,23,MUTED,width=810)
  text(d,(110,846),'View full-size photo  /  Manufacturer data  /  Photo source',28,ACCENT,bold=True,width=1690)
 elif kind=='changes':
  text(d,(100,280),'Why & what changes → Brand reference & proof needed',30,bold=True,width=1700)
  labels=['WHAT BRANDS ALREADY OFFER','OUR PROPOSED CHANGE','HOW TO PROVE IT']
  vals=['Tota and Bo already offer two compartments.','Two removable 30 L bags, with text and shape labels.','Timed sorting task and error count against purchased benchmarks.']
  for i,(title,value) in enumerate(zip(labels,vals)):
   x=100+i*585;text(d,(x,375),title,23,ACCENT,bold=True,width=535);text(d,(x,450),value,40,bold=i==1,width=515)
  text(d,(100,790),'A design hypothesis is not a verified Target assortment gap.',31,MUTED,width=1690)
 elif kind=='specs':
  photo(im,'workshop-assets/laundry-sorter-front.jpg',(75,277,915,850))
  text(d,(1000,300),'520 × 350 × 650 mm',55,bold=True,width=810)
  text(d,(1000,381),'Proposed W × D × H',27,MUTED)
  for i,(name,c) in enumerate([('Sage','#93a183'),('Chalk','#e5e2d6'),('Clay','#b87963'),('Ink','#303b37')]):
   x=1000+i*195;d.rounded_rectangle((x,492,x+155,568),radius=7,fill=c);text(d,(x,588),name,28)
  text(d,(1000,710),'Perspective / Front / Exploded',31,bold=True,width=815)
  text(d,(1000,785),'Switch mm / inches in Specs & dimensions.',28,MUTED,width=810)
 elif kind=='pricing':
  p=next(p for p in json.loads((ROOT.parent/'ui-src/workshop-data.json').read_text())['concepts'] if p['id']=='laundry-sorter')
  text(d,(110,292),'BOM & pricing',46,bold=True)
  for i,part in enumerate(p['parts'][:4]):
   y=395+i*92;text(d,(115,y),part['name'],34,width=870);text(d,(1130,y),f"Qty {part['qty']}   /   ${part['unitLow']:.2f}–${part['unitHigh']:.2f} each",32,width=630);d.line((110,y+70,1770,y+70),fill='#d7ded1',width=2)
  text(d,(110,827),'Enter duty to calculate landed cost.  Supplier quotes still needed.',29,ACCENT,bold=True,width=1680)
 elif kind=='downloads':
  text(d,(115,300),'Blender development pack',46,bold=True)
  text(d,(115,390),'.blend   /   GLB   /   renders   /   dimensions   /   specifications   /   BOM',34,MUTED,width=1670)
  d.line((115,491,1790,491),fill='#cbd5c4',width=2)
  text(d,(115,550),'Save brief with comparison photos',46,bold=True,width=1650)
  text(d,(115,640),'Selected finish + pricing edits + benchmark photos → HTML brief',33,MUTED,width=1660)
  text(d,(115,800),'Review Validation before development moves forward.',32,ACCENT,bold=True,width=1660)
 elif kind=='finish':
  for i,t in enumerate(['Browse products','Review the evidence','Investigate opportunities']):
   text(d,(110,310+i*140),f'0{i+1}',28,ACCENT,bold=True);text(d,(190,298+i*140),t,48,bold=True,width=1590)
  text(d,(110,790),'Music and button sounds can be controlled separately.',31,MUTED,width=1670)
 if caption:
  f=font(38,True);lines=wrap(caption,f,1690);assert len(lines)<=3,(index,caption)
  height=len(lines)*47+24;y=1011-height
  d.rounded_rectangle((85,y,1835,1017),radius=8,fill=INK)
  for j,line in enumerate(lines):d.text(((W-f.getlength(line))/2,y+10+j*47),line,font=f,fill='white')
 return im

def ffmpeg_path():
 if shutil.which('ffmpeg'):return shutil.which('ffmpeg')
 import imageio_ffmpeg
 return imageio_ffmpeg.get_ffmpeg_exe()

def make_visuals(work):
 work.mkdir(parents=True,exist_ok=True)
 for i,s in enumerate(GUIDE['scenes']):draw_scene(i).save(work/f"scene-{i:02d}.png")

def main():
 global FONTDIR
 parser=argparse.ArgumentParser();parser.add_argument('--work',type=Path,required=True);parser.add_argument('--fonts-dir',type=Path);parser.add_argument('--visuals-only',action='store_true');parser.add_argument('--voice',choices=['Samantha','none']);args=parser.parse_args()
 if args.fonts_dir:FONTDIR=args.fonts_dir
 make_visuals(args.work)
 if args.visuals_only:return
 if not args.voice:raise SystemExit('Choose --voice Samantha only after the requested voice fallback is approved, or --voice none for an approved captions-only version.')
 ff=ffmpeg_path();cues=[];clock=0.;audio=[];work=args.work
 for si,scene in enumerate(GUIDE['scenes']):
  for li,sentence in enumerate(re.split(r'(?<=[.!?])\s+',scene['speech'])):
   ident=f'{si:02d}-{li:02d}';duration=max(2.4,len(sentence)/17.5)
   if args.voice!='none':
    aiff=work/f'{ident}.aiff';wav=work/f'{ident}.wav'
    subprocess.run(['/usr/bin/say','-v',args.voice,'-r','160','-o',str(aiff),sentence],check=True)
    subprocess.run([ff,'-v','error','-y','-i',str(aiff),'-ar','48000','-ac','1','-c:a','pcm_s16le',str(wav)],check=True)
    with wave.open(str(wav)) as r:samples=r.readframes(r.getnframes());duration=r.getnframes()/r.getframerate()
    audio.append(samples)
   # A short, explicit sentence boundary preserves natural delivery at 1.0x.
   tail=.18 if li+1<len(re.split(r'(?<=[.!?])\s+',scene['speech'])) else .4
   if args.voice!='none':audio.append(b'\x00\x00'*round(48000*tail))
   frame=work/f'cue-{ident}.png';draw_scene(si,li,sentence).save(frame)
   cues.append({'scene':si,'text':sentence,'start':clock,'end':clock+duration,'holdEnd':clock+duration+tail,'image':frame.name});clock+=duration+tail
 timeline={'duration':clock,'voice':args.voice,'speed':1.0,'sampleRate':48000,'listeningReview':'not_performed','cues':cues,'sourceRelease':GUIDE['release']}
 (work/'timeline.json').write_text(json.dumps(timeline,indent=2))
 if audio:
  with wave.open(str(work/'narration.wav'),'wb') as r:r.setnchannels(1);r.setsampwidth(2);r.setframerate(48000);r.writeframes(b''.join(audio))
 concat=''.join(f"file '{c['image']}'\noption framerate 24\nduration {(round(c['holdEnd']*24)-round(c['start']*24))/24:.9f}\n" for c in cues)+f"file '{cues[-1]['image']}'\noption framerate 24\n"
 (work/'frames.txt').write_text(concat)
 cmd=[ff,'-v','error','-y','-f','rawvideo','-pixel_format','rgb24','-video_size',f'{W}x{H}','-framerate','24','-i','pipe:0']
 if audio:cmd+=['-i',str(work/'narration.wav')]
 cmd+=['-map','0:v:0']
 if audio:cmd+=['-map','1:a:0','-af','loudnorm=I=-16:TP=-1.5:LRA=11','-ar','48000','-ac','2','-c:a','aac','-b:a','96k']
 # Stream the exact authored frame count. This avoids still-image demuxer
 # duration guesses; narration and captions retain their own natural clock.
 cmd+=['-r','24','-vf','scale=out_color_matrix=bt709:out_range=tv,format=yuv420p','-c:v','libx264','-preset','medium','-crf','25','-pix_fmt','yuv420p','-g','240','-movflags','+faststart','-color_range','tv','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-x264-params','colorprim=bt709:transfer=bt709:colormatrix=bt709',str(work/'Homecare_Workspace_Guide.mp4')]
 with (work/'encode.log').open('wb') as log:
  process=subprocess.Popen(cmd,stdin=subprocess.PIPE,stderr=log)
  try:
   for cue in cues:
    frame=Image.open(work/cue['image']).convert('RGB').tobytes()
    for _ in range(round(cue['holdEnd']*24)-round(cue['start']*24)):process.stdin.write(frame)
   process.stdin.close()
  except BrokenPipeError:
   process.wait();raise RuntimeError((work/'encode.log').read_text())
  if process.wait()!=0:raise RuntimeError((work/'encode.log').read_text())
 print(json.dumps({'duration':clock,'cues':len(cues),'video':str(work/'Homecare_Workspace_Guide.mp4')}))

if __name__=='__main__':main()
